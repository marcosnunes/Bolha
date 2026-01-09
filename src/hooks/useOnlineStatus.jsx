import { useState, useEffect } from 'react';
import { rtdb } from '../firebase/config';
import { ref, onValue } from 'firebase/database';

function useOnlineStatus(userId) {
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setTimeout(() => setLoading(false), 0);
      return;
    }

    const onlineRef = ref(rtdb, `users/${userId}/online`);
    const unsubscribe = onValue(
      onlineRef,
      (snapshot) => {
        const data = snapshot.val();
        const now = Date.now();
        // Usuário é considerado online se atualizou o status nos últimos 5 minutos
        const isUserOnline = data && (now - data) < 5 * 60 * 1000;
        setIsOnline(isUserOnline);
        setLoading(false);
      },
      () => {
        setIsOnline(false);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  return { isOnline, loading };
}

export default useOnlineStatus;
