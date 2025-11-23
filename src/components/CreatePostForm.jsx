import { useState, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { rtdb } from '../firebase/config';
import { ref, push, serverTimestamp, update } from 'firebase/database';
import useToxicityModel from '../hooks/useToxicityModel';

// Componentes e Ícones do MUI
import {
  TextField, Button, CircularProgress, Alert, Box, Typography, LinearProgress
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';

function CreatePostForm({ onPostSuccess }) {
  const [postContent, setPostContent] = useState('');
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0); // Estado para a barra de progresso
  const [error, setError] = useState('');
  
  const { currentUser, userProfile } = useAuth();
  const { loadingModel, classifyText } = useToxicityModel();

  const fileInputRef = useRef(null);

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

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Validação simples de tamanho (ex: alerta se for > 200MB, Cloudinary free pode falhar dependendo da conta)
      if (selectedFile.size > 190 * 1024 * 1024) {
         setError("Atenção: Arquivos muito grandes podem demorar ou falhar dependendo da sua conexão.");
      } else {
         setError('');
      }
      setFile(selectedFile);
      setFileName(selectedFile.name);
    }
  };

  // Função auxiliar para upload com XHR (Progresso Real)
  const uploadWithProgress = (file) => {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);

      const xhr = new XMLHttpRequest();
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      
      // Cloudinary endpoint
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`);

      // Monitorar progresso
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          setUploadProgress(Math.round(percentComplete));
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          const data = JSON.parse(xhr.responseText);
          resolve({ secure_url: data.secure_url, resource_type: data.resource_type });
        } else {
          reject(new Error('Falha no upload da mídia.'));
        }
      };

      xhr.onerror = () => reject(new Error('Erro de rede durante upload.'));

      xhr.send(formData);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (containsLink(postContent)) return setError("Posts contendo links não são permitidos.");
    if (!postContent.trim() && !file) return setError("O post precisa ter texto ou uma imagem/vídeo.");
    if (!currentUser || !userProfile) return setError("Você precisa estar logado para postar.");

    setLoading(true);
    setUploadProgress(0);

    try {
      let mediaURL = null;
      let mediaType = null;

      // 1. Upload da Mídia com Progresso
      if (file) {
        try {
          const uploadData = await uploadWithProgress(file);
          mediaURL = uploadData.secure_url;
          mediaType = uploadData.resource_type;
        } catch {
          throw new Error("Não foi possível enviar o arquivo. Verifique sua conexão ou tamanho do arquivo.");
        }
      }

      // 2. Criação do Post
      const postsListRef = ref(rtdb, 'posts');
      const newPostRef = push(postsListRef);
      
      const newPostData = {
        textContent: postContent,
        authorId: currentUser.uid,
        authorNickname: userProfile.nickname,
        createdAt: serverTimestamp(),
        isNSFW: false,
        moderationStatus: 'pending',
        mediaURL: mediaURL || null,
        mediaType: mediaType || null
      };

      if (userProfile.photoURL) newPostData.authorPhotoURL = userProfile.photoURL;

      await update(newPostRef, newPostData);

      setPostContent('');
      setFile(null);
      setFileName('');
      setUploadProgress(0);
      
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (onPostSuccess) onPostSuccess(); // Atualiza o Feed na Home

      // 3. Moderação
      if (postContent && postContent.trim().length > 0) {
        const isToxicFromModel = await classifyText(postContent);
        const isForbiddenFromList = containsForbiddenWord(postContent);
        
        if (isToxicFromModel || isForbiddenFromList) {
          const postToUpdateRef = ref(rtdb, `posts/${newPostRef.key}`);
          await update(postToUpdateRef, { isNSFW: true, moderationStatus: 'completed' });
        }
      }

    } catch (err) {
      console.error("Erro ao publicar:", err);
      setError(err.message || "Erro ao publicar post.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
      {loadingModel && <Typography variant="caption">Iniciando segurança...</Typography>}
      {error && <Alert severity="error">{error}</Alert>}

      <TextField
        fullWidth multiline rows={4} variant="outlined" label="No que você está pensando?"
        value={postContent} onChange={(e) => setPostContent(e.target.value)}
      />

      {/* Barra de Progresso de Upload */}
      {loading && file && (
        <Box sx={{ width: '100%' }}>
           <LinearProgress variant="determinate" value={uploadProgress} />
           <Typography variant="caption" color="text.secondary" align="center" display="block">
             Enviando mídia: {uploadProgress}%
           </Typography>
        </Box>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button component="label" startIcon={<AttachFileIcon />}>
          Anexar Mídia
          <input type="file" hidden ref={fileInputRef} onChange={handleFileChange} accept="image/*,video/*" />
        </Button>
        
        {fileName && <Typography variant="caption" noWrap sx={{ flexShrink: 1, ml: 1, maxWidth: 120 }}>{fileName}</Typography>}
        
        <Button
          variant="contained" type="submit" disabled={loading || loadingModel}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
        >
          {loading ? 'Enviando...' : 'Publicar'}
        </Button>
      </Box>
    </Box>
  );
}

export default CreatePostForm;
