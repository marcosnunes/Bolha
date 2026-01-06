import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Box, Typography, CircularProgress, Alert, Button
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

function VerificacaoPage() {
  const { uid, token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        // Chamar a Cloud Function via HTTP fetch
        const response = await fetch(
          `https://us-central1-bolha-app-social-media.cloudfunctions.net/verifyEmailToken?uid=${uid}&token=${token}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erro ao verificar email');
        }

        const result = await response.json();
        console.log('Email verificado com sucesso:', result);
        setSuccess(true);
        setLoading(false);
      } catch (err) {
        console.error('Erro ao verificar email:', err);
        setError(err.message || 'Erro ao verificar email');
        setLoading(false);
      }
    };

    if (uid && token) {
      verifyEmail();
    }
  }, [uid, token]);

  return (
    <Container maxWidth="sm">
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        textAlign: 'center',
        gap: 2
      }}>
        {loading && (
          <>
            <CircularProgress />
            <Typography variant="h6">Verificando sua conta...</Typography>
          </>
        )}

        {success && (
          <>
            <CheckCircleIcon sx={{ fontSize: 80, color: 'success.main' }} />
            <Typography variant="h5" color="success.main">
              Conta Verificada com Sucesso!
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Sua conta agora está verificada. Você pode desfrutar de todos os benefícios do Bolha.
            </Typography>
            <Button variant="contained" onClick={() => navigate('/')}>
              Voltar para Home
            </Button>
          </>
        )}

        {error && (
          <>
            <ErrorIcon sx={{ fontSize: 80, color: 'error.main' }} />
            <Typography variant="h5" color="error.main">
              Erro na Verificação
            </Typography>
            <Alert severity="error">{error}</Alert>
            <Button variant="contained" onClick={() => navigate('/configuracoes')}>
              Voltar para Configurações
            </Button>
          </>
        )}
      </Box>
    </Container>
  );
}

export default VerificacaoPage;
