import { useState, useEffect } from 'react';
import { rtdb } from '../firebase/config';
import { ref, onValue } from 'firebase/database';

function useOnlineStatus(userId) {
  const [isOnline, setIsOnline] = useState(false);
  const [lastSeenAt, setLastSeenAt] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      queueMicrotask(() => {
        setIsOnline(false);
        setLoading(false);
      });
      return;
    }

    const onlineRef = ref(rtdb, `users/${userId}/online`);
    const lastSeenRef = ref(rtdb, `users/${userId}/lastSeen`);
    
    const unsubscribeOnline = onValue(
      onlineRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const timestamp = snapshot.val();
          const now = Date.now();
          // Usuário é considerado online se atualizou o status nos últimos 5 minutos
          const isUserOnline = (now - timestamp) < 5 * 60 * 1000;
          setIsOnline(isUserOnline);
        } else {
          setIsOnline(false);
        }
        setLoading(false);
      },
      (error) => {
        // Se houver erro de permissão ou arquivo não encontrado, usuário não está online
        console.warn(`Aviso ao verificar online status de ${userId}:`, error.code);
        setIsOnline(false);
        setLoading(false);
      }
    );

    const unsubscribeLastSeen = onValue(
      lastSeenRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setLastSeenAt(snapshot.val());
        }
      },
      (error) => {
        console.warn(`Aviso ao verificar lastSeen de ${userId}:`, error.code);
      }
    );

    return () => {
      unsubscribeOnline();
      unsubscribeLastSeen();
    };
  }, [userId]);

  return { isOnline, lastSeenAt, loading };
}

export default useOnlineStatus;
