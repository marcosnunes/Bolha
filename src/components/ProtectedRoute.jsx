import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

function ProtectedRoute({ children }) {
  const { currentUser } = useAuth();

  if (!currentUser) {
    // Se não houver usuário logado, redireciona para a página de login
    return <Navigate to="/login" />;
  }

  // Se houver um usuário logado, renderiza o componente filho (a página protegida)
  return children;
}

export default ProtectedRoute;