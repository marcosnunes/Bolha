import { useState } from 'react';
import { rtdb } from '../firebase/config';
import { ref, update, serverTimestamp } from 'firebase/database';
import useHuggingFaceModeration from '../hooks/useHuggingFaceModeration';
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

function EditPostModal({ open, onClose, postId, currentContent, onEditSuccess }) {
  const [content, setContent] = useState(currentContent || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { validateText } = useHuggingFaceModeration();

  const containsLink = (text) => {
    if (!text) return false;
    const urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|])|(\bwww\.[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|])/ig;
    return urlRegex.test(text);
  };

  async function handleSave() {
    try {
      setError('');
      setLoading(true);

      if (!content.trim()) {
        setError('O conteúdo do post não pode estar vazio.');
        setLoading(false);
        return;
      }

      if (containsLink(content)) {
        setError('Posts não podem conter links.');
        setLoading(false);
        return;
      }

      // Verificar se o conteúdo é sensível usando Hugging Face
      const result = await validateText(content);
      if (result.isSensitive) {
        setError('Seu post contém conteúdo sensível ou malicioso.');
        setLoading(false);
        return;
      }      // Atualizar post no Firebase
      const postRef = ref(rtdb, `posts/${postId}`);
      await update(postRef, {
        textContent: content,
        editedAt: serverTimestamp(),
      });

      setLoading(false);
      setContent('');
      if (onEditSuccess) onEditSuccess();
      onClose();
    } catch (err) {
      console.error('Erro ao editar post:', err);
      setError('Falha ao editar o post. Tente novamente.');
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
      <DialogTitle>Editar Post</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={4}
            maxRows={10}
            label="Conteúdo do Post"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={loading}
            placeholder="Digite o novo conteúdo do post..."
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

export default EditPostModal;
