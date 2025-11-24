import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { rtdb } from '../firebase/config';
import { ref, onValue } from 'firebase/database';

// Componentes do MUI
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  Button, Box, Avatar, Typography, Skeleton
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VisibilityIcon from '@mui/icons-material/Visibility';

// Importar o novo modal de edição
import EditProfileModal from './EditProfileModal';

function ProfileModal({ userToDisplay, onClose, onHideUser, onShowUser }) {
  const { hiddenUsers, currentUser } = useAuth();
  const [userProfile, setUserProfile] = useState(null);
  
  // Estado para controlar o modal de edição
  const [isEditOpen, setIsEditOpen] = useState(false);

  const open = Boolean(userToDisplay);

  // Verifica se o perfil sendo exibido é o do próprio usuário logado
  const isMe = currentUser && userToDisplay && currentUser.uid === userToDisplay.authorId;

  useEffect(() => {
    if (!userToDisplay) {
      const timer = setTimeout(() => setUserProfile(null), 0);
      return () => clearTimeout(timer);
    }

    const profileRef = ref(rtdb, `profiles/${userToDisplay.authorId}`);
    const unsubscribe = onValue(profileRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setUserProfile(data);
      } else {
        setUserProfile({ nickname: userToDisplay.authorNickname, photoURL: null });
      }
    });

    return () => unsubscribe();
  }, [userToDisplay]);

  if (!open) return null;

  const isHidden = hiddenUsers.includes(userToDisplay.authorId);

  const handleHideToggle = () => {
    if (isHidden) {
      onShowUser(userToDisplay.authorId);
    } else {
      onHideUser(userToDisplay.authorId);
    }
    onClose();
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
              <Avatar 
                src={userProfile.photoURL} 
                sx={{ width: 100, height: 100, bgcolor: 'primary.main', fontSize: '2.5rem' }}
              >
                {!userProfile.photoURL && userProfile.nickname.charAt(0).toUpperCase()}
              </Avatar>
            ) : (
              <Skeleton variant="circular" width={100} height={100} />
            )}
            
            <Typography variant="h5" fontWeight="bold">
              {userProfile ? userProfile.nickname : <Skeleton variant="text" width={150} />}
            </Typography>
            
            {/* Se for eu, mostro meu email. Se for outro, pode ser ocultado por privacidade */}
            {isMe && (
              <Typography variant="body2" color="text.secondary">
                {currentUser.email}
              </Typography>
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ justifyContent: 'center', pb: 3, gap: 1 }}>
          {isMe ? (
            // --- BOTÃO DE EDITAR (SÓ PARA MIM) ---
            <Button 
              variant="contained" 
              startIcon={<EditIcon />}
              onClick={() => { onClose(); setIsEditOpen(true); }}
            >
              Editar Perfil
            </Button>
          ) : (
            // --- BOTÃO DE OCULTAR/MOSTRAR (SÓ PARA OUTROS) ---
            <Button 
              onClick={handleHideToggle} 
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

      {/* Renderiza o modal de edição condicionalmente */}
      {isMe && userProfile && (
        <EditProfileModal 
          open={isEditOpen} 
          onClose={() => setIsEditOpen(false)}
          currentNickname={userProfile.nickname}
          currentPhotoURL={userProfile.photoURL}
        />
      )}
    </>
  );
}

export default ProfileModal;
