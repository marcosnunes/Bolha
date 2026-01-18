import { useState, useEffect } from 'react';
import { SoundContext } from './SoundContextDefinition';

export function SoundProvider({ children }) {
  const [soundsEnabled, setSoundsEnabled] = useState(() => {
    // Recuperar preferência salva do localStorage
    const saved = localStorage.getItem('bolha_sounds_enabled');
    return saved !== null ? JSON.parse(saved) : true; // Ativado por padrão
  });

  // Salvar preferência quando mudar
  useEffect(() => {
    localStorage.setItem('bolha_sounds_enabled', JSON.stringify(soundsEnabled));
  }, [soundsEnabled]);

  return (
    <SoundContext.Provider value={{ soundsEnabled, setSoundsEnabled }}>
      {children}
    </SoundContext.Provider>
  );
}
