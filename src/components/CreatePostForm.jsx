import { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { rtdb } from '../firebase/config';
import { ref, push, serverTimestamp, update } from 'firebase/database';
import useToxicityModel from '../hooks/useToxicityModel';

// Componentes e Ícones do MUI
import {
  Card, CardContent, CardActions, TextField, Button,
  CircularProgress, Alert, Box, Typography
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';

function CreatePostForm({ onPostSuccess }) {
  const [postContent, setPostContent] = useState('');
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { currentUser, userProfile } = useAuth();
  const { loadingModel, classifyText } = useToxicityModel();

  const fileInputRef = useRef(null); // Referência para o input de arquivo

  // (Suas funções de moderação de texto: forbiddenWords, containsLink, containsForbiddenWord)
  const forbiddenWords = ['arrombado', 'arrombada',
    'babaca', 'bosta', 'buceta', 'boceta',
    'caralho', 'caraio', 'cagar', 'cona', 'corno', 'cornudo', 'cu', 'cuzão',
    'escroto', 'escrota',
    'foda', 'foder', 'fudido', 'fudida',
    'merda',
    'pau', 'pinto', 'piranha', 'porra', 'prostituta', 'puta', 'puto',
    'retardado',
    'vadia', 'vagabundo', 'vagabunda', 'viado', 'viadinho',
    'xoxota'];
  const containsLink = (text) => {
    const urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|])|(\bwww\.[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|])/ig;
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

      const postsListRef = ref(rtdb, 'posts');
      const newPostRef = push(postsListRef);
      await update(newPostRef, {
        textContent: postContent,
        authorId: currentUser.uid,
        authorNickname: userProfile.nickname,
        authorPhotoURL: userProfile.photoURL || null,
        createdAt: serverTimestamp(),
        isNSFW: false,
        moderationStatus: 'pending',
        mediaURL: mediaURL,
        mediaType: mediaType,
      });

      setPostContent('');
      setFile(null);
      setFileName('');
      setLoading(false);
      if (onPostSuccess) onPostSuccess();
      if (fileInputRef.current) fileInputRef.current.value = "";

      const isToxicFromModel = await classifyText(postContent);
      const isForbiddenFromList = containsForbiddenWord(postContent);
      const finalIsNSFW = isToxicFromModel || isForbiddenFromList;

      if (finalIsNSFW) {
        const postToUpdateRef = ref(rtdb, `posts/${newPostRef.key}`);
        await update(postToUpdateRef, {
          isNSFW: true,
          moderationStatus: 'completed',
        });
      }

    } catch (err) {
      console.error("Erro ao publicar o post:", err);
      setError("Ocorreu um erro ao publicar seu post.");
      setLoading(false); // Garante que o loading para em caso de erro
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
      {loadingModel && <Typography variant="caption">Carregando modelo de moderação...</Typography>}
      {error && <Alert severity="error">{error}</Alert>}

      <TextField
        fullWidth multiline rows={4} variant="outlined" label="No que você está pensando?"
        value={postContent} onChange={(e) => setPostContent(e.target.value)}
      />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button component="label" startIcon={<AttachFileIcon />}>
          Anexar Mídia
          <input type="file" hidden ref={fileInputRef} onChange={handleFileChange} accept="image/*,video/*" />
        </Button>
        {fileName && <Typography variant="caption" noWrap sx={{ flexShrink: 1, ml: 1 }}>{fileName}</Typography>}
        <Button
          variant="contained" type="submit" disabled={loading || loadingModel}
          startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
        >
          Publicar
        </Button>
      </Box>
    </Box>
  );
}

export default CreatePostForm;
