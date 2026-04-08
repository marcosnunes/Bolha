import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { rtdb } from '../firebase/config';
import { ref, push, set, update, serverTimestamp, onValue, query, orderByChild, equalTo, get } from 'firebase/database';
import { getFunctions, httpsCallable } from 'firebase/functions';
import SettingsIcon from '@mui/icons-material/Settings';

// Componentes do MUI
import {
    AppBar, Toolbar, Typography, Button, IconButton, Drawer, List, ListItem,
    ListItemButton, ListItemIcon, ListItemText, Box, Container, Divider,
    Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
    Tooltip, Avatar, Fab, TextField, Chip, ListItemAvatar,
    Alert, useMediaQuery
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
import GetAppIcon from '@mui/icons-material/GetApp';

// Nossos componentes
import CreatePostForm from '../components/CreatePostForm.jsx';
import Feed from '../components/Feed.jsx';
import VerificationBadge from '../components/VerificationBadge.jsx';
import OnlineIndicator from '../components/OnlineIndicator.jsx';
import useOnlineStatus from '../hooks/useOnlineStatus.jsx';

function HomePage() {
    const { currentUser, userProfile, logout } = useAuth();
    const navigate = useNavigate();
    const isDesktop = useMediaQuery('(min-width:901px)');

    // Estados do componente
    const [mobileOpen, setMobileOpen] = useState(false);
    const [inviteLink, setInviteLink] = useState('');
    const [loadingInvite, setLoadingInvite] = useState(false);
    const [openInviteDialog, setOpenInviteDialog] = useState(false);
    const [openPostDialog, setOpenPostDialog] = useState(false);
    const [openDeleteConfirmDialog, setOpenDeleteConfirmDialog] = useState(false);
    
    // Estados para Usuários e Lista
    const [userCount, setUserCount] = useState(0);
    const [allUsers, setAllUsers] = useState([]);
    const [openUserListDialog, setOpenUserListDialog] = useState(false);
    const [userSearchFilter, setUserSearchFilter] = useState('');

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

    // Função para comprimir imagem de perfil
    const compressProfileImage = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const maxDimension = 1024;
                    let width = img.width;
                    let height = img.height;
                    
                    if (width > maxDimension || height > maxDimension) {
                        if (width > height) {
                            height = Math.floor((height * maxDimension) / width);
                            width = maxDimension;
                        } else {
                            width = Math.floor((width * maxDimension) / height);
                            height = maxDimension;
                        }
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    canvas.toBlob(
                        (blob) => {
                            if (!blob) {
                                reject(new Error('Falha ao comprimir imagem'));
                                return;
                            }
                            const compressedFile = new File([blob], file.name, {
                                type: 'image/jpeg',
                                lastModified: Date.now(),
                            });
                            resolve(compressedFile);
                        },
                        'image/jpeg',
                        0.9
                    );
                };
                
                img.onerror = () => reject(new Error('Falha ao carregar imagem'));
            };
            
            reader.onerror = () => reject(new Error('Falha ao ler arquivo'));
        });
    };

    const handleProfilePicChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        console.log("Iniciando upload da nova foto de perfil...");
        try {
            // Comprimir imagem antes do upload
            const originalSize = file.size;
            const compressedFile = await compressProfileImage(file);
            
            if (compressedFile.size < originalSize) {
                console.log(`Imagem comprimida: ${(originalSize / 1024 / 1024).toFixed(2)}MB → ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);
            }
            
            const formData = new FormData();
            formData.append('file', compressedFile);
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

                // Atualizar a foto em TODOS os posts do usuário
                const postsRef = ref(rtdb, 'posts');
                const userPostsQuery = query(postsRef, orderByChild('authorId'), equalTo(currentUser.uid));
                const snapshot = await get(userPostsQuery);
                
                if (snapshot.exists()) {
                    const updates = {};
                    snapshot.forEach((child) => {
                        updates[`/posts/${child.key}/authorPhotoURL`] = newPhotoURL;
                    });
                    await update(ref(rtdb), updates);
                }
            }
        } catch (error) {
            console.error("Erro ao atualizar a foto de perfil:", error);
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
        }
        setLoadingInvite(false);
    };

    const handleDeleteAccountClick = () => {
        handleDrawerToggle(); // Fecha o menu
        setOpenDeleteConfirmDialog(true); // Abre o diálogo de confirmação
    };

    const executeDeleteAccount = async () => {
        setOpenDeleteConfirmDialog(false); // Fecha o diálogo
        try {
            const functions = getFunctions();
            const deleteUserAccount = httpsCallable(functions, 'deleteUserAccount');
            await deleteUserAccount();
            
            try {
                await logout();
            } catch {
                console.log("Usuário já desconectado ou inexistente.");
            }
        } catch (error) {
            console.error("Erro no processo de exclusão:", error);
        } finally {
            navigate('/cadastro');
        }
    };

    const handlePostSuccess = () => {
        setOpenPostDialog(false);
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
                                <Box sx={{ position: 'relative', display: 'inline-flex', flexShrink: 0, mb: 1 }}>
                                    <IconButton onClick={() => profilePicInputRef.current.click()} sx={{ p: 0 }}>
                                        <Avatar src={userProfile ? userProfile.photoURL : ''} sx={{ width: 80, height: 80 }}>
                                            {userProfile && !userProfile.photoURL && userProfile.nickname ? userProfile.nickname.charAt(0).toUpperCase() : null}
                                        </Avatar>
                                    </IconButton>
                                    <VerificationBadge isVerified={userProfile?.isVerified || false} avatarSize={80} customSx={{ bottom: '-5px', right: '-5px' }} />
                                </Box>
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
                        <ListItem disablePadding><ListItemButton onClick={handleDeleteAccountClick} sx={{ color: 'error.main' }}><ListItemIcon><DeleteForeverIcon color="error" /></ListItemIcon><ListItemText primary="Apagar Conta" /></ListItemButton></ListItem>
                        <ListItem disablePadding><ListItemButton component={RouterLink} to="/politica-de-privacidade"><ListItemIcon><PolicyIcon /></ListItemIcon><ListItemText primary="Política de Privacidade" /></ListItemButton></ListItem>
                        <ListItem disablePadding><ListItemButton component={RouterLink} to="/denuncia"><ListItemIcon><ReportProblemIcon color="warning" /></ListItemIcon><ListItemText primary="Denunciar Abuso" /></ListItemButton></ListItem>
                        {isDesktop && (
                            <ListItem disablePadding><ListItemButton component="a" href="https://play.google.com/store/apps/details?id=com.bolha" target="_blank" rel="noopener noreferrer"><ListItemIcon><GetAppIcon color="success" /></ListItemIcon><ListItemText primary="Baixar App" sx={{ color: 'success.main' }} /></ListItemButton></ListItem>
                        )}
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
                    
                    <Chip 
                        icon={<PeopleIcon style={{ color: 'inherit' }} />} 
                        label={`${userCount} membros`}
                        variant="outlined"
                        onClick={() => setOpenUserListDialog(true)}
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

            <Dialog open={openUserListDialog} onClose={() => { setOpenUserListDialog(false); setUserSearchFilter(''); }} fullWidth maxWidth="sm">
                <DialogTitle>Membros da Bolha ({userCount})</DialogTitle>
                <DialogContent dividers sx={{ maxHeight: '60vh', overflow: 'auto', p: 2 }}>
                    <TextField
                        fullWidth
                        variant="outlined"
                        placeholder="Buscar membro..."
                        value={userSearchFilter}
                        onChange={(e) => setUserSearchFilter(e.target.value)}
                        sx={{ mb: 2 }}
                        autoFocus
                    />
                    <List>
                        {allUsers
                            .filter(user => 
                                user.nickname && 
                                user.nickname.toLowerCase().includes(userSearchFilter.toLowerCase())
                            )
                            .map((user) => (
                                <UserListItemWithOnlineStatus key={user.uid} user={user} />
                            ))}
                    </List>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => { setOpenUserListDialog(false); setUserSearchFilter(''); }}>Fechar</Button>
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
                <DialogTitle>Criar Post</DialogTitle>
                <DialogContent>
                    <Alert severity="info" sx={{ mb: 2 }}>
                        💡 <strong>Dica:</strong> Ao enviar vídeos grandes, você pode fechar este modal! 
                        O processamento continuará em segundo plano e você verá uma notificação no canto da tela.
                    </Alert>
                    <CreatePostForm onPostSuccess={handlePostSuccess} />
                </DialogContent>
            </Dialog>

            <Dialog
                open={openDeleteConfirmDialog}
                onClose={() => setOpenDeleteConfirmDialog(false)}
            >
                <DialogTitle>Confirmar Exclusão Permanente</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Você tem certeza de que deseja apagar sua conta? Todos os seus posts, perfil e dados serão permanentemente removidos. <strong>Esta ação não pode ser desfeita.</strong>
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDeleteConfirmDialog(false)}>Cancelar</Button>
                    <Button onClick={executeDeleteAccount} color="error" autoFocus>
                        Apagar Conta
                    </Button>
                </DialogActions>
            </Dialog>

            <Container component="main" maxWidth="md" sx={{ mt: 4, mb: 4 }}>
                <Feed />
            </Container>

            <Fab color="primary" aria-label="add" onClick={() => setOpenPostDialog(true)} sx={{ position: 'fixed', bottom: { xs: 80, sm: 32 }, right: 32 }}>
                <AddIcon />
            </Fab>
        </Box>
    );
}

// Componente wrapper para item de usuário com status online
function formatLastSeen(timestamp) {
  if (!timestamp) return null;
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / (60 * 1000));
  const hours = Math.floor(diff / (60 * 60 * 1000));
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  const months = Math.floor(diff / (30 * 24 * 60 * 60 * 1000));
  const years = Math.floor(diff / (365 * 24 * 60 * 60 * 1000));

  if (minutes < 1) return 'agora mesmo';
  if (minutes < 60) return `há ${minutes} min`;
  if (hours < 24) return `há ${hours} hora${hours > 1 ? 's' : ''}`;
  if (days < 30) return `há ${days} dia${days > 1 ? 's' : ''}`;
  if (months < 12) return `há ${months} ${months > 1 ? 'meses' : 'mês'}`;
  return `há ${years} ano${years > 1 ? 's' : ''}`;
}

function UserListItemWithOnlineStatus({ user }) {
  const { isOnline, lastSeenAt } = useOnlineStatus(user.uid);

  return (
    <ListItem>
      <ListItemAvatar>
        <Box sx={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
          <Avatar src={user.photoURL} alt={user.nickname}>
            {!user.photoURL && user.nickname ? user.nickname.charAt(0).toUpperCase() : '?'}
          </Avatar>
          <VerificationBadge isVerified={user.isVerified || false} avatarSize={40} customSx={{ bottom: '-3px', right: '-3px' }} />
        </Box>
      </ListItemAvatar>
      <ListItemText 
        primary={
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <span>{user.nickname}</span>
            <OnlineIndicator isOnline={isOnline} size={10} />
          </Box>
        }
        secondary={
          !isOnline && lastSeenAt
            ? `visto por último ${formatLastSeen(lastSeenAt)}`
            : null
        }
        secondaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
      />
    </ListItem>
  );
}

export default HomePage;
