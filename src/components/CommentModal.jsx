import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { rtdb } from '../firebase/config';
import { ref, push, set, get, onChildAdded, onChildChanged, onChildRemoved, serverTimestamp } from 'firebase/database';
import CommentItem from './CommentItem.jsx';
import useToxicityModel from '../hooks/useToxicityModel';

import {
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button,
  Box, CircularProgress, Typography, Alert
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';

function CommentModal({ postId, open, onClose }) {
  const { currentUser, userProfile } = useAuth();
  const { classifyText } = useToxicityModel();
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
      // Validar conteúdo do comentário com TensorFlow.js
      const isSensitive = await classifyText(commentText);
      if (isSensitive) {
        setError('Seu comentário contém conteúdo sensível ou malicioso.');
        setLoading(false);
        return;
      }

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
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Comentários</DialogTitle>

      <DialogContent dividers sx={{ minHeight: '400px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {error && <Alert severity="error">{error}</Alert>}

        {/* Formulário para novo comentário */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, p: 2, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid #e0e0e0' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
            Adicionar comentário
          </Typography>
          <Box component="form" onSubmit={handleSubmitComment} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <TextField
              fullWidth
              multiline
              rows={3}
              placeholder="O que você pensa sobre este post?"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              disabled={loading}
              variant="outlined"
              size="small"
              sx={{ bgcolor: 'white' }}
            />
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Button
                type="submit"
                variant="contained"
                disabled={loading || !commentText.trim()}
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
              >
                Enviar
              </Button>
            </Box>
          </Box>
        </Box>

        {/* Separador */}
        <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', my: 1 }}>
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
            <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
              Nenhum comentário ainda. Seja o primeiro a comentar!
            </Typography>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Fechar</Button>
      </DialogActions>
    </Dialog>
  );
}

export default CommentModal;
