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

  // LISTA REDUZIDA: Focada apenas em ofensas graves e discurso de ódio.
  // Palavras coloquiais (palavrões comuns) foram removidas para evitar falsos positivos.
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

  // Usa Regex (\b) para buscar a palavra exata.
  const containsForbiddenWord = (text) => {
    if (!text) return false;
    const lowerCaseText = text.toLowerCase();
    
    return forbiddenWords.some(word => {
      // Cria uma expressão regular que busca a palavra inteira
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

    if (containsLink(postContent)) return setError("Posts contendo links não são permitidos por segurança.");
    if (!postContent.trim() && !file) return setError("O post precisa ter texto ou uma imagem/vídeo.");
    if (!currentUser || !userProfile) return setError("Você precisa estar logado para postar.");

    setLoading(true);

    try {
      let mediaURL = null;
      let mediaType = null;

      // 1. Upload da Mídia (se houver)
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);

        const response = await fetch(`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/auto/upload`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) throw new Error('Falha no upload da mídia. Verifique sua conexão.');
        const data = await response.json();
        mediaURL = data.secure_url;
        mediaType = data.resource_type;
      }

      // 2. Criação do Post no Firebase
      const postsListRef = ref(rtdb, 'posts');
      const newPostRef = push(postsListRef);
      
      // Salvamos o post inicialmente.
      await update(newPostRef, {
        textContent: postContent,
        authorId: currentUser.uid,
        authorNickname: userProfile.nickname,
        authorPhotoURL: userProfile.photoURL || null,
        createdAt: serverTimestamp(),
        isNSFW: false, // Começa como false
        moderationStatus: 'pending',
        mediaURL: mediaURL,
        mediaType: mediaType,
      });

      // Limpa o formulário imediatamente para dar feedback rápido
      setPostContent('');
      setFile(null);
      setFileName('');
      if (fileInputRef.current) fileInputRef.current.value = "";
      
      // Fecha o modal (passado via props)
      if (onPostSuccess) onPostSuccess();

      // 3. Moderação Assíncrona (Roda em segundo plano)
      // Só roda se tiver texto. Se for só foto, pula essa etapa pesada.
      if (postContent && postContent.trim().length > 0) {
        const isToxicFromModel = await classifyText(postContent);
        const isForbiddenFromList = containsForbiddenWord(postContent);
        const finalIsNSFW = isToxicFromModel || isForbiddenFromList;

        if (finalIsNSFW) {
          // Se for tóxico, atualiza o post já criado para NSFW
          const postToUpdateRef = ref(rtdb, `posts/${newPostRef.key}`);
          await update(postToUpdateRef, {
            isNSFW: true,
            moderationStatus: 'completed',
          });
        }
      }

    } catch (err) {
      console.error("Erro ao publicar o post:", err);
      setError("Ocorreu um erro ao publicar seu post. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
      {loadingModel && <Typography variant="caption" color="text.secondary">Carregando sistema de segurança...</Typography>}
      {error && <Alert severity="error">{error}</Alert>}

      <TextField
        fullWidth multiline rows={4} variant="outlined" label="No que você está pensando?"
        value={postContent} onChange={(e) => setPostContent(e.target.value)}
        placeholder="Digite algo legal..."
      />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button component="label" startIcon={<AttachFileIcon />}>
          Anexar Mídia
          <input type="file" hidden ref={fileInputRef} onChange={handleFileChange} accept="image/*,video/*" />
        </Button>
        {fileName && <Typography variant="caption" noWrap sx={{ flexShrink: 1, ml: 1, maxWidth: '150px' }}>{fileName}</Typography>}
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
