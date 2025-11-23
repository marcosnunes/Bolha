import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

// Componentes do MUI
import { AppBar, Toolbar, IconButton, Typography, Container, Box } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

// Nosso componente de gerenciamento
import HiddenUsersManager from '../components/HiddenUsersManager.jsx';

function SettingsPage() {
  const { hiddenUsers, showUser } = useAuth();
  const navigate = useNavigate();

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
        {/* Futuramente, outras configurações (Ex: mudar apelido) podem vir aqui */}
      </Container>
    </Box>
  );
}

export default SettingsPage;
