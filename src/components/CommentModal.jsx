import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { rtdb } from '../firebase/config';
import { ref, push, set, get, onChildAdded, onChildChanged, onChildRemoved, serverTimestamp, update } from 'firebase/database';
import CommentItem from './CommentItem.jsx';

import {
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button,
  Box, CircularProgress, Typography, Alert, useMediaQuery
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';

function CommentModal({ postId, open, onClose }) {
  const { currentUser, userProfile } = useAuth();
  const isMobile = useMediaQuery('(max-width:600px)');
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingComments, setLoadingComments] = useState(true);
  const [error, setError] = useState('');
  const mountTimeRef = useRef(Date.now());

  // Escutar comentários existentes (carregamento inicial)
  useEffect(() => {
    if (!open || !postId) return undefined;

    setLoadingComments(true);
    const commentsRef = ref(rtdb, `posts/${postId}/comments`);

    // Carregamento inicial de todos os comentários
    const loadInitialComments = async () => {
      try {
        const snapshot = await get(commentsRef);
        if (snapshot.exists()) {
          const allComments = [];
          snapshot.forEach((child) => {
            allComments.push({ id: child.key, ...child.val() });
          });
          // Ordenar por timestamp (mais antigos primeiro)
          allComments.sort((a, b) => a.createdAt - b.createdAt);
          setComments(allComments);
        }
        setLoadingComments(false);
      } catch (err) {
        console.error("Erro ao carregar comentários:", err);
        setLoadingComments(false);
      }
    };

    loadInitialComments();

    // Listener em tempo real para novos comentários após este hook montado
    const unsubAdded = onChildAdded(
      ref(rtdb, `posts/${postId}/comments`),
      (snapshot) => {
        if (snapshot.exists() && snapshot.val().createdAt > mountTimeRef.current) {
          const newComment = { id: snapshot.key, ...snapshot.val() };
          setComments((prev) => [...prev, newComment]);
        }
      }
    );

    // Listener para alterações em comentários existentes (likes)
    const unsubChanged = onChildChanged(
      ref(rtdb, `posts/${postId}/comments`),
      (snapshot) => {
        if (snapshot.exists()) {
          const updated = { id: snapshot.key, ...snapshot.val() };
          setComments((prev) => prev.map((c) => (c.id === snapshot.key ? updated : c)));
        }
      }
    );

    // Listener para exclusão de comentários
    const unsubRemoved = onChildRemoved(
      ref(rtdb, `posts/${postId}/comments`),
      (snapshot) => {
        setComments((prev) => prev.filter((c) => c.id !== snapshot.key));
      }
    );

    return () => {
      unsubAdded();
      unsubChanged();
      unsubRemoved();
    };
  }, [postId, open]);

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) {
      setError('Comentário não pode estar vazio.');
      return;
    }

    if (!currentUser || !userProfile) {
      setError('Você precisa estar logado para comentar.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const commentsRef = ref(rtdb, `posts/${postId}/comments`);
      const newCommentRef = push(commentsRef);

      const newCommentData = {
        authorId: currentUser.uid,
        authorNickname: userProfile.nickname,
        authorPhotoURL: userProfile.photoURL || null,
        textContent: commentText,
        createdAt: serverTimestamp(),
        likes: {},
      };

      await set(newCommentRef, newCommentData);
      
      // Atualizar lastActivityAt do post para trazer ao topo
      await update(ref(rtdb, `posts/${postId}`), {
        lastActivityAt: serverTimestamp()
      });

      setCommentText('');
      setError('');
    } catch (err) {
      console.error("Erro ao criar comentário:", err);
      setError('Erro ao publicar comentário. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveComment = (commentId) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth={isMobile ? 'xs' : 'sm'}
      PaperProps={{
        sx: {
          maxWidth: isMobile ? '100vw' : 520,
          width: '100%',
          maxHeight: isMobile ? '90vh' : '85vh',
          margin: isMobile ? 1 : 'auto',
        }
      }}
    >
      <DialogTitle sx={{ fontSize: isMobile ? '1.1rem' : '1.25rem', pb: isMobile ? 1 : 2 }}>
        Comentários
      </DialogTitle>

      <DialogContent dividers sx={{ 
        maxHeight: isMobile ? 'calc(90vh - 120px)' : 'calc(85vh - 120px)', 
        minHeight: isMobile ? '200px' : 'auto', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: isMobile ? 1 : 1.5, 
        overflow: 'auto',
        p: isMobile ? 1 : 2
      }}>
        {error && <Alert severity="error" sx={{ fontSize: isMobile ? '0.85rem' : 'inherit' }}>{error}</Alert>}

        {/* Formulário para novo comentário */}
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: 1, 
          p: isMobile ? 1.5 : 1.5, 
          bgcolor: 'grey.50', 
          borderRadius: 1, 
          border: '1px solid #e0e0e0',
          flexShrink: 0
        }}>
          <Typography variant={isMobile ? 'subtitle2' : 'subtitle2'} sx={{ fontWeight: 'bold', color: 'text.primary', fontSize: isMobile ? '0.95rem' : '0.95rem' }}>
            Adicionar comentário
          </Typography>
          <Box component="form" onSubmit={handleSubmitComment} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <TextField
              fullWidth
              multiline
              rows={isMobile ? 2 : 3}
              placeholder="O que você pensa?"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              disabled={loading}
              variant="outlined"
              size={isMobile ? 'small' : 'small'}
              sx={{ 
                bgcolor: 'white',
                fontSize: isMobile ? '0.9rem' : '0.9rem',
                '& .MuiInputBase-input': {
                  fontSize: isMobile ? '0.9rem' : '0.9rem'
                }
              }}
            />
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Button
                type="submit"
                variant="contained"
                size={isMobile ? 'small' : 'small'}
                disabled={loading || !commentText.trim()}
                startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
                sx={{ fontSize: isMobile ? '0.8rem' : '0.85rem' }}
              >
                Enviar
              </Button>
            </Box>
          </Box>
        </Box>

        {/* Separador */}
        <Typography variant="subtitle2" color="text.secondary" sx={{ textAlign: 'center', my: isMobile ? 0.5 : 0.8, fontSize: isMobile ? '0.75rem' : '0.85rem', fontWeight: '600' }}>
          Comentários
        </Typography>

        {/* Lista de comentários */}
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {loadingComments ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : comments.length > 0 ? (
            comments.map((comment) => (
              <CommentItem
                key={comment.id}
                postId={postId}
                commentId={comment.id}
                commentData={comment}
                onCommentDelete={handleRemoveComment}
              />
            ))
          ) : (
            <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4, fontSize: isMobile ? '0.9rem' : 'inherit' }}>
              Nenhum comentário ainda. Seja o primeiro a comentar!
            </Typography>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: isMobile ? 0.5 : 1, justifyContent: 'flex-end' }}>
        <Button 
          onClick={onClose} 
          size="small"
          sx={{ fontSize: isMobile ? '0.75rem' : '0.85rem' }}
        >
          Fechar
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default CommentModal;
