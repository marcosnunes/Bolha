import { useContext } from 'react';
import { AuthContext } from '../contexts/context'; // Importa o contexto do arquivo dedicado

// O hook simplesmente usa o contexto e retorna seu valor
export const useAuth = () => {
  return useContext(AuthContext);
};