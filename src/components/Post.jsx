import { useAuth } from '../contexts/AuthContext';
import { rtdb } from '../firebase/config';
import { ref, remove, set, onValue, get, update, serverTimestamp } from 'firebase/database';
import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import ConfirmDialog from './ConfirmDialog'; // Importa nosso componente reutilizável
import CommentModal from './CommentModal.jsx'; // Importa modal de comentários
import EditPostModal from './EditPostModal.jsx'; // Importa modal de edição de posts
import VerificationBadge from './VerificationBadge.jsx'; // Importa badge de verificação
import OnlineIndicator from './OnlineIndicator.jsx'; // Importa indicador de online
import useOnlineStatus from '../hooks/useOnlineStatus.jsx'; // Hook para status de online
import ReactionSelector from './ReactionSelector.jsx'; // Seletor de reactions
import ReactionDisplay from './ReactionDisplay.jsx'; // Exibidor de reactions
import ReactionsUsersModal from './ReactionsUsersModal.jsx'; // Modal de usuários que reagiram

// Componentes e Ícones do MUI
import {
  Card, CardHeader, CardContent, CardActions, IconButton, Typography,
  Box, Menu, MenuItem, Avatar, Tooltip, Divider, Button, Dialog,
  DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemAvatar, ListItemText
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';

function Post({ postData, onAuthorClick, onPostDelete }) {
  const { currentUser } = useAuth();
  const { authorNickname, textContent, createdAt, mediaURL, mediaType, authorId, id, authorPhotoURL } = postData;
  
  const formattedDate = new Date(createdAt).toLocaleString('pt-BR');
  const isOwner = currentUser && currentUser.uid === authorId;

  const [reactionsData, setReactionsData] = useState(postData.reactions || {});
  const [profilePhotoURL, setProfilePhotoURL] = useState(authorPhotoURL || null);
  const [displayNickname, setDisplayNickname] = useState(authorNickname || '');
  const [isVerified, setIsVerified] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const [displayContent, setDisplayContent] = useState(textContent);
  const [reactionsModalOpen, setReactionsModalOpen] = useState(false);
  const [selectedReactionType, setSelectedReactionType] = useState(null);
  const [selectedReactionUsers, setSelectedReactionUsers] = useState([]);
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

  // Listeners para reactions e likes em tempo real
  useEffect(() => {
    const reactionsRef = ref(rtdb, `posts/${id}/reactions`);
    const likesRef = ref(rtdb, `posts/${id}/likes`);
    
    let currentReactions = {};
    let currentLikes = {};
    
    const mergeReactionsAndLikes = () => {
      const mergedReactions = { ...currentReactions };
      Object.keys(currentLikes).forEach((uid) => {
        // Se o usuário não tem uma reação nova, contar o like antigo como heart
        if (!mergedReactions[uid]) {
          mergedReactions[uid] = 'heart';
        }
      });
      setReactionsData(mergedReactions);
    };
    
    const unsubscribeReactions = onValue(reactionsRef, (snapshot) => {
      currentReactions = snapshot.val() || {};
      mergeReactionsAndLikes();
    });
    
    const unsubscribeLikes = onValue(likesRef, (snapshot) => {
      currentLikes = snapshot.val() || {};
      mergeReactionsAndLikes();
    });
    
    return () => {
      unsubscribeReactions();
      unsubscribeLikes();
    };
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

  // Hook para monitorar se o autor está online
  const { isOnline } = useOnlineStatus(authorId);

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

  const handleReactionClick = (reactionType, userIds) => {
    setSelectedReactionType(reactionType);
    setSelectedReactionUsers(Array.isArray(userIds) && userIds.length > 0 ? userIds : []);
    setReactionsModalOpen(true);
  };

  const handleReactionSelect = async (reactionType) => {
    if (!currentUser) {
      console.warn('Usuário não autenticado para reagir');
      return;
    }

    const postReactionRef = ref(rtdb, `posts/${id}/reactions/${currentUser.uid}`);
    const postLikeRef = ref(rtdb, `posts/${id}/likes/${currentUser.uid}`);
    const postRef = ref(rtdb, `posts/${id}`);

    try {
      const currentReaction = reactionsData[currentUser.uid];

      if (currentReaction === reactionType) {
        // Remover reaction se clicou no mesmo emoji
        console.log('Removendo reaction:', reactionType);
        await remove(postReactionRef);
        
        // Se for remover heart (amei), também remover like antigo correspondente
        if (reactionType === 'heart') {
          await remove(postLikeRef);
        }
      } else {
        // Adicionar ou trocar reaction
        console.log('Adicionando/trocando reaction:', reactionType);
        await set(postReactionRef, reactionType);
        
        // Se mudar para heart (amei), remover like antigo se existir
        if (reactionType === 'heart') {
          await remove(postLikeRef);
        }
      }

      // Atualizar lastActivityAt para reordenar feed
      await update(postRef, {
        lastActivityAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Erro ao reagir:', error);
    }
  };

  return (
    <>
      <Card sx={{ mb: 3 }}>
          <CardHeader
          avatar={
            <Box 
              sx={{ position: 'relative', display: 'inline-flex', flexShrink: 0, cursor: 'pointer' }} 
              onClick={handleAuthorClick}
            >
              <Avatar src={profilePhotoURL} sx={{ width: 48, height: 48 }}>{!profilePhotoURL && (displayNickname || authorNickname) ? (displayNickname || authorNickname).charAt(0).toUpperCase() : '?'}</Avatar>
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
          title={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
              <span 
                onClick={handleAuthorClick} 
                style={{ cursor: 'pointer' }}
              >
                {displayNickname || authorNickname}
              </span>
              <OnlineIndicator isOnline={isOnline} size={10} />
            </Box>
          }
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
        <CardActions sx={{ justifyContent: 'space-between', alignItems: 'center', p: 1.5 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <ReactionSelector 
              currentReaction={reactionsData[currentUser?.uid]}
              onReactionSelect={handleReactionSelect}
              size="medium"
            />

            {Object.keys(reactionsData).length > 0 && (
              <Tooltip title={`Total de ${Object.keys(reactionsData).length} reações`} arrow>
                <Box 
                  sx={{ 
                    cursor: 'default',
                    display: 'inline-flex',
                    alignItems: 'center',
                    px: 1.5,
                    py: 0.75,
                    borderRadius: 1,
                    backgroundColor: '#f5f5f5',
                    minHeight: '36px',
                    justifyContent: 'center'
                  }}
                >
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: '500' }}>
                    {Object.keys(reactionsData).length}
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
          </Box>
        </CardActions>

        {/* Exibir reactions agrupadas */}
        {Object.keys(reactionsData).length > 0 && (
          <CardContent sx={{ pt: 0, pb: 1 }}>
            <ReactionDisplay 
              reactions={reactionsData}
              onReactionClick={(reactionType, userIds) => 
                handleReactionClick(reactionType, userIds)
              }
            />
          </CardContent>
        )}
      </Card>

      {/* Modal de comentários */}
      <CommentModal
        postId={id}
        open={commentModalOpen}
        onClose={() => setCommentModalOpen(false)}
      />

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

      {/* Modal de usuários que reagiram */}
      <ReactionsUsersModal
        open={reactionsModalOpen}
        onClose={() => setReactionsModalOpen(false)}
        reactionType={selectedReactionType}
        userIds={selectedReactionUsers}
      />
    </>
  );
}

export default Post;
