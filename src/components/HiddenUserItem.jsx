import { useState, useEffect } from 'react';
import { rtdb } from '../firebase/config';
import { ref, onValue } from 'firebase/database';

// Componentes do MUI
import { ListItem, ListItemText, ListItemSecondaryAction, IconButton, Tooltip, Skeleton } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';

function HiddenUserItem({ userId, onShowUser }) {
  const [nickname, setNickname] = useState(null);

  useEffect(() => {
    const profileRef = ref(rtdb, `profiles/${userId}`);
    const unsubscribe = onValue(profileRef, (snapshot) => {
      const data = snapshot.val();
      setNickname(data && data.nickname ? data.nickname : 'Usuário Desconhecido');
    });
    return () => unsubscribe();
  }, [userId]);

  return (
    <ListItem divider>
      {nickname ? (
        <ListItemText primary={nickname} secondary={`ID: ${userId}`} />
      ) : (
        // Mostra um esqueleto de carregamento enquanto busca o nome
        <Skeleton variant="text" width={150} />
      )}
      <ListItemSecondaryAction>
        <Tooltip title="Mostrar Usuário">
          <IconButton edge="end" aria-label="mostrar" onClick={() => onShowUser(userId)}>
            <VisibilityIcon />
          </IconButton>
        </Tooltip>
      </ListItemSecondaryAction>
    </ListItem>
  );
}

export default HiddenUserItem;