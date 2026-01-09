import { useAuth } from '../contexts/AuthContext';
import { rtdb } from '../firebase/config';
import { ref, remove, set, onValue, get } from 'firebase/database';
import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import ConfirmDialog from './ConfirmDialog'; // Importa nosso componente reutilizável
import CommentModal from './CommentModal.jsx'; // Importa modal de comentários
import EditPostModal from './EditPostModal.jsx'; // Importa modal de edição de posts
import VerificationBadge from './VerificationBadge.jsx'; // Importa badge de verificação

// Componentes e Ícones do MUI
import {
  Card, CardHeader, CardContent, CardActions, IconButton, Typography,
  Box, Menu, MenuItem, Avatar, Tooltip, Divider, Button, Dialog,
  DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemAvatar, ListItemText
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbUpOutlinedIcon from '@mui/icons-material/ThumbUpOutlined';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';

function Post({ postData, onAuthorClick, onPostDelete }) {
  const { currentUser } = useAuth();
  const { authorNickname, textContent, createdAt, mediaURL, mediaType, authorId, id, authorPhotoURL } = postData;
  
  const formattedDate = new Date(createdAt).toLocaleString('pt-BR');
  const isOwner = currentUser && currentUser.uid === authorId;

  const [likesData, setLikesData] = useState(postData.likes || {});
  const [profilePhotoURL, setProfilePhotoURL] = useState(authorPhotoURL || null);
  const [displayNickname, setDisplayNickname] = useState(authorNickname || '');
  const [isVerified, setIsVerified] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const [likesModalOpen, setLikesModalOpen] = useState(false);
  const [likesUsers, setLikesUsers] = useState([]);
  const [loadingLikes, setLoadingLikes] = useState(false);
  const [displayContent, setDisplayContent] = useState(textContent);
  const openMenu = Boolean(anchorEl);

  // Monitorar mudanças no conteúdo do post (incluindo edições)
  useEffect(() => {
    const postRef = ref(rtdb, `posts/${id}`);
    const unsubscribePost = onValue(postRef, (snapshot) => {
      const postUpdated = snapshot.val();
      if (postUpdated && postUpdated.textContent) {
        setDisplayContent(postUpdated.textContent);
      }
    });
    return () => unsubscribePost();
  }, [id]);

  useEffect(() => {
    const likesRef = ref(rtdb, `posts/${id}/likes`);
    const unsubscribeLikes = onValue(likesRef, (snapshot) => {
      setLikesData(snapshot.val() || {});
    });
    return () => unsubscribeLikes();
  }, [id]);

  // Carregar contador de comentários
  useEffect(() => {
    const loadCommentCount = async () => {
      try {
        const commentsRef = ref(rtdb, `posts/${id}/comments`);
        const snapshot = await get(commentsRef);
        if (snapshot.exists()) {
          setCommentCount(Object.keys(snapshot.val()).length);
        } else {
          setCommentCount(0);
        }
      } catch (error) {
        console.error("Erro ao carregar comentários:", error);
      }
    };

    loadCommentCount();

    // Listener em tempo real para atualizar contador
    const commentsRef = ref(rtdb, `posts/${id}/comments`);
    const unsubscribe = onValue(commentsRef, (snapshot) => {
      setCommentCount(snapshot.exists() ? Object.keys(snapshot.val()).length : 0);
    });

    return () => unsubscribe();
  }, [id]);

  // Listen for profile changes (nickname and photoURL) and prefer them over stored values
  useEffect(() => {
    if (!authorId) return undefined;
    const profileRef = ref(rtdb, `profiles/${authorId}`);
    const unsubscribeProfile = onValue(profileRef, (snapshot) => {
      const val = snapshot.val() || {};
      setProfilePhotoURL(val.photoURL || authorPhotoURL || null);
      setDisplayNickname(val.nickname || authorNickname || '');
      setIsVerified(val.isVerified || false);
    });

    return () => unsubscribeProfile();
  }, [authorId, authorPhotoURL, authorNickname]);

  

  const handleMenuClick = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleAuthorClick = () => {
    handleMenuClose();
    onAuthorClick({ authorId: authorId, authorNickname: authorNickname });
  };

  const handleDeletePost = async () => {
    // A lógica de fechar o diálogo é movida para o componente ConfirmDialog
    try {
      const postRef = ref(rtdb, `posts/${id}`);
      await remove(postRef);
      if (onPostDelete) onPostDelete(id);
    } catch (error) {
      console.error("Erro ao apagar o post:", error);
      // Idealmente, mostrar um snackbar de erro aqui
    }
  };

  const getOptimizedUrl = (url) => url ? url.replace('upload', 'upload/a_auto,q_auto,f_auto') : '';

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

  const handleOpenLikesModal = async () => {
    if (likesCount === 0) return;
    setLikesModalOpen(true);
    setLoadingLikes(true);
    
    try {
      const userIds = Object.keys(likesData);
      const usersData = await Promise.all(
        userIds.map(async (uid) => {
          const profileRef = ref(rtdb, `profiles/${uid}`);
          const snapshot = await get(profileRef);
          const profile = snapshot.val() || {};
          return {
            uid,
            nickname: profile.nickname || 'Usuário',
            photoURL: profile.photoURL || null,
            isVerified: profile.isVerified || false
          };
        })
      );
      setLikesUsers(usersData);
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
    } finally {
      setLoadingLikes(false);
    }
  };

  const getLikesTooltipText = () => {
    const userIds = Object.keys(likesData);
    if (userIds.length === 0) return '';
    if (userIds.length <= 3) {
      return likesUsers.map(u => u.nickname).join(', ');
    }
    return `${likesUsers.slice(0, 3).map(u => u.nickname).join(', ')} e mais ${userIds.length - 3}`;
  };

  // Carregar nicknames para tooltip quando houver curtidas
  useEffect(() => {
    const loadNicknamesForTooltip = async () => {
      const userIds = Object.keys(likesData);
      if (userIds.length === 0) {
        setLikesUsers([]);
        return;
      }
      
      try {
        const usersData = await Promise.all(
          userIds.slice(0, 3).map(async (uid) => {
            const profileRef = ref(rtdb, `profiles/${uid}`);
            const snapshot = await get(profileRef);
            const profile = snapshot.val() || {};
            return {
              uid,
              nickname: profile.nickname || 'Usuário',
              photoURL: profile.photoURL || null
            };
          })
        );
        setLikesUsers(usersData);
      } catch (error) {
        console.error("Erro ao carregar nomes:", error);
      }
    };

    loadNicknamesForTooltip();
  }, [likesData]);

  return (
    <>
      <Card sx={{ mb: 3 }}>
          <CardHeader
          avatar={
            <Box sx={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
              <Avatar src={profilePhotoURL} sx={{ width: 48, height: 48 }}>{!profilePhotoURL && (displayNickname || authorNickname).charAt(0).toUpperCase()}</Avatar>
              <VerificationBadge isVerified={isVerified} avatarSize={48} customSx={{ bottom: '-3px', right: '-3px' }} />
            </Box>
          }
          action={
            <>
              <Tooltip title="Ver opções"><IconButton onClick={handleMenuClick}><MoreVertIcon /></IconButton></Tooltip>
              <Menu anchorEl={anchorEl} open={openMenu} onClose={handleMenuClose}>
                <MenuItem onClick={handleAuthorClick}>Ver Perfil</MenuItem>
                {isOwner && <MenuItem onClick={() => { handleMenuClose(); setEditModalOpen(true); }}><EditIcon sx={{ mr: 1 }} /> Editar Post</MenuItem>}
                {isOwner && <MenuItem onClick={() => { handleMenuClose(); setConfirmDialogOpen(true); }} sx={{ color: 'error.main' }}><DeleteIcon sx={{ mr: 1 }} /> Apagar Post</MenuItem>}
              </Menu>
            </>
          }
          title={displayNickname || authorNickname}
          subheader={formattedDate}
        />

        {mediaURL && (
          <Box sx={{ bgcolor: 'white', display: 'flex', justifyContent: 'center' }}>
            {mediaType === 'image' && (
              <Box component="img" src={getOptimizedUrl(mediaURL)} sx={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }} />
            )}
            {mediaType === 'video' && (
              <Box component="video" poster={getVideoThumbnail(mediaURL)} src={getOptimizedUrl(mediaURL)} controls playsInline sx={{ maxWidth: '100%', maxHeight: '80vh' }} />
            )}
          </Box>
        )}

        {displayContent && (
          <CardContent>
            <Box sx={{ wordBreak: 'break-word' }}>
              <ReactMarkdown>{displayContent}</ReactMarkdown>
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
            Curtir
          </Button>

          {likesCount > 0 && (
            <Tooltip title={getLikesTooltipText()} arrow>
              <Box 
                onClick={handleOpenLikesModal}
                sx={{ 
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  px: 2,
                  py: 1,
                  ml: 1,
                  borderRadius: 1,
                  '&:hover': { 
                    backgroundColor: 'action.hover',
                    textDecoration: 'underline'
                  },
                  minWidth: '44px',
                  minHeight: '44px',
                  justifyContent: 'center'
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  {likesCount}
                </Typography>
              </Box>
            </Tooltip>
          )}

          <Button
            startIcon={<ChatBubbleOutlineIcon />}
            onClick={() => setCommentModalOpen(true)}
            color="inherit"
          >
            {commentCount > 0 ? commentCount : 'Comentar'}
          </Button>
        </CardActions>
      </Card>

      {/* Modal de comentários */}
      <CommentModal
        postId={id}
        open={commentModalOpen}
        onClose={() => setCommentModalOpen(false)}
      />

      {/* Modal de curtidas */}
      <Dialog 
        open={likesModalOpen} 
        onClose={() => setLikesModalOpen(false)} 
        fullWidth 
        maxWidth="sm"
      >
        <DialogTitle>Curtidas ({likesCount})</DialogTitle>
        <DialogContent dividers>
          {loadingLikes ? (
            <Typography align="center" sx={{ py: 2 }}>Carregando...</Typography>
          ) : (
            <List>
              {likesUsers.map((user) => (
                <ListItem key={user.uid}>
                  <ListItemAvatar>
                    <Box sx={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
                      <Avatar src={user.photoURL} alt={user.nickname}>
                        {!user.photoURL && user.nickname ? user.nickname.charAt(0).toUpperCase() : '?'}
                      </Avatar>
                      <VerificationBadge isVerified={user.isVerified || false} avatarSize={40} customSx={{ bottom: '-2.5px', right: '-2.5px' }} />
                    </Box>
                  </ListItemAvatar>
                  <ListItemText primary={user.nickname} />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLikesModalOpen(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>

      {/* Modal de edição de post */}
      <EditPostModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        postId={id}
        currentContent={displayContent}
        onEditSuccess={() => {}}
      />

      {/* Substituído pelo diálogo de confirmação reutilizável */}
      <ConfirmDialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        onConfirm={handleDeletePost}
        title="Confirmar Exclusão"
        message="Tem certeza de que deseja apagar este post? Esta ação não poderá ser desfeita."
        confirmText="Apagar"
        cancelText="Cancelar"
      />
    </>
  );
}

export default Post;
