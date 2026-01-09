import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { rtdb } from '../firebase/config';
import { ref, onValue } from 'firebase/database';
import ConfirmDialog from './ConfirmDialog'; // Importe o novo componente
import VerificationBadge from './VerificationBadge.jsx'; // Importe badge de verificação

import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  Button, Box, Avatar, Typography, Skeleton
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VisibilityIcon from '@mui/icons-material/Visibility';

function ProfileModal({ userToDisplay, onClose, onHideUser, onShowUser, onEditProfile }) {
  const { hiddenUsers, currentUser } = useAuth();
  const [userProfile, setUserProfile] = useState(null);
  // Estado para controlar o diálogo de confirmação
  const [confirmOpen, setConfirmOpen] = useState(false);
  
  const open = Boolean(userToDisplay);
  const isMe = currentUser && userToDisplay && currentUser.uid === userToDisplay.authorId;

  useEffect(() => {
    if (!userToDisplay) {
      const timer = setTimeout(() => setUserProfile(null), 0);
      return () => clearTimeout(timer);
    }

    const profileRef = ref(rtdb, `profiles/${userToDisplay.authorId}`);
    const unsubscribe = onValue(profileRef, (snapshot) => {
      const data = snapshot.val();
      setUserProfile(data || { nickname: userToDisplay.authorNickname, photoURL: null });
    });
    return () => unsubscribe();
  }, [userToDisplay]);

  if (!open) return null;

  const isHidden = hiddenUsers.includes(userToDisplay.authorId);

  // Ação a ser executada na confirmação
  const handleConfirmHideToggle = () => {
    if (isHidden) {
      onShowUser(userToDisplay.authorId);
    } else {
      onHideUser(userToDisplay.authorId);
    }
    setConfirmOpen(false); // Fecha o diálogo de confirmação
    onClose(); // Fecha o modal de perfil
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
        <DialogTitle align="center">
          {isMe ? "Meu Perfil" : "Perfil do Usuário"}
        </DialogTitle>
        
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, p: 2 }}>
            {userProfile ? (
              <Box sx={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
                <Avatar 
                  src={userProfile.photoURL} 
                  sx={{ width: 100, height: 100, bgcolor: 'primary.main', fontSize: '2.5rem' }}
                >
                  {!userProfile.photoURL && userProfile.nickname.charAt(0).toUpperCase()}
                </Avatar>
                <VerificationBadge isVerified={userProfile.isVerified} avatarSize={100} customSx={{ bottom: '8px', right: '8px' }} />
              </Box>
            ) : (
              <Skeleton variant="circular" width={100} height={100} />
            )}
            
            <Typography variant="h5" fontWeight="bold">
              {userProfile ? userProfile.nickname : <Skeleton variant="text" width={150} />}
            </Typography>
            
            {isMe && (
              <Typography variant="body2" color="text.secondary">
                {currentUser.email}
              </Typography>
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ justifyContent: 'center', pb: 3, gap: 1 }}>
          {isMe ? (
            <Button 
              variant="contained" 
              startIcon={<EditIcon />}
              onClick={() => onEditProfile(userProfile)}
            >
              Editar Perfil
            </Button>
          ) : (
            // O botão agora abre o diálogo de confirmação
            <Button 
              onClick={() => setConfirmOpen(true)} 
              color={isHidden ? 'success' : 'error'} 
              variant="contained"
              startIcon={isHidden ? <VisibilityIcon /> : <VisibilityOffIcon />}
            >
              {isHidden ? 'Mostrar Posts' : 'Ocultar Posts'}
            </Button>
          )}
          
          <Button onClick={onClose} variant="outlined">Fechar</Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de confirmação reutilizável */}
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmHideToggle}
        title={isHidden ? "Reexibir Usuário" : "Ocultar Usuário"}
        message={`Você tem certeza que deseja ${isHidden ? 'reexibir os posts' : 'ocultar todos os posts'} deste usuário? Esta ação pode ser desfeita.`}
        confirmText={isHidden ? "Reexibir" : "Ocultar"}
      />
    </>
  );
}

export default ProfileModal;
