import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, sendEmailVerification } from 'firebase/auth';
import { useAuth } from '../contexts/AuthContext';
import {
  Container,
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';

function EmailVerificationRequiredPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleResend = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      setError('');
      setMessage('');
      await sendEmailVerification(currentUser);
      setMessage('E-mail de confirmação reenviado. Verifique sua caixa de entrada e spam.');
    } catch (err) {
      console.error(err);
      setError('Não foi possível reenviar o e-mail agora. Tente novamente em instantes.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshStatus = async () => {
    const auth = getAuth();
    if (!auth.currentUser) return;

    await auth.currentUser.reload();
    if (auth.currentUser.emailVerified) {
      navigate('/');
    } else {
      setError('Seu e-mail ainda não foi confirmado.');
    }
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Typography variant="h5" sx={{ mb: 2 }}>
            Confirme seu e-mail para continuar
          </Typography>

          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            Para entrar no Bolha, confirme o e-mail da sua conta.
          </Typography>

          <Typography variant="body2" sx={{ mb: 3 }}>
            E-mail atual: <strong>{currentUser?.email || '-'}</strong>
          </Typography>

          {message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            <Button variant="contained" onClick={handleResend} disabled={loading}>
              {loading ? <CircularProgress size={22} color="inherit" /> : 'Reenviar e-mail'}
            </Button>
            <Button variant="outlined" onClick={handleRefreshStatus}>
              Já confirmei
            </Button>
            <Button color="inherit" onClick={logout}>
              Sair
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}

export default EmailVerificationRequiredPage;
