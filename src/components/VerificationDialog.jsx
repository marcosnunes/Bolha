import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '/src/firebase/config.js';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Alert, CircularProgress, Typography, Box
} from '@mui/material';
import ErrorIcon from '@mui/icons-material/Error';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

function VerificationDialog({ open, onClose, hasPhoto, userEmail, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSendEmail = async () => {
    if (!hasPhoto) {
      setError('Apenas usuários com foto de perfil podem ser verificados');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const sendVerificationEmail = httpsCallable(functions, 'sendVerificationEmail');
      const result = await sendVerificationEmail();
      console.log('Email de verificação enviado:', result);
      setSent(true);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Erro ao enviar email de verificação:', err);
      setError(err.message || 'Erro ao enviar email de verificação');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSent(false);
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Verificar Conta</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          {!hasPhoto ? (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <ErrorIcon sx={{ fontSize: 48, color: 'warning.main' }} />
                <Typography variant="body1">
                  Apenas usuários com foto de perfil podem ser verificados
                </Typography>
              </Box>
              <Alert severity="warning">
                Adicione uma foto de perfil para verificar sua conta
              </Alert>
            </>
          ) : sent ? (
            <>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <CheckCircleIcon sx={{ fontSize: 48, color: 'success.main' }} />
                <Typography variant="body1" sx={{ textAlign: 'center' }}>
                  Email de verificação enviado com sucesso!
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                  Verifique sua caixa de entrada em <strong>{userEmail}</strong> e clique no link para verificar sua conta.
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
                  O link expira em 24 horas.
                </Typography>
              </Box>
            </>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Um email de verificação será enviado para:
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 2, p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
                {userEmail}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Clique no link no email para verificar sua conta. Após verificado, você receberá um símbolo azul no seu avatar.
              </Typography>
              {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
            </>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancelar
        </Button>
        {!sent && hasPhoto && (
          <Button onClick={handleSendEmail} variant="contained" disabled={loading || !hasPhoto}>
            {loading ? <CircularProgress size={24} /> : 'Enviar Email'}
          </Button>
        )}
        {sent && (
          <Button onClick={handleClose} variant="contained">
            Fechar
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default VerificationDialog;
