import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { rtdb } from '../firebase/config';
import { ref, remove, set, onValue } from 'firebase/database';

import {
  Box, Avatar, Typography, Button, IconButton, Tooltip
} from '@mui/material';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbUpOutlinedIcon from '@mui/icons-material/ThumbUpOutlined';
import DeleteIcon from '@mui/icons-material/Delete';

function CommentItem({ postId, commentId, commentData, onCommentDelete }) {
  const { currentUser } = useAuth();
  const { authorNickname, textContent, createdAt, authorId, authorPhotoURL } = commentData;
  
  const formattedDate = new Date(createdAt).toLocaleString('pt-BR');
  const isOwner = currentUser && currentUser.uid === authorId;

  const [likesData, setLikesData] = useState(commentData.likes || {});

  useEffect(() => {
    const likesRef = ref(rtdb, `posts/${postId}/comments/${commentId}/likes`);
    const unsubscribeLikes = onValue(likesRef, (snapshot) => {
      setLikesData(snapshot.val() || {});
    });
    return () => unsubscribeLikes();
  }, [postId, commentId]);

  const likesCount = Object.keys(likesData).length;
  const hasLiked = currentUser && likesData[currentUser.uid];

  const handleLike = async () => {
    if (!currentUser) return;
    const commentLikesRef = ref(rtdb, `posts/${postId}/comments/${commentId}/likes/${currentUser.uid}`);
    try {
      if (hasLiked) {
        await remove(commentLikesRef);
      } else {
        await set(commentLikesRef, true);
      }
    } catch (error) {
      console.error("Erro ao curtir comentário:", error);
    }
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

  return (
    <Box sx={{ display: 'flex', gap: 2, pb: 2, borderBottom: '1px solid #e0e0e0' }}>
      <Avatar
        src={authorPhotoURL}
        sx={{ width: 40, height: 40 }}
      >
        {!authorPhotoURL && authorNickname?.charAt(0).toUpperCase()}
      </Avatar>

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
          {textContent}
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button
            size="small"
            startIcon={hasLiked ? <ThumbUpIcon /> : <ThumbUpOutlinedIcon />}
            onClick={handleLike}
            color={hasLiked ? 'primary' : 'inherit'}
            sx={{ fontSize: '0.75rem' }}
          >
            {likesCount > 0 ? likesCount : 'Curtir'}
          </Button>

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
  );
}

export default CommentItem;
