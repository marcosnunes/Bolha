import { useAuth } from '../contexts/AuthContext';
import { rtdb } from '../firebase/config';
import { ref, remove } from 'firebase/database';
import { useState } from 'react'; // Apenas useState é necessário

// Componentes e Ícones do MUI
import {
  Card, CardHeader, CardContent, IconButton, Typography,
  Box, Menu, MenuItem, Avatar, Tooltip
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteIcon from '@mui/icons-material/Delete';

function Post({ postData, onAuthorClick }) {
  const { currentUser } = useAuth();
  const { authorNickname, textContent, createdAt, mediaURL, mediaType, authorId, id, authorPhotoURL } = postData;
  const formattedDate = new Date(createdAt).toLocaleString('pt-BR');
  const isOwner = currentUser && currentUser.uid === authorId;

  // Apenas o estado para o menu de opções é necessário agora
  const [anchorEl, setAnchorEl] = useState(null);
  const openMenu = Boolean(anchorEl);

  const handleMenuClick = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleAuthorClick = () => {
    handleMenuClose();
    onAuthorClick({ authorId: authorId, authorNickname: authorNickname });
  };

  const handleDeletePost = async () => {
    handleMenuClose();
    if (window.confirm("Tem certeza de que deseja apagar este post?")) {
      try {
        const postRef = ref(rtdb, `posts/${id}`);
        await remove(postRef);
      } catch (error) {
        console.error("Erro ao apagar o post:", error);
        alert("Não foi possível apagar o post. Tente novamente.");
      }
    }
  };

  const getVideoThumbnail = (videoUrl) => {
    if (!videoUrl) return '';
    return videoUrl.replace(/\.\w+$/, '.jpg');
  };

  return (
    <Card sx={{ mb: 3 }}>
      <CardHeader
        avatar={<Avatar src={authorPhotoURL}>{!authorPhotoURL && authorNickname.charAt(0).toUpperCase()}</Avatar>}
        action={
          <>
            <Tooltip title="Ver opções">
              <IconButton aria-label="settings" onClick={handleMenuClick}><MoreVertIcon /></IconButton>
            </Tooltip>
            <Menu anchorEl={anchorEl} open={openMenu} onClose={handleMenuClose}>
              <MenuItem onClick={handleAuthorClick}>Ver Perfil</MenuItem>
              {isOwner && <MenuItem onClick={handleDeletePost} sx={{ color: 'error.main' }}><DeleteIcon sx={{ mr: 1 }} /> Apagar Post</MenuItem>}
            </Menu>
          </>
        }
        title={authorNickname}
        subheader={formattedDate}
      />

      {mediaURL && (
        <Box sx={{ bgcolor: 'black', display: 'flex', justifyContent: 'center' }}>
          {mediaType === 'image' && (
            <Box
              component="img"
              src={mediaURL}
              sx={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }}
            />
          )}

          {mediaType === 'video' && (
            <Box
              component="video"
              poster={getVideoThumbnail(mediaURL)}
              src={mediaURL}
              controls
              sx={{ maxWidth: '100%', maxHeight: '80vh' }}
            />
          )}
        </Box>
      )}

      {textContent && (
        <CardContent>
          <Typography variant="body1" color="text.secondary">{textContent}</Typography>
        </CardContent>
      )}
    </Card>
  );
}

export default Post;