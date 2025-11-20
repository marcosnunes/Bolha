import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { rtdb } from '../firebase/config';
import { ref, push, set, serverTimestamp } from 'firebase/database';
import { getFunctions, httpsCallable } from 'firebase/functions';

// Componentes do MUI
import { 
  AppBar, Toolbar, Typography, Button, IconButton, Drawer, List, ListItem, 
  ListItemButton, ListItemIcon, ListItemText, Box, Container, Divider, Card, 
  CardHeader, CardContent, CardActions, TextField, InputAdornment, Tooltip, Switch
} from '@mui/material';

// Ícones do MUI
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LinkIcon from '@mui/icons-material/Link';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

// Nossos componentes (que também precisaremos refatorar depois)
import CreatePostForm from '../components/CreatePostForm.jsx';
import Feed from '../components/Feed.jsx';
import HiddenUsersManager from '../components/HiddenUsersManager.jsx';

function HomePage() {
  const { currentUser, userProfile, logout, hiddenUsers, showUser } = useAuth();
  const navigate = useNavigate();
  
  // Estados do componente
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showNSFW, setShowNSFW] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [loadingInvite, setLoadingInvite] = useState(false);

  // Manipulador para o menu mobile
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  // Função de Logout
  async function handleLogout() {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Falha ao fazer logout", error);
    }
  }

  // Função para gerar link de convite
  const generateInviteLink = async () => {
    if (!currentUser) return;
    setLoadingInvite(true);
    try {
      const invitesRef = ref(rtdb, 'invites');
      const newInviteRef = push(invitesRef);
      await set(newInviteRef, {
        invitedBy: currentUser.uid,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      const token = newInviteRef.key;
      const newLink = `${window.location.origin}/convite/${token}`;
      setInviteLink(newLink);
    } catch (error) {
      console.error("Erro ao gerar convite:", error);
      alert("Não foi possível gerar o link. Tente novamente.");
    }
    setLoadingInvite(false);
  };

  // Função para apagar a conta do usuário
  const handleDeleteAccount = async () => {
    if (window.confirm("ATENÇÃO: Você tem certeza de que deseja apagar sua conta? Todos os seus posts e dados serão permanentemente removidos. Esta ação não pode ser desfeita.")) {
      try {
        const functions = getFunctions();
        const deleteUserAccount = httpsCallable(functions, 'deleteUserAccount');
        await deleteUserAccount();
        alert("Sua conta foi apagada com sucesso.");
      } catch (error) {
        console.error("Erro ao apagar a conta:", error);
        alert("Ocorreu um erro ao apagar sua conta. Por favor, tente novamente.");
      }
    }
  };

  // JSX do menu lateral (Drawer)
  const drawer = (
    <Box onClick={handleDrawerToggle} sx={{ textAlign: 'center' }}>
      <Typography variant="h6" sx={{ my: 2 }}>
        Bolha
      </Typography>
      <Divider />
      <List>
        {currentUser ? (
          <>
            <ListItem>
              <ListItemIcon><AccountCircleIcon /></ListItemIcon>
              <ListItemText primary={userProfile ? userProfile.nickname : ''} secondary={currentUser.email} />
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton onClick={handleLogout}>
                <ListItemIcon><LogoutIcon /></ListItemIcon>
                <ListItemText primary="Sair" />
              </ListItemButton>
            </ListItem>
          </>
        ) : ( /* Fallback para usuário deslogado */
          <ListItem disablePadding>
            <ListItemButton component={RouterLink} to="/login">
              <ListItemIcon><AccountCircleIcon /></ListItemIcon>
              <ListItemText primary="Login" />
            </ListItemButton>
          </ListItem>
        )}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'grey.100' }}>
      {/* --- BARRA DE NAVEGAÇÃO (AppBar) --- */}
      <AppBar component="nav" position="sticky">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Bolha
          </Typography>
          <IconButton color="inherit" aria-label="open drawer" edge="end" onClick={handleDrawerToggle} sx={{ display: { sm: 'none' } }}>
            <MenuIcon />
          </IconButton>
          <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
            {currentUser && (
              <>
                <Button sx={{ color: '#fff' }}>Olá, {userProfile ? userProfile.nickname : ''}</Button>
                <Button onClick={handleLogout} color="inherit">Sair</Button>
              </>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {/* --- MENU LATERAL (Drawer) --- */}
      <Drawer variant="temporary" open={mobileOpen} onClose={handleDrawerToggle} anchor="right" ModalProps={{ keepMounted: true }} sx={{ display: { xs: 'block', sm: 'none' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 240 } }}>
        {drawer}
      </Drawer>

      {/* --- CONTEÚDO PRINCIPAL --- */}
      <Container component="main" maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <CreatePostForm />

        <HiddenUsersManager hiddenUsers={hiddenUsers} onShowUser={showUser} />

        <Card sx={{ my: 3 }}>
          <CardHeader title="Convidar para a Bolha" subheader="Gere um link de convite único e compartilhe." />
          <CardContent>
            {inviteLink && (
              <TextField
                fullWidth
                label="Seu link de convite"
                value={inviteLink}
                InputProps={{
                  readOnly: true,
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title="Copiar">
                        <IconButton onClick={() => navigator.clipboard.writeText(inviteLink)}>
                          <ContentCopyIcon />
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  ),
                }}
              />
            )}
          </CardContent>
          <CardActions>
            <Button 
              variant="contained" 
              onClick={generateInviteLink} 
              disabled={loadingInvite}
              startIcon={<LinkIcon />}
            >
              {loadingInvite ? 'Gerando...' : 'Gerar Link de Convite'}
            </Button>
          </CardActions>
        </Card>

        <Card sx={{ my: 3, bgcolor: 'error.lightest' }}>
          <CardHeader title="Zona de Perigo" titleTypographyProps={{color: 'error.dark'}} />
          <CardContent>
            <Typography variant="body2" color="error.dark">
              Apagar sua conta é uma ação permanente e removerá todos os seus dados.
            </Typography>
          </CardContent>
          <CardActions>
            <Button variant="contained" color="error" onClick={handleDeleteAccount}>
              Apagar Minha Conta
            </Button>
          </CardActions>
        </Card>
        
        <Divider sx={{ my: 4 }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" component="h2">Posts Recentes</Typography>
          <Tooltip title="Mostrar/Ocultar conteúdo sensível">
            <Switch checked={showNSFW} onChange={() => setShowNSFW(!showNSFW)} />
          </Tooltip>
        </Box>
        
        <Feed filterNSFW={!showNSFW} />
      </Container>
    </Box>
  );
}

export default HomePage;