import { useCallback, useRef } from 'react';

// Importar sons ou criar URLs de sons (você pode adicionar arquivos em public/sounds/)
const SOUNDS = {
  online: '/sounds/notification-online.mp3',
  reaction: '/sounds/notification-reaction.mp3'
};

function useSoundNotification(enabled = true) {
  const audioRef = useRef(new Audio());

  const playSound = useCallback((soundType) => {
    if (!enabled) return;

    try {
      const soundUrl = SOUNDS[soundType];
      if (soundUrl) {
        audioRef.current.src = soundUrl;
        audioRef.current.volume = 0.3; // 30% volume para não assustar
        audioRef.current.play().catch((error) => {
          console.log('Som não pôde ser reproduzido:', error);
        });
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
