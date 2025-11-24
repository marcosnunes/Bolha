import { useAuth } from '../contexts/AuthContext';
import { rtdb } from '../firebase/config';
import { ref, remove, set, onValue } from 'firebase/database';
import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

// Componentes e Ícones do MUI
import {
  Card, CardHeader, CardContent, CardActions, IconButton, Typography,
  Box, Menu, MenuItem, Avatar, Tooltip, Divider, Button
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteIcon from '@mui/icons-material/Delete';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import ThumbUpOutlinedIcon from '@mui/icons-material/ThumbUpOutlined';
import ThumbDownOutlinedIcon from '@mui/icons-material/ThumbDownOutlined';

function Post({ postData, onAuthorClick, onPostDelete }) {
  const { currentUser } = useAuth();
  const { authorNickname, textContent, createdAt, mediaURL, mediaType, authorId, id, authorPhotoURL } = postData;
  
  const formattedDate = new Date(createdAt).toLocaleString('pt-BR');
  const isOwner = currentUser && currentUser.uid === authorId;

  // Estados para gerenciar likes/dislikes em tempo real
  const [likesData, setLikesData] = useState(postData.likes || {});
  const [dislikesData, setDislikesData] = useState(postData.dislikes || {});

  const [anchorEl, setAnchorEl] = useState(null);
  const openMenu = Boolean(anchorEl);

  // Listener em tempo real
  useEffect(() => {
    const likesRef = ref(rtdb, `posts/${id}/likes`);
    const dislikesRef = ref(rtdb, `posts/${id}/dislikes`);

    const unsubscribeLikes = onValue(likesRef, (snapshot) => {
      setLikesData(snapshot.val() || {});
    });

    const unsubscribeDislikes = onValue(dislikesRef, (snapshot) => {
      setDislikesData(snapshot.val() || {});
    });

    return () => {
      unsubscribeLikes();
      unsubscribeDislikes();
    };
  }, [id]);

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
        
        if (onPostDelete) {
          onPostDelete(id);
        }
      } catch (error) {
        console.error("Erro ao apagar o post:", error);
        alert("Não foi possível apagar o post. Tente novamente.");
      }
    }
  };

  // Funções de URL do Cloudinary
  const getOptimizedUrl = (url, type) => {
    if (!url) return '';
    const transformation = 'upload/a_auto,q_auto,f_auto'; 
    return url.replace('upload', transformation);
  };

  const getVideoThumbnail = (videoUrl) => {
    if (!videoUrl) return '';
    const optimizedVideoUrl = getOptimizedUrl(videoUrl, 'video');
    return optimizedVideoUrl.substring(0, optimizedVideoUrl.lastIndexOf('.')) + '.jpg';
  };

  // Cálculos
  const likesCount = Object.keys(likesData).length;
  const hasLiked = currentUser && likesData[currentUser.uid];
  const hasDisliked = currentUser && dislikesData[currentUser.uid];

  const handleLike = async () => {
    if (!currentUser) return;
    const uid = currentUser.uid;
    const postLikesRef = ref(rtdb, `posts/${id}/likes/${uid}`);
    const postDislikesRef = ref(rtdb, `posts/${id}/dislikes/${uid}`);

    try {
      if (hasLiked) {
        await remove(postLikesRef);
      } else {
        await set(postLikesRef, true);
        if (hasDisliked) await remove(postDislikesRef);
      }
    } catch (error) {
      console.error("Erro ao curtir:", error);
    }
  };

  const handleDislike = async () => {
    if (!currentUser) return;
    const uid = currentUser.uid;
    const postLikesRef = ref(rtdb, `posts/${id}/likes/${uid}`);
    const postDislikesRef = ref(rtdb, `posts/${id}/dislikes/${uid}`);

    try {
      if (hasDisliked) {
        await remove(postDislikesRef);
      } else {
        await set(postDislikesRef, true);
        if (hasLiked) await remove(postLikesRef);
      }
    } catch (error) {
      console.error("Erro ao descurtir:", error);
    }
  };

  return (
    <Card sx={{ mb: 3 }}>
      <CardHeader
        avatar={<Avatar src={authorPhotoURL}>{!authorPhotoURL && authorNickname.charAt(0).toUpperCase()}</Avatar>}
        action={
          <>
            <Tooltip title="Ver opções"><IconButton onClick={handleMenuClick}><MoreVertIcon /></IconButton></Tooltip>
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
              src={getOptimizedUrl(mediaURL, 'image')} 
              sx={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }} 
            />
          )}
          {mediaType === 'video' && (
            <Box 
              component="video" 
              poster={getVideoThumbnail(mediaURL)} 
              src={getOptimizedUrl(mediaURL, 'video')} 
              controls 
              playsInline
              sx={{ maxWidth: '100%', maxHeight: '80vh' }} 
            />
          )}
        </Box>
      )}

      {textContent && (
        <CardContent>
          <Box sx={{ 
            color: 'text.secondary',
            typography: 'body1',
            '& p': { marginTop: 0, marginBottom: 1 },
            '& a': { color: 'primary.main', textDecoration: 'underline' },
            '& strong': { fontWeight: 600 },
            wordBreak: 'break-word'
          }}>
            <ReactMarkdown>{textContent}</ReactMarkdown>
          </Box>
        </CardContent>
      )}

      <Divider />
      <CardActions sx={{ justifyContent: 'flex-start', p: 1, gap: 1 }}>
        <Button 
          startIcon={hasLiked ? <ThumbUpIcon /> : <ThumbUpOutlinedIcon />} 
          onClick={handleLike} 
          color={hasLiked ? 'primary' : 'inherit'}
        >
          {likesCount > 0 ? likesCount : 'Curtir'}
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
