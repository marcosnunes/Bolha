import { useAuth } from '../contexts/AuthContext';
import { rtdb } from '../firebase/config';
import { ref, remove } from 'firebase/database';
import { useState } from 'react';

// Componentes e Ícones do MUI
import { 
  Card, CardHeader, CardContent, CardMedia, CardActions, 
  IconButton, Typography, Box, Menu, MenuItem 
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import DeleteIcon from '@mui/icons-material/Delete';

function Post({ postData, onAuthorClick }) {
  const { currentUser } = useAuth();
  const { authorNickname, textContent, createdAt, mediaURL, mediaType, authorId, id } = postData;
  const formattedDate = new Date(createdAt).toLocaleString('pt-BR');
  const isOwner = currentUser && currentUser.uid === authorId;
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  
  // Lógica para o menu de opções (apagar post)
  const [anchorEl, setAnchorEl] = useState(null);
  const openMenu = Boolean(anchorEl);
  const handleMenuClick = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  // Funções auxiliares
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
        action={
          <>
            <IconButton aria-label="settings" onClick={handleMenuClick}>
              <MoreVertIcon />
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={openMenu}
              onClose={handleMenuClose}
            >
              <MenuItem onClick={handleAuthorClick}>Ver Perfil</MenuItem>
              {isOwner && <MenuItem onClick={handleDeletePost} sx={{color: 'error.main'}}><DeleteIcon fontSize="small" sx={{mr: 1}}/> Apagar Post</MenuItem>}
            </Menu>
          </>
        }
        title={authorNickname}
        subheader={formattedDate}
      />

      {mediaURL && (
        <Box sx={{ position: 'relative', backgroundColor: '#e0e0e0' }}>
          {!isVideoPlaying ? (
            <Box onClick={() => mediaType === 'video' && setIsVideoPlaying(true)} sx={{ cursor: mediaType === 'video' ? 'pointer' : 'default' }}>
              <CardMedia
                component="img"
                image={mediaType === 'image' ? mediaURL : getVideoThumbnail(mediaURL)}
                alt="Conteúdo do post"
                sx={{ maxHeight: '75vh', objectFit: 'contain' }}
              />
              {mediaType === 'video' && (
                <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <PlayCircleOutlineIcon sx={{ fontSize: 80, color: 'white', textShadow: '0 0 10px rgba(0,0,0,0.7)' }} />
                </Box>
              )}
            </Box>
          ) : (
            <CardMedia
              component="video"
              src={mediaURL}
              controls
              autoPlay
              onEnded={() => setIsVideoPlaying(false)}
              onPause={(e) => { if (e.target.currentTime < e.target.duration) setIsVideoPlaying(false); }}
              sx={{ maxHeight: '75vh', width: '100%' }}
            />
          )}
        </Box>
      )}
      
      {textContent && (
        <CardContent>
          <Typography variant="body1" color="text.secondary">
            {textContent}
          </Typography>
        </CardContent>
      )}
    </Card>
  );
}

export default Post;