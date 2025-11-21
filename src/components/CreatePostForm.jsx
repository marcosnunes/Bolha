import { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { rtdb } from '../firebase/config';
import { ref, push, serverTimestamp, update } from 'firebase/database';
import useToxicityModel from '../hooks/useToxicityModel';

// Componentes e Ícones do MUI
import {
  TextField, Button, CircularProgress, Alert, Box, Typography
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

  const fileInputRef = useRef(null);

  // MODERAÇÃO
  const forbiddenWords = [
    'arrombado', 'arrombada', 'babaca', 'nazista', 'nazi',
    'estupro', 'estuprador', 'pedofilo', 'pedofilia',
    'macaco', 'preto imundo', 
    'bicha', 'traveco', 
    'retardado', 'mongol'
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

      // 1. Upload de Imagem/Vídeo (se houver)
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

      // 2. Criação do Post no Firebase
      const postsListRef = ref(rtdb, 'posts');
      const newPostRef = push(postsListRef);
      
      // Objeto do post
      const newPostData = {
        textContent: postContent,
        authorId: currentUser.uid,
        authorNickname: userProfile.nickname,
        createdAt: serverTimestamp(),
        isNSFW: false,
        moderationStatus: 'pending',
        mediaURL: mediaURL || null, // Garante que null seja enviado se não houver mídia
        mediaType: mediaType || null
      };

      // Adiciona foto apenas se existir, para evitar erros com null nas regras
      if (userProfile.photoURL) {
        newPostData.authorPhotoURL = userProfile.photoURL;
      }

      // Envia para o banco (Isso agora vai passar pela nova regra .write)
      await update(newPostRef, newPostData);

      // Limpa o form
      setPostContent('');
      setFile(null);
      setFileName('');
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (onPostSuccess) onPostSuccess();

      // 3. Moderação em Segundo Plano
      // Só roda se tiver texto para analisar
      if (postContent && postContent.trim().length > 0) {
        const isToxicFromModel = await classifyText(postContent);
        const isForbiddenFromList = containsForbiddenWord(postContent);
        
        if (isToxicFromModel || isForbiddenFromList) {
          const postToUpdateRef = ref(rtdb, `posts/${newPostRef.key}`);
          await update(postToUpdateRef, {
            isNSFW: true,
            moderationStatus: 'completed',
          });
        }
      }

    } catch (err) {
      console.error("Erro ao publicar o post:", err);
      setError("Ocorreu um erro ao publicar seu post. Verifique se você tem permissão.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
      {loadingModel && <Typography variant="caption">Carregando segurança...</Typography>}
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
        {fileName && <Typography variant="caption" noWrap sx={{ flexShrink: 1, ml: 1, maxWidth: 150 }}>{fileName}</Typography>}
        <Button
          variant="contained" type="submit" disabled={loading || loadingModel}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
        >
          Publicar
        </Button>
      </Box>
    </Box>
  );
}

export default CreatePostForm;
