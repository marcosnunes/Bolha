import { useEffect, useRef } from 'react';

/**
 * Hook que desbloqueia o autoplay de áudio com o primeiro clique/toque do usuário.
 * Navegadores modernos bloqueiam autoplay até haver interação do usuário.
 */
function useAudioUnlock() {
  const unlockedRef = useRef(false);

  useEffect(() => {
    const unlockAudio = async () => {
      if (unlockedRef.current) return;

      try {
        // Criar um contexto de áudio silencioso para "desbloquear" o autoplay
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Se o contexto está suspenso, retomá-lo
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
          console.log('🔊 Audio context desbloqueado com sucesso');
        }
        
        unlockedRef.current = true;
      } catch (error) {
        console.warn('Erro ao desbloquear audio context:', error.message);
      }
    };

    // Listeners para diversos eventos de interação do usuário
    const events = ['click', 'touchstart', 'keydown', 'mousedown'];
    
    events.forEach(event => {
      document.addEventListener(event, unlockAudio, { once: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, unlockAudio);
      });
    };
  }, []);
}

export default useAudioUnlock;
