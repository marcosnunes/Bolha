import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function ProtectedRoute({ children, allowUnverified = false }) {
  const { currentUser } = useAuth();

  if (!currentUser) {
    // Se não houver usuário logado, redireciona para a página de login
    return <Navigate to="/login" />;
  }

  if (!allowUnverified && !currentUser.emailVerified) {
    return <Navigate to="/verificacao-email" />;
  }

  // Se houver um usuário logado, renderiza o componente filho (a página protegida)
  return children;
}

export default ProtectedRoute;