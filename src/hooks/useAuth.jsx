import { useContext } from 'react';
import { AuthContext } from '../contexts/context.js';

export const useAuth = () => {
    return useContext(AuthContext);
};