import { useState, useEffect } from 'react';
import { rtdb } from '../firebase/config';
import { ref, onValue } from 'firebase/database';

// Componentes do MUI
import { 
  ListItem, ListItemText, ListItemSecondaryAction, 
  Skeleton, ListItemAvatar, Avatar, Button 
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';

function HiddenUserItem({ userId, onShowUser }) {
  const [userProfile, setUserProfile] = useState(null); // Agora vamos buscar o perfil inteiro

  useEffect(() => {
    const profileRef = ref(rtdb, `profiles/${userId}`);
    const unsubscribe = onValue(profileRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setUserProfile(data);
      } else {
        setUserProfile({ nickname: 'Usuário Desconhecido', photoURL: null });
      }
    });
    return () => unsubscribe();
  }, [userId]);

  return (
    <ListItem divider>
      <ListItemAvatar>
        {userProfile ? (
          <Avatar src={userProfile.photoURL}>
            {!userProfile.photoURL && userProfile.nickname.charAt(0).toUpperCase()}
          </Avatar>
        ) : (
          <Skeleton variant="circular" width={40} height={40} />
        )}
      </ListItemAvatar>
      
      {userProfile ? (
        <ListItemText 
          primary={userProfile.nickname} 
        />
      ) : (
        <ListItemText 
          primary={<Skeleton variant="text" width={120} />} 
        />
      )}
      
      <ListItemSecondaryAction>
        <Button 
          variant="outlined" 
          size="small" 
          startIcon={<VisibilityIcon />}
          onClick={() => onShowUser(userId)}
        >
          Mostrar
        </Button>
      </ListItemSecondaryAction>
    </ListItem>
  );
}

export default HiddenUserItem;