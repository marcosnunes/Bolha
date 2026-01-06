import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { auth, rtdb, functions } from '/src/firebase/config.js';
import { ref, onValue, set, remove } from 'firebase/database';

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

  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  async function logout() {
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

  const sendVerificationEmail = async () => {
    const sendVerificationEmailFunc = httpsCallable(functions, 'sendVerificationEmail');
    try {
      const result = await sendVerificationEmailFunc();
      console.log('Email de verificação enviado:', result);
      return result;
    } catch (error) {
      console.error('Erro ao enviar email de verificação:', error);
      throw error;
    }
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
      const hiddenUsersRef = ref(rtdb, `users/${currentUser.uid}/hiddenUsers`);
      const unsubscribeHidden = onValue(hiddenUsersRef, (snapshot) => {
        setHiddenUsers(snapshot.val() ? Object.keys(snapshot.val()) : []);
      });
      return () => unsubscribeHidden();
    }
    // hiddenUsers já foi inicializado como [] no useState
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
    sendVerificationEmail,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
