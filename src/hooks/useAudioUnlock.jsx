import { useEffect, useRef } from 'react';

/**
 * Hook que desbloqueia o autoplay de áudio com o primeiro clique/toque do usuário.
 * Navegadores modernos bloqueiam autoplay até haver interação do usuário.
 */
function useAudioUnlock() {
  const unlockedRef = useRef(false);
  const attemptCountRef = useRef(0);

  useEffect(() => {
    const unlockAudio = async () => {
      // Evitar execução múltipla
      if (unlockedRef.current) return;

      attemptCountRef.current++;
      console.log(`🔓 Tentativa #${attemptCountRef.current} de desbloquear autoplay...`);

      let audioUnlocked = false;

      try {
        // Estratégia 1: Desbloquear AudioContext
        try {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          if (AudioContext) {
            const audioContext = new AudioContext();
            if (audioContext.state === 'suspended') {
              await audioContext.resume();
              console.log('✅ AudioContext desbloqueado com sucesso');
              audioUnlocked = true;
            } else if (audioContext.state === 'running') {
              console.log('ℹ️ AudioContext já estava desbloqueado');
              audioUnlocked = true;
            }
          }
        } catch (e) {
          console.debug('ℹ️ AudioContext não disponível:', e.message);
        }

        // Estratégia 2: Tentar reproduzir um audio vazio para desbloquear HTMLAudioElement
        if (!audioUnlocked) {
          try {
            const silentAudio = new Audio();
            silentAudio.src = 'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==';
            silentAudio.volume = 0;
            const playPromise = silentAudio.play();
            if (playPromise) {
              await playPromise;
              console.log('✅ HTML5 Audio desbloqueado via dummy playback');
              audioUnlocked = true;
            }
          } catch (e) {
            console.debug('ℹ️ Erro ao reproduzir dummy audio:', e.message);
          }
        }

        if (audioUnlocked) {
          unlockedRef.current = true;
          console.log('🔊 ✨ Autoplay desbloqueado com sucesso! Som agora funcionará.');
        }
      } catch (error) {
        console.warn('⚠️ Erro ao desbloquear audio:', error.message);
      }
    };

    const testPlaySound = async () => {
      try {
        console.log('🧪 Testando som...');
        const testAudio = new Audio('/sounds/notification-online.mp3');
        testAudio.volume = 0.3;
        await testAudio.play();
        console.log('✅ Som de teste tocado com sucesso! Se ouviu, tudo está funcionando.');
      } catch (error) {
        console.warn('⚠️ Erro ao tocar som de teste:', error.message);
      }
    };// Listeners para diversos eventos de interação do usuário
    const events = ['click', 'touchstart', 'touchend', 'keydown', 'mousedown', 'pointerdown'];
    
    const handleUserInteraction = (event) => {
      if (!unlockedRef.current) {
        console.log(`📱 Interação detectada: ${event.type}`);
        unlockAudio();
      }
    };

    events.forEach(event => {
      document.addEventListener(event, handleUserInteraction, { capture: true, passive: true });
    });

    // Limpeza
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserInteraction, true);
      });
    };
  }, []);
}

export default useAudioUnlock;
