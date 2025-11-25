import { useAuth } from '../contexts/AuthContext';
import { rtdb } from '../firebase/config';
import { ref, remove, set, onValue } from 'firebase/database';
import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

// Componentes e Ícones do MUI
import {
  Card, CardHeader, CardContent, CardActions, IconButton, Typography,
  Box, Menu, MenuItem, Avatar, Tooltip, Divider, Button,
  Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteIcon from '@mui/icons-material/Delete';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbUpOutlinedIcon from '@mui/icons-material/ThumbUpOutlined';

function Post({ postData, onAuthorClick, onPostDelete }) {
  const { currentUser } = useAuth();
  const { authorNickname, textContent, createdAt, mediaURL, mediaType, authorId, id, authorPhotoURL } = postData;
  
  const formattedDate = new Date(createdAt).toLocaleString('pt-BR');
  const isOwner = currentUser && currentUser.uid === authorId;

  const [likesData, setLikesData] = useState(postData.likes || {});
  const [anchorEl, setAnchorEl] = useState(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const openMenu = Boolean(anchorEl);

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
    onAuthorClick({ authorId: authorId, authorNickname: authorNickname });
  };

  const handleDeletePost = async () => {
    setConfirmDialogOpen(false); // Fechar o diálogo de confirmação
    try {
      const postRef = ref(rtdb, `posts/${id}`);
      await remove(postRef);
      if (onPostDelete) onPostDelete(id);
    } catch (error) {
      console.error("Erro ao apagar o post:", error);
      alert("Não foi possível apagar o post. Tente novamente.");
    }
  };

  const getOptimizedUrl = (url) => {
    if (!url) return '';
    return url.replace('upload', 'upload/a_auto,q_auto,f_auto');
  };

  const getVideoThumbnail = (videoUrl) => {
    if (!videoUrl) return '';
    const optimizedVideoUrl = getOptimizedUrl(videoUrl);
    return optimizedVideoUrl.substring(0, optimizedVideoUrl.lastIndexOf('.')) + '.jpg';
  };

  const likesCount = Object.keys(likesData).length;
  const hasLiked = currentUser && likesData[currentUser.uid];

  const handleLike = async () => {
    if (!currentUser) return;
    const postLikesRef = ref(rtdb, `posts/${id}/likes/${currentUser.uid}`);
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
    <>
      <Card sx={{ mb: 3 }}>
        <CardHeader
          avatar={<Avatar src={authorPhotoURL}>{!authorPhotoURL && authorNickname.charAt(0).toUpperCase()}</Avatar>}
          action={
            <>
              <Tooltip title="Ver opções"><IconButton onClick={handleMenuClick}><MoreVertIcon /></IconButton></Tooltip>
              <Menu anchorEl={anchorEl} open={openMenu} onClose={handleMenuClose}>
                <MenuItem onClick={handleAuthorClick}>Ver Perfil</MenuItem>
                {isOwner && <MenuItem onClick={() => { handleMenuClose(); setConfirmDialogOpen(true); }} sx={{ color: 'error.main' }}><DeleteIcon sx={{ mr: 1 }} /> Apagar Post</MenuItem>}
              </Menu>
            </>
          }
          title={authorNickname}
          subheader={formattedDate}
        />

        {mediaURL && (
          <Box sx={{ bgcolor: 'black', display: 'flex', justifyContent: 'center' }}>
            {mediaType === 'image' && (
              <Box component="img" src={getOptimizedUrl(mediaURL)} sx={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }} />
            )}
            {mediaType === 'video' && (
              <Box component="video" poster={getVideoThumbnail(mediaURL)} src={getOptimizedUrl(mediaURL)} controls playsInline sx={{ maxWidth: '100%', maxHeight: '80vh' }} />
            )}
          </Box>
        )}

        {textContent && (
          <CardContent>
            <Box sx={{ wordBreak: 'break-word' }}>
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

      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
      >
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Tem certeza de que deseja apagar este post? Esta ação não poderá ser desfeita.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleDeletePost} color="error" autoFocus>
            Apagar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default Post;
