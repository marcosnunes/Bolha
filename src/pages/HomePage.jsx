import { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { rtdb } from '../firebase/config';
import { ref, push, set, update, serverTimestamp } from 'firebase/database'; // Adicionado 'update'
import { getFunctions, httpsCallable } from 'firebase/functions';
import SettingsIcon from '@mui/icons-material/Settings';

// Componentes do MUI
import {
    AppBar, Toolbar, Typography, Button, IconButton, Drawer, List, ListItem,
    ListItemButton, ListItemIcon, ListItemText, Box, Container, Divider,
    Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField,
    Tooltip, Switch, Avatar
} from '@mui/material';

// Ícones do MUI
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
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

    const profilePicInputRef = useRef(null);

    // Função para lidar com a mudança da foto de perfil
    const handleProfilePicChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        console.log("Iniciando upload da nova foto de perfil...");
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
            const response = await fetch(`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`, {
                method: 'POST',
                body: formData,
            });
            if (!response.ok) throw new Error('Falha no upload da nova foto de perfil.');
            const data = await response.json();
            const newPhotoURL = data.secure_url;
            if (currentUser) {
                const profileRef = ref(rtdb, `profiles/${currentUser.uid}`);
                await update(profileRef, { photoURL: newPhotoURL });
                alert("Foto de perfil atualizada com sucesso!");
            }
        } catch (error) {
            console.error("Erro ao atualizar a foto de perfil:", error);
            alert("Não foi possível atualizar sua foto de perfil.");
        } finally {
            console.log("Upload finalizado.");
        }
    };

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    async function handleLogout() {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error("Falha ao fazer logout", error);
        }
    }

    const generateInviteLink = async () => {
        if (!currentUser) return;
        setLoadingInvite(true);
        handleDrawerToggle();
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
            setOpenInviteDialog(true);
        } catch (error) {
            console.error("Erro ao gerar convite:", error);
            alert("Não foi possível gerar o link. Tente novamente.");
        }
        setLoadingInvite(false);
    };

    const handleDeleteAccount = async () => {
        handleDrawerToggle();
        if (window.confirm("ATENÇÃO: ...")) { // Mensagem completa aqui
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

    // JSX do menu lateral (Drawer) COMPLETO
    const drawer = (
        <Box onClick={handleDrawerToggle} sx={{ textAlign: 'center' }}>
            <Typography variant="h6" sx={{ my: 2 }}>
                Bolha
            </Typography>
            <Divider />
            <List>
                {currentUser && (
                    <>
                        <ListItem sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', my: 2, textAlign: 'center' }}>
                            <Tooltip title="Clique para alterar sua foto">
                                <IconButton onClick={() => profilePicInputRef.current.click()} sx={{ p: 0, mb: 1 }}>
                                    <Avatar src={userProfile ? userProfile.photoURL : ''} sx={{ width: 80, height: 80 }}>
                                        {userProfile && !userProfile.photoURL ? userProfile.nickname.charAt(0).toUpperCase() : null}
                                    </Avatar>
                                </IconButton>
                            </Tooltip>
                            <ListItemText
                                primary={userProfile ? userProfile.nickname : ''}
                                secondary={currentUser.email}
                                primaryTypographyProps={{ fontWeight: 'bold' }}
                            />
                        </ListItem>
                        <Divider />
                        <ListItem disablePadding>
                            <ListItemButton component={RouterLink} to="/configuracoes">
                                <ListItemIcon><SettingsIcon /></ListItemIcon>
                                <ListItemText primary="Configurações" />
                            </ListItemButton>
                        </ListItem>
                        <ListItem disablePadding>
                            <ListItemButton onClick={generateInviteLink} disabled={loadingInvite}>
                                <ListItemIcon><AddCircleOutlineIcon /></ListItemIcon>
                                <ListItemText primary={loadingInvite ? "Gerando..." : "Convidar"} />
                            </ListItemButton>
                        </ListItem>
                        <ListItem disablePadding>
                            <ListItemButton onClick={handleDeleteAccount} sx={{ color: 'error.main' }}>
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
                )}
            </List>
        </Box>
    );

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'grey.100' }}>
            {/* Input de arquivo escondido para a foto de perfil */}
            <input
                type="file"
                hidden
                ref={profilePicInputRef}
                onChange={handleProfilePicChange}
                accept="image/*"
            />

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

            <Drawer variant="temporary" open={mobileOpen} onClose={handleDrawerToggle} anchor="right" ModalProps={{ keepMounted: true }} sx={{ '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 280 } }}>
                {drawer}
            </Drawer>

            <Dialog open={openInviteDialog} onClose={() => setOpenInviteDialog(false)}>
                <DialogTitle>Link de Convite Gerado</DialogTitle>
                <DialogContent>
                    <DialogContentText>Copie o link abaixo e compartilhe com seu amigo.</DialogContentText>
                    <TextField autoFocus margin="dense" id="link" label="Link de Convite" type="text"
                        fullWidth variant="standard" value={inviteLink} InputProps={{ readOnly: true }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => { navigator.clipboard.writeText(inviteLink); setOpenInviteDialog(false); }}>Copiar e Fechar</Button>
                    <Button onClick={() => setOpenInviteDialog(false)}>Fechar</Button>
                </DialogActions>
            </Dialog>

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