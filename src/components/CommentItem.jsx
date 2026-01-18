import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { rtdb } from '../firebase/config';
import { ref, remove, set, onValue, update, serverTimestamp } from 'firebase/database';
import EditCommentModal from './EditCommentModal.jsx'; // Importa modal de edição
import VerificationBadge from './VerificationBadge.jsx'; // Importa badge de verificação
import OnlineIndicator from './OnlineIndicator.jsx'; // Importa indicador de online
import useOnlineStatus from '../hooks/useOnlineStatus.jsx'; // Hook para status de online
import ReactionSelector from './ReactionSelector.jsx'; // Seletor de reactions
import ReactionDisplay from './ReactionDisplay.jsx'; // Exibidor de reactions
import ReactionsUsersModal from './ReactionsUsersModal.jsx'; // Modal de usuários que reagiram

import {
  Box, Avatar, Typography, IconButton, Tooltip, Dialog,
  DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemAvatar, ListItemText, useMediaQuery
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';

function CommentItem({ postId, commentId, commentData, onCommentDelete }) {
  const { currentUser } = useAuth();
  const isMobile = useMediaQuery('(max-width:600px)');
  const { authorNickname, textContent, createdAt, authorId, authorPhotoURL } = commentData;
  
  const formattedDate = new Date(createdAt).toLocaleString('pt-BR');
  const isOwner = currentUser && currentUser.uid === authorId;

  const [reactionsData, setReactionsData] = useState(commentData.reactions || {});
  const [isVerified, setIsVerified] = useState(false);
  const [profilePhotoURL, setProfilePhotoURL] = useState(authorPhotoURL || null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [displayContent, setDisplayContent] = useState(textContent);
  const [reactionsModalOpen, setReactionsModalOpen] = useState(false);
  const [selectedReactionType, setSelectedReactionType] = useState(null);
  const [selectedReactionUsers, setSelectedReactionUsers] = useState([]);

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

  // Listeners para reactions e likes em tempo real
  useEffect(() => {
    const reactionsRef = ref(rtdb, `posts/${postId}/comments/${commentId}/reactions`);
    const likesRef = ref(rtdb, `posts/${postId}/comments/${commentId}/likes`);
    
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

  // Hook para monitorar se o autor está online
  const { isOnline } = useOnlineStatus(authorId);

  const handleReactionClick = (reactionType, userIds) => {
    setSelectedReactionType(reactionType);
    setSelectedReactionUsers(Array.isArray(userIds) && userIds.length > 0 ? userIds : []);
    setReactionsModalOpen(true);
    setReactionsModalOpen(true);
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

  const handleReactionSelect = async (reactionType) => {
    if (!currentUser) {
      console.warn('Usuário não autenticado para reagir');
      return;
    }

    const commentReactionRef = ref(rtdb, `posts/${postId}/comments/${commentId}/reactions/${currentUser.uid}`);
    const commentLikeRef = ref(rtdb, `posts/${postId}/comments/${commentId}/likes/${currentUser.uid}`);
    const postRef = ref(rtdb, `posts/${postId}`);

    try {
      const currentReaction = reactionsData[currentUser.uid];

      if (currentReaction === reactionType) {
        // Remover reaction se clicou no mesmo emoji
        console.log('Removendo reaction:', reactionType);
        await remove(commentReactionRef);
        
        // Se for remover heart (amei), também remover like antigo correspondente
        if (reactionType === 'heart') {
          await remove(commentLikeRef);
        }
      } else {
        // Adicionar ou trocar reaction
        console.log('Adicionando/trocando reaction:', reactionType);
        await set(commentReactionRef, reactionType);
        
        // Se mudar para heart (amei), remover like antigo se existir
        if (reactionType === 'heart') {
          await remove(commentLikeRef);
        }
      }

      // Atualizar lastActivityAt do post para reordenar feed
      await update(postRef, {
        lastActivityAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Erro ao reagir:', error);
    }
  };

  return (
    <>
      <Box sx={{ display: 'flex', gap: 2, pb: 2, borderBottom: '1px solid #e0e0e0', alignItems: 'flex-start' }}>
        <Box sx={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
          <Avatar src={profilePhotoURL} sx={{ width: isMobile ? 40 : 48, height: isMobile ? 40 : 48 }}>
            {!profilePhotoURL && authorNickname?.charAt(0).toUpperCase()}
          </Avatar>
          <VerificationBadge isVerified={isVerified} avatarSize={isMobile ? 40 : 48} customSx={{ bottom: '-3px', right: '-3px' }} />
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', mb: 0.5, flexWrap: isMobile ? 'wrap' : 'nowrap', gap: isMobile ? 0.5 : 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.2, flexWrap: 'nowrap' }}>
              <Typography variant={isMobile ? 'body2' : 'subtitle2'} sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                {authorNickname}
              </Typography>
              <OnlineIndicator isOnline={isOnline} size={isMobile ? 8 : 10} />
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: isMobile ? '0.7rem' : 'inherit', whiteSpace: 'nowrap' }}>
              {formattedDate}
            </Typography>
          </Box>

          <Typography variant="body2" sx={{ mb: 1, wordBreak: 'break-word' }}>
            {displayContent}
          </Typography>

          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <ReactionSelector 
                currentReaction={reactionsData[currentUser?.uid]}
                onReactionSelect={handleReactionSelect}
                size="small"
              />

              {Object.keys(reactionsData).length > 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: '500', minWidth: '30px' }}>
                  {Object.keys(reactionsData).length}
                </Typography>
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

          {/* Exibir reactions agrupadas */}
          {Object.keys(reactionsData).length > 0 && (
            <Box sx={{ mt: 1 }}>
              <ReactionDisplay 
                reactions={reactionsData}
                onReactionClick={(reactionType, userIds) => 
                  handleReactionClick(reactionType, userIds)
                }
              />
            </Box>
          )}
        </Box>
      </Box>

      {/* Modal de edição de comentário */}
      <EditCommentModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        postId={postId}
        commentId={commentId}
        currentContent={displayContent}
        onEditSuccess={() => {}}
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

export default CommentItem;
