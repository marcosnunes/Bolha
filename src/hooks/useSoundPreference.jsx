import { useContext } from 'react';
import { SoundContext } from '../contexts/SoundContextDefinition';

export function useSoundPreference() {
  const context = useContext(SoundContext);
  if (!context) {
    throw new Error('useSoundPreference deve ser usado dentro de SoundProvider');
  }
  return context;
}
