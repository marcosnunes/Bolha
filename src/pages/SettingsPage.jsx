import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

// Componentes do MUI
import { AppBar, Toolbar, IconButton, Typography, Container, Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, CircularProgress } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

// Nosso componente de gerenciamento
import HiddenUsersManager from '../components/HiddenUsersManager.jsx';

function SettingsPage() {
  const { hiddenUsers, showUser, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleClickOpen = () => {
    setError(''); // Limpa erros anteriores
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleDeleteAccount = async () => {
    setLoading(true);
    setError('');
    try {
      await deleteAccount();
      // O onAuthStateChanged vai pegar a mudança e o ProtectedRoute vai redirecionar
      // Não precisamos mais do navigate('/cadastro') aqui.
    } catch (error) {
      if (error.code === 'auth/requires-recent-login') {
        setError('Esta operação requer login recente. Por favor, faça logout e login novamente antes de tentar apagar sua conta.');
      } else {
        setError(`Ocorreu um erro ao apagar sua conta: ${error.message}`);
      }
      setLoading(false);
    }
    // Não fechamos o diálogo em caso de erro, para o usuário ver a mensagem.
  };

  return (
    <Box sx={{ flexGrow: 1, bgcolor: 'grey.100', minHeight: '100vh' }}>
      <AppBar position="sticky" sx={{ pt: { xs: 'env(safe-area-inset-top)', sm: 0 } }}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => navigate(-1)} aria-label="voltar">
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Configurações
          </Typography>
        </Toolbar>
      </AppBar>
      
      <Container maxWidth="md" sx={{ mt: 4, pb: 4 }}>
        <HiddenUsersManager hiddenUsers={hiddenUsers} onShowUser={showUser} />
        
        <Box sx={{ mt: 4, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
          <Typography variant="h6" gutterBottom>
            Gerenciamento da Conta
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            A exclusão da sua conta é uma ação permanente e irreversível. Todos os seus dados, incluindo perfil, postagens e interações, serão removidos e não poderão ser recuperados.
          </Typography>
          <Button variant="contained" color="error" onClick={handleClickOpen} disabled={loading}>
            Apagar Minha Conta
          </Button>
        </Box>

        <Dialog open={open} onClose={handleClose}>
          <DialogTitle>Confirmar Exclusão da Conta</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Tem certeza de que deseja apagar sua conta? Esta ação não pode ser desfeita.
            </DialogContentText>
            {error && 
              <Typography color="error" sx={{ mt: 2 }}>
                {error}
              </Typography>
            }
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose} disabled={loading}>Cancelar</Button>
            <Button onClick={handleDeleteAccount} color="error" disabled={loading}>
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Apagar'}
            </Button>
          </DialogActions>
        </Dialog>

      </Container>
    </Box>
  );
}

export default SettingsPage;
