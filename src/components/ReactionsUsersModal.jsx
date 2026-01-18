import { useState, useEffect } from 'react';
import { rtdb } from '../firebase/config';
import { ref, get } from 'firebase/database';
import {
  Dialog, DialogTitle, DialogContent, List, ListItem, ListItemAvatar, ListItemText,
  Avatar, Typography, Box, CircularProgress
} from '@mui/material';
import { REACTIONS } from './ReactionSelector';

function ReactionsUsersModal({ open, onClose, reactionType, userIds = [] }) {
  const [usersData, setUsersData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || userIds.length === 0) return;

    const loadUsersData = async () => {
      setLoading(true);
      try {
        const users = [];
        
        for (const uid of userIds) {
          try {
            const profileRef = ref(rtdb, `profiles/${uid}`);
            const profileSnapshot = await get(profileRef);
            
            if (profileSnapshot.exists()) {
              const profile = profileSnapshot.val();
              users.push({
                uid,
                nickname: profile.nickname || 'Usuário Desconhecido',
                photoURL: profile.photoURL || null,
              });
            } else {
              users.push({
                uid,
                nickname: 'Usuário Desconhecido',
                photoURL: null,
              });
            }
          } catch (error) {
            console.error(`Erro ao carregar perfil do usuário ${uid}:`, error);
            users.push({
              uid,
              nickname: 'Usuário Desconhecido',
              photoURL: null,
            });
          }
        }
        
        setUsersData(users);
      } catch (error) {
        console.error('Erro ao carregar dados dos usuários:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUsersData();
  }, [open, userIds, reactionType]);

  // Encontrar emoji e label
  const reaction = REACTIONS.find(r => r.value === reactionType);
  const emoji = reaction?.emoji || '❤️';
  const label = reaction?.label || 'Reações';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <span>{emoji} {label}</span>
        <Typography variant="body2" color="text.secondary">
          ({userIds.length})
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ pt: 1, maxHeight: '60vh', overflow: 'auto' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={40} />
          </Box>
        ) : usersData.length === 0 ? (
          <Typography color="text.secondary" sx={{ py: 2 }}>
            Nenhum usuário para exibir
          </Typography>
        ) : (
          <List sx={{ width: '100%' }}>
            {usersData.map((user) => (
              <ListItem key={user.uid} sx={{ px: 0 }}>
                <ListItemAvatar>
                  <Avatar
                    src={user.photoURL}
                    sx={{ width: 40, height: 40 }}
                  >
                    {!user.photoURL && user.nickname?.charAt(0).toUpperCase()}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={user.nickname}
                  sx={{
                    '& .MuiListItemText-primary': {
                      fontWeight: '500',
                    },
                  }}
                />
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ReactionsUsersModal;
