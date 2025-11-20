import { useAuth } from '../contexts/AuthContext';

import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  Button, Box, Avatar, Typography 
} from '@mui/material';

function ProfileModal({ userToDisplay, onClose, onHideUser, onShowUser }) {
  const { hiddenUsers } = useAuth();
  
  const open = Boolean(userToDisplay);
  
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
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, p: 2 }}>
          <Avatar 
            sx={{ width: 80, height: 80, bgcolor: 'secondary.main' }}
          >
            {userToDisplay.authorNickname.charAt(0).toUpperCase()}
          </Avatar>
          <Typography variant="h6">{userToDisplay.authorNickname}</Typography>
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