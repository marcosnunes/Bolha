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
  CardHeader, CardContent, CardActions, TextField, InputAdornment, Tooltip, Switch, 
  Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle 
} from '@mui/material';

// Ícones do MUI
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LinkIcon from '@mui/icons-material/Link';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';

// Nossos componentes
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
  const [openInviteDialog, setOpenInviteDialog] = useState(false);

  // Manipulador para o menu mobile/desktop unificado
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
    handleDrawerToggle(); // Fecha o menu lateral
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
      setOpenInviteDialog(true); // Abre o diálogo com o link
    } catch (error) {
      console.error("Erro ao gerar convite:", error);
      alert("Não foi possível gerar o link. Tente novamente.");
    }
    setLoadingInvite(false);
  };

  // Função para apagar a conta do usuário
  const handleDeleteAccount = async () => {
    handleDrawerToggle(); // Fecha o menu lateral
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
    <Box sx={{ textAlign: 'center' }}>
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
            <Divider />
            <ListItem disablePadding>
              <ListItemButton onClick={generateInviteLink} disabled={loadingInvite}>
                <ListItemIcon><AddCircleOutlineIcon /></ListItemIcon>
                <ListItemText primary={loadingInvite ? "Gerando..." : "Convidar"} />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton onClick={handleDeleteAccount} sx={{color: 'error.main'}}>
                <ListItemIcon><DeleteForeverIcon color="error" /></ListItemIcon>
                <ListItemText primary="Apagar Conta" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton onClick={handleLogout}>
                <ListItemIcon><LogoutIcon /></ListItemIcon>
                <ListItemText primary="Sair" />
              </ListItemButton>
            </ListItem>
          </>
        ) : (
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
      {/* --- BARRA DE NAVEGAÇÃO UNIFICADA --- */}
      <AppBar component="nav" position="sticky">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Bolha
          </Typography>
          <IconButton color="inherit" aria-label="open drawer" edge="end" onClick={handleDrawerToggle}>
            <MenuIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* --- MENU LATERAL (Drawer) --- */}
      <Drawer variant="temporary" open={mobileOpen} onClose={handleDrawerToggle} anchor="right" ModalProps={{ keepMounted: true }} sx={{ '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 280 } }}>
        {drawer}
      </Drawer>

      {/* --- DIÁLOGO DE CONVITE (Modal) --- */}
      <Dialog open={openInviteDialog} onClose={() => setOpenInviteDialog(false)}>
        <DialogTitle>Link de Convite Gerado</DialogTitle>
        <DialogContent>
          <DialogContentText>Copie o link abaixo e compartilhe com seu amigo.</DialogContentText>
          <TextField
            autoFocus margin="dense" id="link" label="Link de Convite" type="text"
            fullWidth variant="standard" value={inviteLink} InputProps={{ readOnly: true }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { navigator.clipboard.writeText(inviteLink); setOpenInviteDialog(false); }}>Copiar e Fechar</Button>
          <Button onClick={() => setOpenInviteDialog(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>
      
      {/* --- CONTEÚDO PRINCIPAL --- */}
      <Container component="main" maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <CreatePostForm />
        <HiddenUsersManager hiddenUsers={hiddenUsers} onShowUser={showUser} />
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