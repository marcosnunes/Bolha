import { useState } from 'react';
import { rtdb } from '../firebase/config';
import { ref, update, serverTimestamp } from 'firebase/database';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Box,
} from '@mui/material';

function EditCommentModal({ open, onClose, postId, commentId, currentContent, onEditSuccess }) {
  const [content, setContent] = useState(currentContent || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const forbiddenWords = [
    'arrombado', 'arrombada', 'babaca', 'nazista', 'nazi',
    'estupro', 'estuprador', 'pedofilo', 'pedofilia',
    'macaco', 'preto imundo', 'bicha', 'traveco', 'retardado', 'mongol'
  ];

  const containsLink = (text) => {
    if (!text) return false;
    const urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|])|(\bwww\.[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|])/ig;
    return urlRegex.test(text);
  };

  const containsForbiddenWord = (text) => {
    if (!text) return false;
    const lowerCaseText = text.toLowerCase();
    return forbiddenWords.some(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'i');
      return regex.test(lowerCaseText);
    });
  };

  async function handleSave() {
    try {
      setError('');
      setLoading(true);

      if (!content.trim()) {
        setError('O conteúdo do comentário não pode estar vazio.');
        setLoading(false);
        return;
      }

      if (containsLink(content)) {
        setError('Comentários não podem conter links.');
        setLoading(false);
        return;
      }

      if (containsForbiddenWord(content)) {
        setError('Seu comentário contém palavras não permitidas.');
        setLoading(false);
        return;
      }

      // Atualizar comentário no Firebase
      const commentRef = ref(rtdb, `posts/${postId}/comments/${commentId}`);
      await update(commentRef, {
        textContent: content,
        editedAt: serverTimestamp(),
      });

      setLoading(false);
      setContent('');
      if (onEditSuccess) onEditSuccess();
      onClose();
    } catch (err) {
      console.error('Erro ao editar comentário:', err);
      setError('Falha ao editar o comentário. Tente novamente.');
      setLoading(false);
    }
  }

  const handleClose = () => {
    if (!loading) {
      setContent(currentContent);
      setError('');
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Editar Comentário</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            maxRows={8}
            label="Conteúdo do Comentário"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={loading}
            placeholder="Digite o novo conteúdo do comentário..."
          />
          <Box sx={{ mt: 1, fontSize: '0.85rem', color: 'text.secondary' }}>
            Caracteres: {content.length}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={loading || !content.trim() || content === currentContent}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Salvar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default EditCommentModal;
