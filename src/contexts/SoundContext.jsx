import { useState, useEffect } from 'react';
import { SoundContext } from './SoundContextDefinition';

export function SoundProvider({ children }) {
  const [soundsEnabled, setSoundsEnabled] = useState(() => {
    // Recuperar preferência salva do localStorage com tratamento de Safari ITP
    try {
      const saved = localStorage.getItem('bolha_sounds_enabled');
      return saved !== null ? JSON.parse(saved) : true; // Ativado por padrão
    } catch (e) {
      // Safari ITP ou outras restrições de armazenamento
      console.warn('Storage access blocked (Safari ITP?):', e.message);
      return true; // Padrão: sons ativados
    }
  });

  // Salvar preferência quando mudar com tratamento de erro
  useEffect(() => {
    try {
      localStorage.setItem('bolha_sounds_enabled', JSON.stringify(soundsEnabled));
    } catch (e) {
      // Safari ITP ou outras restrições de armazenamento
      console.warn('Could not save sound preference:', e.message);
    }
  }, [soundsEnabled]);

  return (
    <SoundContext.Provider value={{ soundsEnabled, setSoundsEnabled }}>
      {children}
    </SoundContext.Provider>
  );
}
