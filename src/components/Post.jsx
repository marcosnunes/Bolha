import { useAuth } from '../contexts/AuthContext';
import { rtdb } from '../firebase/config';
import { ref, remove, set, update } from 'firebase/database'; // ADICIONADO 'set' e 'update'
import { useState } from 'react';

// Componentes e Ícones do MUI
import {
  Card, CardHeader, CardContent, CardActions, IconButton, Typography,
  Box, Menu, MenuItem, Avatar, Tooltip, Divider, Button // ADICIONADO 'Divider' e 'Button'
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteIcon from '@mui/icons-material/Delete';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import ThumbUpOutlinedIcon from '@mui/icons-material/ThumbUpOutlined';
import ThumbDownOutlinedIcon from '@mui/icons-material/ThumbDownOutlined';

function Post({ postData, onAuthorClick }) {
  const { currentUser } = useAuth();
  // likes e dislikes são adicionados à desestruturação
  const { authorNickname, textContent, createdAt, mediaURL, mediaType, authorId, id, authorPhotoURL, likes, dislikes } = postData;
  const formattedDate = new Date(createdAt).toLocaleString('pt-BR');
  const isOwner = currentUser && currentUser.uid === authorId;

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

  // Lógica de curtidas corrigida e completa
  const likesCount = likes ? Object.keys(likes).length : 0;
  const hasLiked = currentUser && likes && likes[currentUser.uid];
  const hasDisliked = currentUser && dislikes && dislikes[currentUser.uid];

  const handleLike = async () => {
    if (!currentUser) return;
    const uid = currentUser.uid;
    const postLikesRef = ref(rtdb, `posts/${id}/likes/${uid}`);
    const postDislikesRef = ref(rtdb, `posts/${id}/dislikes/${uid}`);

    if (hasLiked) {
      await remove(postLikesRef);
    } else {
      await set(postLikesRef, true);
      if (hasDisliked) {
        await remove(postDislikesRef);
      }
    }
  };

  const handleDislike = async () => {
    if (!currentUser) return;
    const uid = currentUser.uid;
    const postLikesRef = ref(rtdb, `posts/${id}/likes/${uid}`);
    const postDislikesRef = ref(rtdb, `posts/${id}/dislikes/${uid}`);

    if (hasDisliked) {
      await remove(postDislikesRef);
    } else {
      await set(postDislikesRef, true);
      if (hasLiked) {
        await remove(postLikesRef);
      }
    }
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
            <Box component="img" src={mediaURL} sx={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }} />
          )}
          {mediaType === 'video' && (
            <Box component="video" poster={getVideoThumbnail(mediaURL)} src={mediaURL} controls sx={{ maxWidth: '100%', maxHeight: '80vh' }} />
          )}
        </Box>
      )}

      {textContent && (
        <CardContent>
          <Typography variant="body1" color="text.secondary">{textContent}</Typography>
        </CardContent>
      )}

      <Divider />
      <CardActions sx={{ justifyContent: 'space-around', p: 1 }}>
        <Button 
          startIcon={hasLiked ? <ThumbUpIcon /> : <ThumbUpOutlinedIcon />}
          onClick={handleLike}
          color={hasLiked ? 'primary' : 'inherit'}
        >
          {likesCount}
        </Button>
        <Button 
          startIcon={hasDisliked ? <ThumbDownIcon /> : <ThumbDownOutlinedIcon />}
          onClick={handleDislike}
          color={hasDisliked ? 'error' : 'inherit'}
        >
          Descurtir
        </Button>
      </CardActions>
    </Card>
  );
}

export default Post;
