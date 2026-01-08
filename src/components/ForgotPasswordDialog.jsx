import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Typography,
  Box,
} from '@mui/material';

function ForgotPasswordDialog({ open, onClose }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { resetPassword } = useAuth();

  async function handleSubmit() {
    try {
      setError('');
      setSuccess(false);
      setLoading(true);

      if (!email) {
        setError('Por favor, insira seu endereço de e-mail.');
        setLoading(false);
        return;
      }

      await resetPassword(email);
      setSuccess(true);
      setEmail('');
      
      // Fecha o diálogo após 3 segundos
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 3000);
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/user-not-found') {
        setError('Nenhuma conta encontrada com este endereço de e-mail.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Endereço de e-mail inválido.');
      } else {
        setError('Falha ao enviar e-mail de reset. Tente novamente.');
      }
    }
    setLoading(false);
  }

  const handleClose = () => {
    if (!loading) {
      setEmail('');
      setError('');
      setSuccess(false);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Recuperar Senha</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          {success ? (
            <Alert severity="success">
              Verifique seu e-mail! Enviamos um link para redefinir sua senha.
            </Alert>
          ) : (
            <>
              <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                Insira seu endereço de e-mail e enviaremos um link para redefinir sua senha.
              </Typography>
              {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
              <TextField
                autoFocus
                fullWidth
                label="Endereço de E-mail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !loading) {
                    handleSubmit();
                  }
                }}
              />
            </>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          {success ? 'Fechar' : 'Cancelar'}
        </Button>
        {!success && (
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading || !email}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Enviar'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default ForgotPasswordDialog;
