import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, deleteUser } from 'firebase/auth';
import { auth, rtdb } from '/src/firebase/config.js';
import { ref, onValue, set, remove, update } from 'firebase/database';

const AuthContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null); // Para guardar o apelido
  const [loading, setLoading] = useState(true);
  const [hiddenUsers, setHiddenUsers] = useState([]);

  function signup(email, password) {
    return createUserWithEmailAndPassword(auth, email, password);
  }

  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  function logout() {
    return signOut(auth);
  }

  async function deleteAccount() {
    const userToDelete = auth.currentUser;
    if (!userToDelete) {
      throw new Error("Nenhum usuário logado para apagar.");
    }

    try {
      // Etapa 1: Apagar os dados do Realtime Database de forma atômica
      const updates = {};
      updates[`/profiles/${userToDelete.uid}`] = null;
      updates[`/users/${userToDelete.uid}`] = null;
      
      await update(ref(rtdb), updates);

      // Etapa 2: Apenas após a confirmação da exclusão dos dados, apagar o usuário da autenticação.
      await deleteUser(userToDelete);
      
    } catch (error) {
      console.error("Ocorreu um erro durante o processo de exclusão da conta:", error);
      // O erro será propagado para a UI (SettingsPage), que irá mostrar a mensagem correta.
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

  // Efeito para monitorar a autenticação
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, user => {
      setCurrentUser(user);
      if (!user) {
        setUserProfile(null);
        setLoading(false);
      }
    });
    return unsubscribeAuth;
  }, []);

  // Efeito para buscar o perfil (apelido) do usuário logado
  useEffect(() => {
    if (currentUser) {
      const profileRef = ref(rtdb, `profiles/${currentUser.uid}`);
      const unsubscribeProfile = onValue(profileRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setUserProfile(data);
        }
        setLoading(false);
      });
      return () => unsubscribeProfile();
    }
  }, [currentUser]);

  // Efeito para buscar a lista de usuários ocultos
  useEffect(() => {
    if (currentUser) {
      const hiddenUsersRef = ref(rtdb, `users/${currentUser.uid}/hiddenUsers`);
      const unsubscribeHidden = onValue(hiddenUsersRef, (snapshot) => {
        const data = snapshot.val();
        setHiddenUsers(data ? Object.keys(data) : []);
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
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
