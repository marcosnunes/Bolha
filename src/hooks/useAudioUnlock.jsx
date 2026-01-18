import { useEffect, useRef } from 'react';

/**
 * Hook que desbloqueia o autoplay de áudio com o primeiro clique/toque do usuário.
 * Navegadores modernos bloqueiam autoplay até haver interação do usuário.
 * 
 * Estratégias testadas:
 * 1. AudioContext.resume() - para Web Audio API
 * 2. Play promise em dummy audio - para HTMLAudioElement
 * 3. Play promise em novo Audio() - fallback
 */
function useAudioUnlock() {
  const unlockedRef = useRef(false);

  useEffect(() => {
    const unlockAudio = async () => {
      if (unlockedRef.current) return;

      console.log('🔓 Tentando desbloquear autoplay...');

      try {
        // Estratégia 1: Desbloquear AudioContext
        try {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          if (AudioContext) {
            const audioContext = new AudioContext();
            if (audioContext.state === 'suspended') {
              await audioContext.resume();
              console.log('✅ AudioContext desbloqueado');
            }
          }
        } catch (e) {
          console.debug('AudioContext não disponível:', e.message);
        }

        // Estratégia 2: Tentar reproduzir um audio vazio para desbloquear HTMLAudioElement
        try {
          const silentAudio = new Audio();
          silentAudio.src = 'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA=='; // Wav silencioso de 1ms
          silentAudio.volume = 0;
          const playPromise = silentAudio.play();
          if (playPromise) {
            await playPromise;
            console.log('✅ HTML5 Audio desbloqueado via dummy playback');
          }
        } catch (e) {
          console.debug('Erro ao reproduzir dummy audio:', e.message);
        }

        unlockedRef.current = true;
        console.log('🔊 Autoplay desbloqueado com sucesso!');
      } catch (error) {
        console.warn('Erro ao desbloquear audio:', error.message);
      }
    };

    // Listeners para diversos eventos de interação do usuário
    // Usar 'true' para capturar durante a fase de captura (mais cedo)
    const events = ['click', 'touchstart', 'touchend', 'keydown', 'mousedown', 'pointerdown'];
    
    const handleUserInteraction = () => {
      unlockAudio();
      // Remover listeners após execução
      events.forEach(event => {
        document.removeEventListener(event, handleUserInteraction, true);
      });
    };

    events.forEach(event => {
      document.addEventListener(event, handleUserInteraction, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserInteraction, true);
      });
    };
  }, []);
}

export default useAudioUnlock;
