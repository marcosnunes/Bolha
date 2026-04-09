import { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { rtdb } from '../firebase/config';
import { ref, get } from 'firebase/database';

function ConvitePage() {
  const { token } = useParams(); // Pega o ':token' da URL
  const [isValid, setIsValid] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      setError("Token de convite inválido.");
      return;
    }

    const checkToken = async () => {
      const inviteRef = ref(rtdb, `invites/${token}`);
      try {
        const snapshot = await get(inviteRef);
        if (snapshot.exists() && snapshot.val().status === 'pending') {
          setIsValid(true);
        } else {
          setError("Este link de convite é inválido ou já foi utilizado.");
        }
      } catch (err) {
        console.error("Erro ao validar token:", err);
        setError("Ocorreu um erro ao verificar o convite.");
      }
      setLoading(false);
    };

    checkToken();
  }, [token]);

  if (loading) {
    return <div className="container center-align"><h4>Verificando convite...</h4></div>;
  }

  if (error) {
    return <div className="container center-align"><h4>{error}</h4></div>;
  }
  
  // Se o token for válido, envia para fluxo unificado de autenticação.
  return isValid ? <Navigate to={`/auth?mode=signup&token=${token}`} replace /> : <Navigate to="/auth?mode=login" replace />;
}

export default ConvitePage;