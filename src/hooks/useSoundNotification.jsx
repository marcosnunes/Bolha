import { useCallback, useRef } from 'react';

function useSoundNotification(enabled = true) {
  const audioRef = useRef(new Audio());
  const abortControllerRef = useRef(null);
  const autoplayNotAllowedRef = useRef(false);

  const playSound = useCallback((soundType) => {
    // Sons foram desativados - este hook está mantido apenas para compatibilidade futura
    console.debug('🔇 Sons desativados do app');
    return;
  }, [enabled]);

  return {
    playSound
  };
}

export default useSoundNotification;
