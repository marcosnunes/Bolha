import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
} from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { auth, rtdb, functions } from '../firebase/config.js';
import {
  ref,
  onValue,
  set,
  remove,
  serverTimestamp,
  onDisconnect,
  get,
  update,
  query,
  orderByChild,
  equalTo,
} from 'firebase/database';

const AuthContext = createContext();
const GOOGLE_AUTH_INTENT_KEY = 'googleAuthIntent';
const GOOGLE_PENDING_PROFILE_KEY = 'googlePendingProfile';

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hiddenUsers, setHiddenUsers] = useState([]);
  const [authFlowError, setAuthFlowError] = useState('');
  const [pendingGoogleProfile, setPendingGoogleProfile] = useState(() => {
    try {
      const pendingRaw = sessionStorage.getItem(GOOGLE_PENDING_PROFILE_KEY);
      if (!pendingRaw) return null;

      const parsed = JSON.parse(pendingRaw);
      return parsed && parsed.mode === 'signup' ? parsed : null;
    } catch {
      sessionStorage.removeItem(GOOGLE_PENDING_PROFILE_KEY);
      return null;
    }
  });

  function signup(email, password) {
    return createUserWithEmailAndPassword(auth, email, password);
  }

  function getAuthErrorMessage(code) {
    const messages = {
      'auth/account-exists-with-different-credential': 'Este e-mail já está vinculado a outro método. Entre com e-mail e senha.',
      'auth/popup-blocked': 'Pop-up bloqueado pelo navegador. Vamos tentar por redirecionamento.',
      'auth/cancelled-popup-request': 'Login com Google cancelado.',
      'auth/popup-closed-by-user': 'Você fechou o pop-up do Google antes de concluir.',
      'auth/network-request-failed': 'Falha de conexão. Verifique sua internet e tente novamente.',
      'auth/too-many-requests': 'Muitas tentativas em pouco tempo. Tente novamente mais tarde.',
      'auth/invalid-email': 'E-mail inválido.',
      'auth/user-not-found': 'Conta não encontrada.',
      'auth/wrong-password': 'Senha incorreta.',
      'app/invite-invalid': 'Este convite está inválido ou já foi utilizado.',
      'app/invite-requires-new-account': 'Este convite é apenas para novas contas.',
      'app/nickname-required': 'Este apelido já existe. Escolha outro para continuar.',
      'app/nickname-in-use': 'Este apelido já está em uso. Escolha outro.',
      'app/pending-profile-not-found': 'Não encontramos um cadastro pendente para concluir.',
    };

    return messages[code] || 'Não foi possível completar a autenticação agora. Tente novamente.';
  }

  const normalizeNickname = useCallback((value) => {
    const base = (value || '').trim().replace(/\s+/g, ' ');
    if (!base) return 'Usuario';
    return base.slice(0, 32);
  }, []);

  const toGoogleStyleNickname = useCallback((value) => {
    const source = (value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

    const slug = source
      .replace(/[^a-z0-9]+/g, '.')
      .replace(/\.+/g, '.')
      .replace(/^\.|\.$/g, '');

    return (slug || 'usuario').slice(0, 32);
  }, []);

  const isNicknameAvailable = useCallback(async (nickname, ignoreUid = null) => {
    const nicknameToCheck = normalizeNickname(nickname);
    const profilesRef = ref(rtdb, 'profiles');
    const q = query(profilesRef, orderByChild('nickname'), equalTo(nicknameToCheck));
    const snapshot = await get(q);

    if (!snapshot.exists()) return true;

    let isAvailable = true;
    snapshot.forEach((child) => {
      if (!ignoreUid || child.key !== ignoreUid) {
        isAvailable = false;
      }
    });

    return isAvailable;
  }, [normalizeNickname]);

  const resolveAvailableNickname = useCallback(async (
    baseNickname,
    {
      ignoreUid = null,
      fallbackSeed = null,
      googleStyle = false,
    } = {},
  ) => {
    const normalizedBase = googleStyle
      ? toGoogleStyleNickname(baseNickname || 'usuario')
      : normalizeNickname(baseNickname || 'Usuario');

    if (await isNicknameAvailable(normalizedBase, ignoreUid)) {
      return normalizedBase;
    }

    for (let i = 2; i <= 50; i += 1) {
      const candidate = googleStyle
        ? toGoogleStyleNickname(`${normalizedBase}${i}`)
        : normalizeNickname(`${normalizedBase}_${i}`);

      if (await isNicknameAvailable(candidate, ignoreUid)) {
        return candidate;
      }
    }

    const suffix = (fallbackSeed || '').toString().slice(0, 6);
    return googleStyle
      ? toGoogleStyleNickname(`usuario.${suffix || Date.now().toString().slice(-6)}`)
      : normalizeNickname(`Usuario_${suffix || Date.now().toString().slice(-6)}`);
  }, [isNicknameAvailable, normalizeNickname, toGoogleStyleNickname]);

  const uploadToCloudinary = useCallback(async (fileOrBlob, filename = 'profile.jpg') => {
    const formData = new FormData();
    formData.append('file', fileOrBlob instanceof File ? fileOrBlob : new File([fileOrBlob], filename, { type: fileOrBlob.type || 'image/jpeg' }));
    formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Falha no upload de imagem para Cloudinary.');
    }

    const data = await response.json();
    return data.secure_url;
  }, []);

  const mirrorGooglePhotoToCloudinary = useCallback(async (photoURL) => {
    if (!photoURL) return null;

    try {
      const response = await fetch(photoURL);
      if (!response.ok) {
        throw new Error('Falha ao baixar foto do Google.');
      }

      const blob = await response.blob();
      return await uploadToCloudinary(blob, 'google-profile.jpg');
    } catch (error) {
      console.warn('Falha ao espelhar foto do Google para Cloudinary. Mantendo URL original.', error);
      return photoURL;
    }
  }, [uploadToCloudinary]);

  const syncVerificationStatus = useCallback(async (userArg = auth.currentUser) => {
    if (!userArg) return;

    await userArg.reload();
    if (!userArg.emailVerified) return;

    const profileRef = ref(rtdb, `profiles/${userArg.uid}`);
    const profileSnap = await get(profileRef);
    const profile = profileSnap.val() || {};

    const patch = {};
    if (!profile.isVerified) {
      patch.isVerified = true;
    }
    if (!profile.verifiedAt) {
      patch.verifiedAt = serverTimestamp();
    }

    if (Object.keys(patch).length > 0) {
      await update(profileRef, patch);
    }
  }, []);

  const finalizeGoogleSignIn = useCallback(async (user, intent = { mode: 'login' }) => {
    if (!user) return;

    const profileRef = ref(rtdb, `profiles/${user.uid}`);
    const profileSnap = await get(profileRef);
    const profileExists = profileSnap.exists();

    if (intent.inviteToken) {
      const inviteRef = ref(rtdb, `invites/${intent.inviteToken}`);
      const inviteSnap = await get(inviteRef);
      if (!inviteSnap.exists() || inviteSnap.val()?.status !== 'pending') {
        const inviteError = new Error('Invite inválido.');
        inviteError.code = 'app/invite-invalid';
        throw inviteError;
      }

      if (profileExists) {
        const inviteExistingError = new Error('Invite exige conta nova.');
        inviteExistingError.code = 'app/invite-requires-new-account';
        throw inviteExistingError;
      }
    }

    if (!profileExists) {
      const preferredNickname = normalizeNickname(intent.nicknameOverride || user.displayName || user.email?.split('@')[0] || 'Usuario');
      const nicknameAvailable = await isNicknameAvailable(preferredNickname);

      let finalNickname = preferredNickname;
      if (!nicknameAvailable && !intent.nicknameOverride) {
        finalNickname = await resolveAvailableNickname(
          user.displayName || user.email?.split('@')[0] || preferredNickname,
          {
            ignoreUid: user.uid,
            fallbackSeed: user.uid,
            googleStyle: true,
          },
        );
      }

      if (!nicknameAvailable && intent.nicknameOverride) {
        const nicknameError = new Error('Apelido em uso.');
        nicknameError.code = intent.nicknameOverride ? 'app/nickname-in-use' : 'app/nickname-required';
        nicknameError.suggestedNickname = preferredNickname;
        throw nicknameError;
      }

      const mirroredPhotoURL = await mirrorGooglePhotoToCloudinary(user.photoURL || null);

      await set(profileRef, {
        nickname: finalNickname,
        photoURL: mirroredPhotoURL,
        isVerified: true,
        verifiedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      });

      if (intent.inviteToken) {
        await update(ref(rtdb, `invites/${intent.inviteToken}`), {
          status: 'completed',
          usedBy: user.uid,
          usedAt: serverTimestamp(),
        });
      }
    } else {
      const patch = {};
      const profileValue = profileSnap.val() || {};
      const fallbackNickname = normalizeNickname(intent.nicknameOverride || user.displayName || user.email?.split('@')[0] || 'Usuario');
      const looksGeneratedNickname = typeof profileValue.nickname === 'string' && /^Usuario_[A-Za-z0-9]+$/i.test(profileValue.nickname);
      const hasBetterDisplayName = !!user.displayName && normalizeNickname(user.displayName) !== normalizeNickname(profileValue.nickname || '');

      if (!profileValue.nickname) {
        patch.nickname = await resolveAvailableNickname(
          user.displayName || user.email?.split('@')[0] || fallbackNickname,
          {
            ignoreUid: user.uid,
            fallbackSeed: user.uid,
            googleStyle: true,
          },
        );
      } else if (!intent.nicknameOverride && looksGeneratedNickname && hasBetterDisplayName) {
        patch.nickname = await resolveAvailableNickname(user.displayName, {
          ignoreUid: user.uid,
          fallbackSeed: user.uid,
          googleStyle: true,
        });
      }

      if (!profileValue.photoURL && user.photoURL) {
        patch.photoURL = await mirrorGooglePhotoToCloudinary(user.photoURL);
      }

      if (!profileValue.isVerified && user.emailVerified) {
        patch.isVerified = true;
      }
      if (!profileValue.verifiedAt && user.emailVerified) {
        patch.verifiedAt = serverTimestamp();
      }

      if (Object.keys(patch).length > 0) {
        await update(profileRef, patch);
      }
    }

    if (user.emailVerified) {
      await syncVerificationStatus(user);
    }
  }, [isNicknameAvailable, mirrorGooglePhotoToCloudinary, normalizeNickname, resolveAvailableNickname, syncVerificationStatus]);

  const startGoogleAuth = useCallback(async (intent) => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      const result = await signInWithPopup(auth, provider);
      await finalizeGoogleSignIn(result.user, intent);
      return { redirected: false, user: result.user };
    } catch (error) {
      const shouldFallbackToRedirect = error.code === 'auth/popup-blocked' || error.code === 'auth/operation-not-supported-in-this-environment';

      if (shouldFallbackToRedirect) {
        sessionStorage.setItem(GOOGLE_AUTH_INTENT_KEY, JSON.stringify(intent));
        await signInWithRedirect(auth, provider);
        return { redirected: true, user: null };
      }

      throw error;
    }
  }, [finalizeGoogleSignIn]);

  async function loginWithGoogle() {
    setAuthFlowError('');

    try {
      return await startGoogleAuth({ mode: 'login' });
    } catch (error) {
      setAuthFlowError(getAuthErrorMessage(error.code));
      throw error;
    }
  }

  async function signupWithGoogle({ inviteToken = null, nicknameOverride = null } = {}) {
    setAuthFlowError('');

    try {
      return await startGoogleAuth({ mode: 'signup', inviteToken, nicknameOverride });
    } catch (error) {
      setAuthFlowError(getAuthErrorMessage(error.code));
      throw error;
    }
  }

  async function signupWithProfile({ email, password, nickname, profilePictureFile = null, inviteToken = null }) {
    const normalizedNickname = normalizeNickname(nickname);
    const nicknameAvailable = await isNicknameAvailable(normalizedNickname);

    if (!nicknameAvailable) {
      const err = new Error('Apelido já existe.');
      err.code = 'app/nickname-in-use';
      throw err;
    }

    let photoURL = null;
    if (profilePictureFile) {
      photoURL = await uploadToCloudinary(profilePictureFile, profilePictureFile.name || 'profile.jpg');
    }

    const userCredential = await signup(email, password);
    const user = userCredential.user;

    await set(ref(rtdb, `profiles/${user.uid}`), {
      nickname: normalizedNickname,
      photoURL,
      isVerified: false,
      createdAt: serverTimestamp(),
    });

    await sendEmailVerification(user);

    if (inviteToken) {
      const inviteRef = ref(rtdb, `invites/${inviteToken}`);
      const inviteSnap = await get(inviteRef);
      if (inviteSnap.exists() && inviteSnap.val()?.status === 'pending') {
        await update(inviteRef, {
          status: 'completed',
          usedBy: user.uid,
          usedAt: serverTimestamp(),
        });
      }
    }

    return userCredential;
  }

  function clearAuthFlowError() {
    setAuthFlowError('');
  }

  function clearPendingGoogleProfile() {
    setPendingGoogleProfile(null);
    sessionStorage.removeItem(GOOGLE_PENDING_PROFILE_KEY);
  }

  async function completePendingGoogleSignup({ nickname }) {
    const user = auth.currentUser;
    if (!user) {
      const err = new Error('Usuário não autenticado.');
      err.code = 'auth/user-not-found';
      throw err;
    }

    if (!pendingGoogleProfile) {
      const err = new Error('Não há cadastro pendente.');
      err.code = 'app/pending-profile-not-found';
      throw err;
    }

    await finalizeGoogleSignIn(user, {
      mode: 'signup',
      inviteToken: pendingGoogleProfile.inviteToken || null,
      nicknameOverride: nickname,
    });

    clearPendingGoogleProfile();
    clearAuthFlowError();

    return user;
  }

  async function login(email, password) {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    // Garante que emailVerified esteja atualizado logo apos login.
    await userCredential.user.reload();

    if (userCredential.user.emailVerified) {
      await syncVerificationStatus(userCredential.user);
    }

    return userCredential;
  }

  async function logout() {
    if (auth.currentUser) {
      const onlineRef = ref(rtdb, `users/${auth.currentUser.uid}/online`);
      const lastSeenRef = ref(rtdb, `users/${auth.currentUser.uid}/lastSeen`);

      // Forca o status offline imediatamente para os outros usuarios.
      await Promise.allSettled([
        set(lastSeenRef, serverTimestamp()),
        remove(onlineRef),
      ]);
    }

    await signOut(auth);
    window.location.assign('/auth?mode=login');
  }

  async function deleteAccount() {
    // A lógica de exclusão agora é delegada a uma Cloud Function.
    // Isso resolve o problema de permissão e a condição de corrida.
    const deleteUserAccount = httpsCallable(functions, 'deleteUserAccount');

    try {
      const result = await deleteUserAccount();
      // Se a função foi executada com sucesso, o servidor cuidou de tudo.
      console.log('Cloud Function result:', result);

      // Forçamos o recarregamento para limpar o estado do cliente.
      window.location.assign('/auth?mode=signup');

    } catch (error) {
      console.error("Erro ao chamar a Cloud Function para apagar a conta:", error);
      // Propaga o erro para ser tratado na UI (SettingsPage).
      throw error;
    }
  }

  function resetPassword(email) {
    return sendPasswordResetEmail(auth, email);
  }

  const hideUser = (userIdToHide) => {
    if (!currentUser) return;
    const hiddenUserRef = ref(rtdb, `users/${currentUser.uid}/hiddenUsers/${userIdToHide}`);
    return set(hiddenUserRef, true);
  };

  const showUser = (userIdToShow) => {
    if (!currentUser) return;
    const hiddenUserRef = ref(rtdb, `users/${currentUser.uid}/hiddenUsers/${userIdToShow}`);
    return remove(hiddenUserRef);
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, user => {
      setCurrentUser(user);
      if (!user) {
        setUserProfile(null);
        setHiddenUsers([]);
        setLoading(false);
      }
    });
    return unsubscribeAuth;
  }, []);

  useEffect(() => {
    if (currentUser) {
      const profileRef = ref(rtdb, `profiles/${currentUser.uid}`);
      const unsubscribeProfile = onValue(profileRef, (snapshot) => {
        setUserProfile(snapshot.val());
        setLoading(false);
      });
      return () => unsubscribeProfile();
    }
    // Se não há usuário, o loading já foi setado no primeiro useEffect
  }, [currentUser]);

  useEffect(() => {
    let isCancelled = false;

    const processRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (!result || !result.user || isCancelled) {
          return;
        }

        const intentRaw = sessionStorage.getItem(GOOGLE_AUTH_INTENT_KEY);
        const intent = intentRaw ? JSON.parse(intentRaw) : { mode: 'login' };
        sessionStorage.removeItem(GOOGLE_AUTH_INTENT_KEY);
        clearPendingGoogleProfile();

        await finalizeGoogleSignIn(result.user, intent);
      } catch (error) {
        console.error('Falha ao concluir login Google por redirecionamento:', error);
        if (!isCancelled) {
          if (error.code === 'app/nickname-required' || error.code === 'app/nickname-in-use') {
            const intentRaw = sessionStorage.getItem(GOOGLE_AUTH_INTENT_KEY);
            const intent = intentRaw ? JSON.parse(intentRaw) : { mode: 'signup' };
            sessionStorage.removeItem(GOOGLE_AUTH_INTENT_KEY);

            const pending = {
              mode: 'signup',
              inviteToken: intent.inviteToken || null,
              suggestedNickname: error.suggestedNickname || '',
            };

            setPendingGoogleProfile(pending);
            sessionStorage.setItem(GOOGLE_PENDING_PROFILE_KEY, JSON.stringify(pending));
          }

          setAuthFlowError(getAuthErrorMessage(error.code));
        }
      }
    };

    processRedirectResult();

    return () => {
      isCancelled = true;
    };
  }, [finalizeGoogleSignIn]);

  useEffect(() => {
    if (currentUser) {
      const onlineRef = ref(rtdb, `users/${currentUser.uid}/online`);
      const lastSeenRef = ref(rtdb, `users/${currentUser.uid}/lastSeen`);
      const onlineDisconnect = onDisconnect(onlineRef);
      const lastSeenDisconnect = onDisconnect(lastSeenRef);
      
      // Define o timestamp de online e lastSeen quando o usuário se conecta
      set(onlineRef, serverTimestamp());
      set(lastSeenRef, serverTimestamp());
      
      // No disconnect, remove online e registra o ultimo seen.
      onlineDisconnect.remove();
      lastSeenDisconnect.set(serverTimestamp());
      
      // Atualiza o status periodicamente (a cada 30 segundos)
      const interval = setInterval(() => {
        set(onlineRef, serverTimestamp());
        set(lastSeenRef, serverTimestamp());
      }, 30000);

      return () => {
        clearInterval(interval);
        // Evita operacoes pendentes de onDisconnect quando o efeito reinicia.
        onlineDisconnect.cancel();
        lastSeenDisconnect.cancel();
      };
    }
  }, [currentUser]);

  // Carrega a lista de usuários ocultos quando o usuário faz login
  useEffect(() => {
    if (currentUser) {
      const hiddenUsersRef = ref(rtdb, `users/${currentUser.uid}/hiddenUsers`);
      const unsubscribeHidden = onValue(hiddenUsersRef, (snapshot) => {
        if (snapshot.exists()) {
          setHiddenUsers(Object.keys(snapshot.val()));
        } else {
          setHiddenUsers([]);
        }
      });
      return () => unsubscribeHidden();
    }
  }, [currentUser]);

  const value = {
    currentUser,
    userProfile,
    authFlowError,
    pendingGoogleProfile,
    hiddenUsers,
    hideUser,
    showUser,
    signup,
    signupWithProfile,
    login,
    loginWithGoogle,
    signupWithGoogle,
    logout,
    deleteAccount,
    resetPassword,
    syncVerificationStatus,
    getAuthErrorMessage,
    clearAuthFlowError,
    completePendingGoogleSignup,
    clearPendingGoogleProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
