import { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { rtdb } from '../firebase/config';
import { ref, push, serverTimestamp } from 'firebase/database';
import useToxicityModel from '../hooks/useToxicityModel';

// Componentes e Ícones do MUI
import { 
  Card, CardContent, CardActions, TextField, Button, 
  CircularProgress, Alert, Box, Typography 
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';

function CreatePostForm() {
  const [postContent, setPostContent] = useState('');
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { currentUser, userProfile } = useAuth();
  const { loadingModel, classifyText } = useToxicityModel();
  
  const fileInputRef = useRef(null); // Referência para o input de arquivo

  // (Suas funções de moderação de texto: forbiddenWords, containsLink, containsForbiddenWord)
  const forbiddenWords = ['buceta', 'caralho', 'puta'];
  const containsLink = (text) => {
    const urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])|(\bwww\.[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
    return urlRegex.test(text);
  };
  const containsForbiddenWord = (text) => {
    const lowerCaseText = text.toLowerCase();
    return forbiddenWords.some(word => lowerCaseText.includes(word));
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setFileName(selectedFile.name);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (containsLink(postContent)) return setError("Posts contendo links não são permitidos.");
    if (!postContent.trim() && !file) return setError("O post precisa ter texto ou uma imagem/vídeo.");
    if (!currentUser || !userProfile) return setError("Você precisa estar logado para postar.");

    setLoading(true);

    try {
      let mediaURL = null;
      let mediaType = null;

      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);

        const response = await fetch(`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/auto/upload`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) throw new Error('Falha no upload da mídia.');
        const data = await response.json();
        mediaURL = data.secure_url;
        mediaType = data.resource_type;
      }

      const isToxic = await classifyText(postContent);
      const isForbidden = containsForbiddenWord(postContent);

      const postsListRef = ref(rtdb, 'posts');
      await push(postsListRef, {
        textContent: postContent,
        authorId: currentUser.uid,
        authorNickname: userProfile.nickname,
        createdAt: serverTimestamp(),
        isNSFW: isToxic || isForbidden,
        mediaURL: mediaURL,
        mediaType: mediaType,
      });

      setPostContent('');
      setFile(null);
      setFileName('');
      if(fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      console.error("Erro ao publicar o post:", err);
      setError("Ocorreu um erro ao publicar seu post. Tente novamente.");
    }

    setLoading(false);
  };

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>Crie um novo post</Typography>
        {loadingModel && <Typography variant="caption" color="text.secondary">Carregando modelo de moderação...</Typography>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        
        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            multiline
            rows={4}
            variant="outlined"
            label="No que você está pensando?"
            value={postContent}
            onChange={(e) => setPostContent(e.target.value)}
          />
        </Box>
      </CardContent>
      <CardActions sx={{ justifyContent: 'space-between', p: 2 }}>
        <Button
          component="label"
          variant="outlined"
          startIcon={<AttachFileIcon />}
          size="small"
        >
          Anexar Mídia
          <input
            type="file"
            hidden
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*,video/*"
          />
        </Button>
        {fileName && <Typography variant="caption" noWrap>{fileName}</Typography>}
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || loadingModel}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
        >
          Publicar
        </Button>
      </CardActions>
    </Card>
  );
}

export default CreatePostForm;