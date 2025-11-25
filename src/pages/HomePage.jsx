import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { rtdb } from '../firebase/config';
import { ref, push, set, update, serverTimestamp, onValue } from 'firebase/database';
import { getFunctions, httpsCallable } from 'firebase/functions';
import SettingsIcon from '@mui/icons-material/Settings';
import ExtensionIcon from '@mui/icons-material/Extension';

// Componentes do MUI
import {
    AppBar, Toolbar, Typography, Button, IconButton, Drawer, List, ListItem,
    ListItemButton, ListItemIcon, ListItemText, Box, Container, Divider,
    Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
    Tooltip, Switch, Avatar, Fab, FormControlLabel, TextField, Chip, ListItemAvatar
} from '@mui/material';

// Ícones do MUI
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import AddIcon from '@mui/icons-material/Add';
import PolicyIcon from '@mui/icons-material/Policy';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import PeopleIcon from '@mui/icons-material/People';

// Nossos componentes
import CreatePostForm from '../components/CreatePostForm.jsx';
import Feed from '../components/Feed.jsx';

function HomePage() {
    const { currentUser, userProfile, logout } = useAuth();
    const navigate = useNavigate();

    // Estados do componente
    const [mobileOpen, setMobileOpen] = useState(false);
    const [showNSFW, setShowNSFW] = useState(false);
    const [inviteLink, setInviteLink] = useState('');
    const [loadingInvite, setLoadingInvite] = useState(false);
    const [openInviteDialog, setOpenInviteDialog] = useState(false);
    const [openPostDialog, setOpenPostDialog] = useState(false);
    
    // Estados para Usuários e Lista
    const [userCount, setUserCount] = useState(0);
    const [allUsers, setAllUsers] = useState([]); // Lista de objetos de usuários
    const [openUserListDialog, setOpenUserListDialog] = useState(false); // Controle do modal da lista

    const [refreshFeed, setRefreshFeed] = useState(0);
    const profilePicInputRef = useRef(null);

    // Efeito para contar e listar usuários em tempo real
    useEffect(() => {
        const profilesRef = ref(rtdb, 'profiles');
        const unsubscribe = onValue(profilesRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setUserCount(snapshot.size);
                // Transforma o objeto de perfis em um array para a lista
                const usersArray = Object.keys(data).map(key => ({
                    uid: key,
                    ...data[key]
                }));
                setAllUsers(usersArray);
            } else {
                setUserCount(0);
                setAllUsers([]);
            }
        });
        return () => unsubscribe();
    }, []);

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
        }
    };

    const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

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
        if (window.confirm("ATENÇÃO: Você tem certeza de que deseja apagar sua conta? Todos os seus posts e dados serão permanentemente removidos. Esta ação não pode ser desfeita.")) {
            try {
                const functions = getFunctions();
                const deleteUserAccount = httpsCallable(functions, 'deleteUserAccount');
                
                // 1. Chama a função no backend para limpar o banco de dados
                await deleteUserAccount();
                
                alert("Sua conta e todos os seus dados foram apagados com sucesso.");

                // 2. Tenta fazer o logout no cliente (pode falhar se a conta já sumiu no backend, por isso o try/catch)
                try {
                    await logout();
                } catch (_) {
                    console.log("Usuário já desconectado ou inexistente.");
                }

            } catch (error) {
                console.error("Erro no processo de exclusão:", error);
                alert("Houve um erro, mas tentaremos redirecionar você.");
            } finally {
                // 3. INDEPENDENTE de erro ou sucesso, força o redirecionamento para cadastro
                navigate('/cadastro');
            }
        }
    };

    const handlePostSuccess = () => {
        setOpenPostDialog(false);
        setRefreshFeed(prev => prev + 1); 
    };

    const drawer = (
        <Box onClick={handleDrawerToggle} sx={{ textAlign: 'center' }}>
            <Typography variant="h6" sx={{ my: 2 }}>Bolha</Typography>
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
                        <ListItem disablePadding><ListItemButton component={RouterLink} to="/configuracoes"><ListItemIcon><SettingsIcon /></ListItemIcon><ListItemText primary="Configurações" /></ListItemButton></ListItem>
                        <ListItem disablePadding><ListItemButton onClick={generateInviteLink} disabled={loadingInvite}><ListItemIcon><AddCircleOutlineIcon /></ListItemIcon><ListItemText primary={loadingInvite ? "Gerando..." : "Convidar"} /></ListItemButton></ListItem>
                        <ListItem disablePadding><ListItemButton onClick={handleDeleteAccount} sx={{ color: 'error.main' }}><ListItemIcon><DeleteForeverIcon color="error" /></ListItemIcon><ListItemText primary="Apagar Conta" /></ListItemButton></ListItem>
                        <ListItem disablePadding><ListItemButton component={RouterLink} to="/politica-de-privacidade"><ListItemIcon><PolicyIcon /></ListItemIcon><ListItemText primary="Política de Privacidade" /></ListItemButton></ListItem>
                        <ListItem disablePadding><ListItemButton component={RouterLink} to="/palavras-cruzadas"><ListItemIcon><ExtensionIcon color="primary" /></ListItemIcon><ListItemText primary="Palavras Cruzadas" /></ListItemButton></ListItem>
                        <ListItem disablePadding><ListItemButton component={RouterLink} to="/denuncia"><ListItemIcon><ReportProblemIcon color="warning" /></ListItemIcon><ListItemText primary="Denunciar Abuso" /></ListItemButton></ListItem>
                        <ListItem disablePadding><ListItemButton onClick={handleLogout}><ListItemIcon><LogoutIcon /></ListItemIcon><ListItemText primary="Sair" /></ListItemButton></ListItem>
                    </>
                )}
            </List>
        </Box>
    );

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'grey.100' }}>
            <input type="file" hidden ref={profilePicInputRef} onChange={handleProfilePicChange} accept="image/*" />
            
            <AppBar component="nav" position="sticky" sx={{ pt: { xs: 'env(safe-area-inset-top)', sm: 0 } }}>
                <Toolbar>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>Bolha</Typography>
                    
                    {/* Contador de Usuários - Agora Clicável */}
                    <Chip 
                        icon={<PeopleIcon style={{ color: 'inherit' }} />} 
                        label={`${userCount} membros`}
                        variant="outlined"
                        onClick={() => setOpenUserListDialog(true)} // Abre o modal
                        sx={{ 
                            mr: 2, 
                            color: 'white', 
                            borderColor: 'rgba(255, 255, 255, 0.5)',
                            '& .MuiChip-icon': { color: 'white' },
                            cursor: 'pointer',
                            '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
                        }} 
                    />
                    
                    <IconButton color="inherit" aria-label="open drawer" edge="end" onClick={handleDrawerToggle}><MenuIcon /></IconButton>
                </Toolbar>
            </AppBar>
            
            <Drawer variant="temporary" open={mobileOpen} onClose={handleDrawerToggle} anchor="right" ModalProps={{ keepMounted: true }} sx={{ '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 280 } }}>{drawer}</Drawer>

            {/* DIÁLOGO: Lista de Membros */}
            <Dialog 
                open={openUserListDialog} 
                onClose={() => setOpenUserListDialog(false)}
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle>Membros da Bolha ({userCount})</DialogTitle>
                <DialogContent dividers>
                    <List>
                        {allUsers.map((user) => (
                            <ListItem key={user.uid}>
                                <ListItemAvatar>
                                    <Avatar src={user.photoURL} alt={user.nickname}>
                                        {!user.photoURL && user.nickname ? user.nickname.charAt(0).toUpperCase() : '?'}
                                    </Avatar>
                                </ListItemAvatar>
                                <ListItemText primary={user.nickname} />
                            </ListItem>
                        ))}
                    </List>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenUserListDialog(false)}>Fechar</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openInviteDialog} onClose={() => setOpenInviteDialog(false)}>
                <DialogTitle>Link de Convite Gerado</DialogTitle>
                <DialogContent>
                    <DialogContentText>Copie o link abaixo e compartilhe com seu amigo.</DialogContentText>
                    <TextField autoFocus margin="dense" id="link" label="Link de Convite" type="text" fullWidth variant="standard" value={inviteLink} InputProps={{ readOnly: true }} />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => { navigator.clipboard.writeText(inviteLink); setOpenInviteDialog(false); }}>Copiar e Fechar</Button>
                    <Button onClick={() => setOpenInviteDialog(false)}>Fechar</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openPostDialog} onClose={() => setOpenPostDialog(false)} fullWidth maxWidth="sm">
                <DialogTitle>Crie um novo post</DialogTitle>
                <DialogContent>
                    <CreatePostForm onPostSuccess={handlePostSuccess} />
                </DialogContent>
            </Dialog>

            <Container component="main" maxWidth="md" sx={{ mt: 4, mb: 4 }}>
                <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', mb: 2, gap: 2 }}>
                    <Typography variant="h4" component="h2">Posts Recentes</Typography>
                    <FormControlLabel control={<Switch checked={showNSFW} onChange={() => setShowNSFW(!showNSFW)} />} label="Mostrar conteúdo sensível" labelPlacement="start" />
                </Box>
                
                <Feed filterNSFW={!showNSFW} refreshTrigger={refreshFeed} />
            </Container>

            <Fab color="primary" aria-label="add" onClick={() => setOpenPostDialog(true)} sx={{ position: 'fixed', bottom: { xs: 80, sm: 32 }, right: 32 }}>
                <AddIcon />
            </Fab>
        </Box>
    );
}

export default HomePage;
