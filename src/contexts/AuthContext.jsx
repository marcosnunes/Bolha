import { useEffect, useState } from 'react';
import { onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, rtdb } from '/src/firebase/config.js';
import { ref, onValue, set, remove } from 'firebase/database';
import { AuthContext } from './context.js'; // Importa o contexto do arquivo dedicado

// O componente Provider continua aqui, mas não define mais o contexto.
function AuthProvider({ children }) {
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

  function logout() {
    return signOut(auth);
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
        setLoading(false);
      }
    });
    return unsubscribeAuth;
  }, []);

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
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

// Agora este arquivo exporta APENAS o componente Provider.
export default AuthProvider;
