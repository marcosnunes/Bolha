import { useAuth } from '../hooks/useAuth';
import { rtdb } from '../firebase/config';
import { ref, remove, set, onValue } from 'firebase/database';
import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

// Componentes e Ícones do MUI
import {
  Card, CardHeader, CardContent, CardActions, IconButton,
  Box, Menu, MenuItem, Avatar, Tooltip, Divider, Button
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteIcon from '@mui/icons-material/Delete';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbUpOutlinedIcon from '@mui/icons-material/ThumbUpOutlined';

function Post({ postData, onAuthorClick, onPostDelete }) {
  const { currentUser } = useAuth();
  
  // Desestruturamos os dados fixos do post
  const { 
    textContent, createdAt, mediaURL, mediaType, authorId, id, likes 
  } = postData;
  
  // ESTADO PARA DADOS DO PERFIL (Dinâmico)
  // Inicializamos com os dados que vieram no post para não ficar em branco enquanto carrega
  const [authorProfile, setAuthorProfile] = useState({
    nickname: postData.authorNickname,
    photoURL: postData.authorPhotoURL
  });

  const formattedDate = new Date(createdAt).toLocaleString('pt-BR');
  const isOwner = currentUser && currentUser.uid === authorId;

  // Estado para likes
  const [likesData, setLikesData] = useState(likes || {});
  
  const [anchorEl, setAnchorEl] = useState(null);
  const openMenu = Boolean(anchorEl);

  // 1. EFEITO: Escuta alterações no PERFIL do autor em tempo real
  useEffect(() => {
    const profileRef = ref(rtdb, `profiles/${authorId}`);
    
    const unsubscribeProfile = onValue(profileRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setAuthorProfile({
          nickname: data.nickname,
          photoURL: data.photoURL
        });
      }
    });

    return () => unsubscribeProfile();
  }, [authorId]);

  // 2. EFEITO: Escuta alterações nos LIKES em tempo real
  useEffect(() => {
    const likesRef = ref(rtdb, `posts/${id}/likes`);

    const unsubscribeLikes = onValue(likesRef, (snapshot) => {
      setLikesData(snapshot.val() || {});
    });

    return () => unsubscribeLikes();
  }, [id]);

  const handleMenuClick = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleAuthorClick = () => {
    handleMenuClose();
    // Passamos os dados mais atualizados do perfil
    onAuthorClick({ authorId: authorId, authorNickname: authorProfile.nickname });
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

  const handleLike = async () => {
    if (!currentUser) return;
    const uid = currentUser.uid;
    const postLikesRef = ref(rtdb, `posts/${id}/likes/${uid}`);

    try {
      if (hasLiked) {
        await remove(postLikesRef);
      } else {
        await set(postLikesRef, true);
      }
    } catch (error) {
      console.error("Erro ao curtir:", error);
    }
  };

  return (
    <Card sx={{ mb: 3 }}>
      <CardHeader
        // AQUI: Usamos o state authorProfile, que se atualiza sozinho
        avatar={
          <Avatar src={authorProfile.photoURL}>
            {!authorProfile.photoURL && authorProfile.nickname.charAt(0).toUpperCase()}
          </Avatar>
        }
        action={
          <>
            <Tooltip title="Ver opções"><IconButton onClick={handleMenuClick}><MoreVertIcon /></IconButton></Tooltip>
            <Menu anchorEl={anchorEl} open={openMenu} onClose={handleMenuClose}>
              <MenuItem onClick={handleAuthorClick}>Ver Perfil</MenuItem>
              {isOwner && <MenuItem onClick={handleDeletePost} sx={{ color: 'error.main' }}><DeleteIcon sx={{ mr: 1 }} /> Apagar Post</MenuItem>}
            </Menu>
          </>
        }
        title={authorProfile.nickname} // Nome também atualiza se mudar
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
      <CardActions sx={{ justifyContent: 'flex-start', p: 1 }}>
        <Button 
          startIcon={hasLiked ? <ThumbUpIcon /> : <ThumbUpOutlinedIcon />} 
          onClick={handleLike} 
          color={hasLiked ? 'primary' : 'inherit'}
        >
          {likesCount > 0 ? likesCount : 'Curtir'}
        </Button>
      </CardActions>
    </Card>
  );
}

export default Post;
