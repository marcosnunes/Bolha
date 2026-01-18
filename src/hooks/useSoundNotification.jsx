import { useCallback, useRef } from 'react';

// Importar sons ou criar URLs de sons (você pode adicionar arquivos em public/sounds/)
const SOUNDS = {
  online: '/sounds/notification-online.mp3',
  reaction: '/sounds/notification-reaction.mp3'
};

function useSoundNotification(enabled = true) {
  const audioRef = useRef(new Audio());
  const abortControllerRef = useRef(null);

  const playSound = useCallback((soundType) => {
    if (!enabled) return;

    try {
      // Cancelar reprodução anterior
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      const soundUrl = SOUNDS[soundType];
      if (soundUrl) {
        // Pausar e resetar áudio anterior
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        
        audioRef.current.src = soundUrl;
        audioRef.current.volume = 0.3; // 30% volume para não assustar
        
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch((error) => {
            // Ignorar erros de abort ou interrupção
            if (error.name !== 'AbortError' && error.name !== 'NotAllowedError') {
              console.log('Som não pôde ser reproduzido:', error.message);
            }
          });
        }
      }
    } catch (error) {
      console.error('Erro ao tocar som:', error);
    }
  }, [enabled]);

  return {
    playSound,
    playOnlineSound: () => playSound('online'),
    playReactionSound: () => playSound('reaction'),
    SOUNDS
  };
}

export default useSoundNotification;
