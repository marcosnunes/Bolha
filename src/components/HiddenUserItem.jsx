import { useState, useEffect } from 'react';
import { rtdb } from '../firebase/config';
import { ref, onValue } from 'firebase/database';
import ConfirmDialog from './ConfirmDialog'; // Importe o componente

// Componentes do MUI
import { 
  ListItem, ListItemText, ListItemSecondaryAction, 
  Skeleton, ListItemAvatar, Avatar, Button 
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';

function HiddenUserItem({ userId, onShowUser }) {
  const [userProfile, setUserProfile] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false); // Estado para o diálogo

  useEffect(() => {
    const profileRef = ref(rtdb, `profiles/${userId}`);
    const unsubscribe = onValue(profileRef, (snapshot) => {
      const data = snapshot.val();
      setUserProfile(data || { nickname: 'Usuário Desconhecido', photoURL: null });
    });
    return () => unsubscribe();
  }, [userId]);

  const handleConfirmShow = () => {
    onShowUser(userId);
    // O diálogo será fechado pelo seu próprio onConfirm
  };

  return (
    <>
      <ListItem divider>
        <ListItemAvatar>
          {userProfile ? (
            <Avatar src={userProfile.photoURL}>
              {!userProfile.photoURL && userProfile.nickname ? userProfile.nickname.charAt(0).toUpperCase() : '?'}
            </Avatar>
          ) : (
            <Skeleton variant="circular" width={40} height={40} />
          )}
        </ListItemAvatar>
        
        {userProfile ? (
          <ListItemText primary={userProfile.nickname} />
        ) : (
          <ListItemText primary={<Skeleton variant="text" width={120} />} />
        )}
        
        <ListItemSecondaryAction>
          {/* Botão agora abre o diálogo */}
          <Button 
            variant="outlined" 
            size="small" 
            startIcon={<VisibilityIcon />}
            onClick={() => setConfirmOpen(true)} 
          >
            Mostrar
          </Button>
        </ListItemSecondaryAction>
      </ListItem>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmShow}
        title="Reexibir Usuário"
        message={`Tem certeza de que deseja voltar a ver os posts de ${userProfile?.nickname || 'este usuário'}?`}
        confirmText="Reexibir"
        cancelText="Cancelar"
      />
    </>
  );
}

export default HiddenUserItem;
