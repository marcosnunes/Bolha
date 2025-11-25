import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

// Componentes do MUI
import { AppBar, Toolbar, IconButton, Typography, Container, Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

// Nosso componente de gerenciamento
import HiddenUsersManager from '../components/HiddenUsersManager.jsx';

function SettingsPage() {
  const { hiddenUsers, showUser, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteAccount();
      navigate('/cadastro'); // Redireciona após apagar a conta
    } catch (error) {
      setError('Ocorreu um erro ao apagar sua conta. Por favor, tente novamente.');
      // Opcional: Tratar erros específicos, como reautenticação necessária.
    }
    setOpen(false);
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
      
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <HiddenUsersManager hiddenUsers={hiddenUsers} onShowUser={showUser} />
        
        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
          <Button variant="contained" color="error" onClick={handleClickOpen}>
            Apagar Conta
          </Button>
        </Box>

        {error && 
          <Typography color="error" textAlign="center" sx={{ mt: 2 }}>
            {error}
          </Typography>
        }

        <Dialog open={open} onClose={handleClose}>
          <DialogTitle>Apagar Conta</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Tem certeza de que deseja apagar sua conta? Esta ação é irreversível e todos os seus dados serão perdidos.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancelar</Button>
            <Button onClick={handleDeleteAccount} color="error">
              Apagar
            </Button>
          </DialogActions>
        </Dialog>

      </Container>
    </Box>
  );
}

export default SettingsPage;
