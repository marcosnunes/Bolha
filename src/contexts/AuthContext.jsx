import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { auth, rtdb, functions } from '../firebase/config.js';
import { ref, onValue, set, remove, serverTimestamp, onDisconnect } from 'firebase/database';

const AuthContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hiddenUsers, setHiddenUsers] = useState([]);

  function signup(email, password) {
    return createUserWithEmailAndPassword(auth, email, password);
  }

  async function login(email, password) {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    // Garante que emailVerified esteja atualizado logo apos login.
    await userCredential.user.reload();
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
    window.location.assign('/login');
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
      window.location.assign('/cadastro');

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
    hiddenUsers,
    hideUser,
    showUser,
    signup,
    login,
    logout,
    deleteAccount,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
