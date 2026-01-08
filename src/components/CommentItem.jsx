import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { rtdb } from '../firebase/config';
import { ref, remove, set, onValue, get } from 'firebase/database';
import EditCommentModal from './EditCommentModal.jsx'; // Importa modal de edição
import VerificationBadge from './VerificationBadge.jsx'; // Importa badge de verificação

import {
  Box, Avatar, Typography, Button, IconButton, Tooltip, Dialog,
  DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemAvatar, ListItemText
} from '@mui/material';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbUpOutlinedIcon from '@mui/icons-material/ThumbUpOutlined';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';

function CommentItem({ postId, commentId, commentData, onCommentDelete }) {
  const { currentUser } = useAuth();
  const { authorNickname, textContent, createdAt, authorId, authorPhotoURL } = commentData;
  
  console.log('🔄 CommentItem renderizando:', {
    commentId,
    authorId,
    currentUserId: currentUser?.uid,
    temLikes: !!commentData.likes,
    likesData: commentData.likes
  });
  
  const formattedDate = new Date(createdAt).toLocaleString('pt-BR');
  const isOwner = currentUser && currentUser.uid === authorId;

  const [likesData, setLikesData] = useState(commentData.likes || {});
  const [likesModalOpen, setLikesModalOpen] = useState(false);
  const [likesUsers, setLikesUsers] = useState([]);
  const [loadingLikes, setLoadingLikes] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [profilePhotoURL, setProfilePhotoURL] = useState(authorPhotoURL || null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [displayContent, setDisplayContent] = useState(textContent);

  // Monitorar mudanças no conteúdo do comentário (incluindo edições)
  useEffect(() => {
    const commentRef = ref(rtdb, `posts/${postId}/comments/${commentId}`);
    const unsubscribeComment = onValue(commentRef, (snapshot) => {
      const commentUpdated = snapshot.val();
      if (commentUpdated && commentUpdated.textContent) {
        setDisplayContent(commentUpdated.textContent);
      }
    });
    return () => unsubscribeComment();
  }, [postId, commentId]);

  useEffect(() => {
    console.log('📍 Configurando listener de likes:', {
      postId,
      commentId,
      path: `posts/${postId}/comments/${commentId}/likes`
    });
    
    const likesRef = ref(rtdb, `posts/${postId}/comments/${commentId}/likes`);
    const unsubscribeLikes = onValue(likesRef, (snapshot) => {
      console.log('📊 Dados de likes atualizados:', snapshot.val());
      setLikesData(snapshot.val() || {});
    });
    return () => unsubscribeLikes();
  }, [postId, commentId]);

  // Carregar dados de verificação do autor
  useEffect(() => {
    if (!authorId) return;
    const profileRef = ref(rtdb, `profiles/${authorId}`);
    const unsubscribe = onValue(profileRef, (snapshot) => {
      const profile = snapshot.val() || {};
      setIsVerified(profile.isVerified || false);
      // Também atualiza a foto de perfil em tempo real
      setProfilePhotoURL(profile.photoURL || null);
    });
    return () => unsubscribe();
  }, [authorId]);

  const likesCount = Object.keys(likesData).length;
  const hasLiked = currentUser && likesData[currentUser.uid];

  const handleLike = async () => {
    console.log('=== HANDLELIKE INICIADO ===');
    console.log('currentUser:', currentUser?.uid);
    console.log('postId:', postId);
    console.log('commentId:', commentId);
    console.log('hasLiked:', hasLiked);
    
    if (!currentUser) {
      console.log('Abortando: usuário não autenticado');
      return;
    }
    
    try {
      const path = `posts/${postId}/comments/${commentId}/likes/${currentUser.uid}`;
      const likesRef = ref(rtdb, path);
      
      console.log('Path completo:', path);
      console.log('hasLiked:', hasLiked);
      
      if (hasLiked) {
        console.log('Removendo like...');
        await remove(likesRef);
        console.log('✅ Like removido');
      } else {
        console.log('Adicionando like...');
        await set(likesRef, true);
        console.log('✅ Like adicionado');
      }
    } catch (error) {
      console.error('❌ ERRO COMPLETO:', error);
      console.error('Code:', error.code);
      console.error('Message:', error.message);
    }
    console.log('=== HANDLELIKE FINALIZADO ===');
  };

  const handleDelete = async () => {
    try {
      const commentRef = ref(rtdb, `posts/${postId}/comments/${commentId}`);
      await remove(commentRef);
      if (onCommentDelete) onCommentDelete(commentId);
    } catch (error) {
      console.error("Erro ao apagar comentário:", error);
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
      <Box sx={{ display: 'flex', gap: 2, pb: 2, borderBottom: '1px solid #e0e0e0' }}>
        <Box sx={{ position: 'relative', display: 'inline-block' }}>
          <Avatar src={profilePhotoURL}>
            {!profilePhotoURL && authorNickname?.charAt(0).toUpperCase()}
          </Avatar>
          <VerificationBadge isVerified={isVerified} avatarSize={48} customSx={{ bottom: '45px', right: '0px' }} />
        </Box>

        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
              {authorNickname}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formattedDate}
            </Typography>
          </Box>

          <Typography variant="body2" sx={{ mb: 1, wordBreak: 'break-word' }}>
            {displayContent}
          </Typography>

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Button
              size="small"
              startIcon={hasLiked ? <ThumbUpIcon /> : <ThumbUpOutlinedIcon />}
              onClick={() => {
                console.log('🔥 BOTÃO DE LIKE CLICADO!');
                handleLike();
              }}
              color={hasLiked ? 'primary' : 'inherit'}
              sx={{ fontSize: '0.75rem' }}
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
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 1,
                    '&:hover': { 
                      backgroundColor: 'action.hover',
                      textDecoration: 'underline'
                    },
                    minWidth: '36px',
                    minHeight: '36px',
                    justifyContent: 'center'
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    {likesCount}
                  </Typography>
                </Box>
              </Tooltip>
            )}

            {isOwner && (
              <Tooltip title="Editar comentário">
                <IconButton
                  size="small"
                  onClick={() => setEditModalOpen(true)}
                  sx={{ color: 'primary.main' }}
                >
                  <EditIcon sx={{ fontSize: '1rem' }} />
                </IconButton>
              </Tooltip>
            )}

            {isOwner && (
              <Tooltip title="Apagar comentário">
                <IconButton
                  size="small"
                  onClick={handleDelete}
                  sx={{ color: 'error.main' }}
                >
                  <DeleteIcon sx={{ fontSize: '1rem' }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>
      </Box>

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
                    <Box sx={{ position: 'relative', display: 'inline-block' }}>
                      <Avatar src={user.photoURL} alt={user.nickname}>
                        {!user.photoURL && user.nickname ? user.nickname.charAt(0).toUpperCase() : '?'}
                      </Avatar>
                      <VerificationBadge isVerified={user.isVerified || false} avatarSize={40} customSx={{ bottom: '-5px', right: '-5px' }} />
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

      {/* Modal de edição de comentário */}
      <EditCommentModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        postId={postId}
        commentId={commentId}
        currentContent={displayContent}
        onEditSuccess={() => {}}
      />
    </>
  );
}

export default CommentItem;
