import { createContext } from 'react';

// Este arquivo existe APENAS para definir e exportar o contexto.
// Isso evita o erro de "fast refresh" que ocorre quando um componente
// e um não-componente (como o contexto) são exportados do mesmo arquivo.
export const AuthContext = createContext();
