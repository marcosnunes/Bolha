import { useState, useEffect } from 'react'; // Adicionar useState e useEffect
import { useAuth } from '../contexts/AuthContext';
import { rtdb } from '../firebase/config'; // Importar rtdb
import { ref, onValue } from 'firebase/database'; // Importar ref e onValue

// Componentes do MUI
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  Button, Box, Avatar, Typography, Skeleton // Importar Skeleton
} from '@mui/material';

function ProfileModal({ userToDisplay, onClose, onHideUser, onShowUser }) {
  const { hiddenUsers } = useAuth();
  const [userProfile, setUserProfile] = useState(null); // Estado para guardar o perfil do usuário exibido

  const open = Boolean(userToDisplay);

  // Efeito para buscar o perfil do usuário quando o modal abre
  useEffect(() => {
    // Se não há usuário para exibir, não faz nada (adiando o setState para evitar render cascades)
    if (!userToDisplay) {
      const timer = setTimeout(() => setUserProfile(null), 0); // Limpa o perfil anterior de forma assíncrona
      return () => clearTimeout(timer);
    }

    // Busca o perfil do usuário no RTDB
    const profileRef = ref(rtdb, `profiles/${userToDisplay.authorId}`);
    const unsubscribe = onValue(profileRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setUserProfile(data);
      } else {
        // Fallback se o perfil não for encontrado
        setUserProfile({ nickname: userToDisplay.authorNickname, photoURL: null });
      }
    });

    // Limpa a escuta quando o modal fecha ou o usuário muda
    return () => unsubscribe();
  }, [userToDisplay]); // Roda sempre que o 'userToDisplay' mudar

  if (!open) {
    return null;
  }

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
    <Dialog open={open} onClose={onClose}>
      <DialogTitle align="center">Perfil do Usuário</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, p: 2, minWidth: 240 }}>
          {userProfile ? (
            <Avatar 
              src={userProfile.photoURL} // Usa a photoURL do perfil buscado
              sx={{ width: 80, height: 80 }}
            >
              {userProfile.nickname.charAt(0).toUpperCase()}
            </Avatar>
          ) : (
            // Mostra um esqueleto enquanto o perfil carrega
            <Skeleton variant="circular" width={80} height={80} />
          )}
          
          <Typography variant="h6">
            {userProfile ? userProfile.nickname : <Skeleton variant="text" width={120} />}
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{justifyContent: 'center', pb: 2}}>
        <Button onClick={handleHideToggle} color={isHidden ? 'success' : 'error'} variant="contained">
          {isHidden ? 'Mostrar Posts' : 'Ocultar Posts'}
        </Button>
        <Button onClick={onClose} variant="outlined">Fechar</Button>
      </DialogActions>
    </Dialog>
  );
}

export default ProfileModal;