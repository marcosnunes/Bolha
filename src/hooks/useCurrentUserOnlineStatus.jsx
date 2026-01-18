import { useState, useEffect, useRef } from 'react';
import { rtdb } from '../firebase/config';
import { ref, onValue } from 'firebase/database';

/**
 * Hook que detecta quando o usuário atual fica online ou offline
 * Retorna:
 * - `isOnline`: boolean - se o usuário está online agora
 * - `didConnect`: boolean - true quando o usuário ACABOU DE CONECTAR
 * - `didDisconnect`: boolean - true quando o usuário ACABOU DE DESCONECTAR
 */
function useCurrentUserOnlineStatus(userId) {
  const [isOnline, setIsOnline] = useState(false);
  const [didConnect, setDidConnect] = useState(false);
  const [didDisconnect, setDidDisconnect] = useState(false);
  const previousStatusRef = useRef(null);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const onlineRef = ref(rtdb, `users/${userId}/online`);

    const unsubscribe = onValue(
      onlineRef,
      (snapshot) => {
        const hasValue = snapshot.exists();
        
        // Limpar flags de transição
        setDidConnect(false);
        setDidDisconnect(false);

        if (hasValue) {
          // Usuário está online agora
          if (previousStatusRef.current === false || previousStatusRef.current === null) {
            // Mudou de OFFLINE para ONLINE
            setDidConnect(true);
          }
          previousStatusRef.current = true;
          setIsOnline(true);
        } else {
          // Usuário está offline agora
          if (previousStatusRef.current === true) {
            // Mudou de ONLINE para OFFLINE
            setDidDisconnect(true);
          }
          previousStatusRef.current = false;
          setIsOnline(false);
        }
      },
      (error) => {
        console.warn(`Erro ao monitorar status do usuário ${userId}:`, error.code);
        setIsOnline(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      // Cleanup state asynchronously to avoid cascading renders
      setTimeout(() => {
        setIsOnline(false);
        setDidConnect(false);
        setDidDisconnect(false);
        previousStatusRef.current = null;
      }, 0);
      return;
    }
    return () => {
      setIsOnline(false);
      setDidConnect(false);
      setDidDisconnect(false);
      previousStatusRef.current = null;
    };
  }, [userId]);

  return { isOnline, didConnect, didDisconnect };
}

export default useCurrentUserOnlineStatus;
