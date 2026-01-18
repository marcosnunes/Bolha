import { useCallback, useRef } from 'react';

// Importar sons ou criar URLs de sons (você pode adicionar arquivos em public/sounds/)
const SOUNDS = {
  online: '/sounds/notification-online.mp3',
  reaction: '/sounds/notification-reaction.mp3'
};

function useSoundNotification(enabled = true) {
  const audioRef = useRef(new Audio());
  const abortControllerRef = useRef(null);
  const autoplayNotAllowedRef = useRef(false);

  const playSound = useCallback((soundType) => {
    if (!enabled) {
      console.debug('🔇 Som desativado pelo usuário');
      return;
    }

    try {
      // Cancelar reprodução anterior
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      const soundUrl = SOUNDS[soundType];
      if (!soundUrl) {
        console.warn(`⚠️ URL de som não encontrada para: ${soundType}`);
        return;
      }

      console.log(`🔊 Reproduzindo som: ${soundUrl}`);

      // Pausar e resetar áudio anterior
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      
      audioRef.current.src = soundUrl;
      audioRef.current.volume = 0.3; // 30% volume para não assustar
      
      // Adicionar logs para debug de carregamento
      audioRef.current.onerror = () => {
        console.error(`❌ Erro ao carregar som ${soundUrl}`);
      };
      
      audioRef.current.oncanplay = () => {
        console.debug(`📦 Som pronto para tocar: ${soundUrl}`);
      };
      
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log(`✅ Som ${soundType} tocado com sucesso`);
          })
          .catch((error) => {
            // Ignorar erros de abort ou interrupção
            if (error.name === 'NotAllowedError') {
              // Autoplay policy bloqueado (só registra primeira vez)
              if (!autoplayNotAllowedRef.current) {
                console.warn('🔒 Autoplay bloqueado pela browser policy. Clique na página para desbloquear.');
                autoplayNotAllowedRef.current = true;
              }
            } else if (error.name !== 'AbortError') {
              console.warn(`⚠️ Erro ao tocar som ${soundType}:`, error.name, error.message);
            }
          });
      }
    } catch (error) {
      console.error('❌ Erro ao tocar som:', error);
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
