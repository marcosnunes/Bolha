import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { rtdb } from '../firebase/config';
import { ref, onValue } from 'firebase/database';

import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  Button, Box, Avatar, Typography, Skeleton
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VisibilityIcon from '@mui/icons-material/Visibility';

// Recebemos a nova prop 'onEditProfile'
function ProfileModal({ userToDisplay, onClose, onHideUser, onShowUser, onEditProfile }) {
  const { hiddenUsers, currentUser } = useAuth();
  const [userProfile, setUserProfile] = useState(null);
  
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
            // AQUI: Chamamos a função do pai passando os dados atuais
            onClick={() => onEditProfile(userProfile)}
          >
            Editar Perfil
          </Button>
        ) : (
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
  );
}

export default ProfileModal;
