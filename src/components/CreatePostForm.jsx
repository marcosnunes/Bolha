import { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { rtdb } from '../firebase/config';
import { ref, push, serverTimestamp, update } from 'firebase/database';
import useToxicityModel from '../hooks/useToxicityModel';

// Componentes e Ícones do MUI
import {
  Box, TextField, Button, CircularProgress, Alert, Typography, LinearProgress
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import InfoIcon from '@mui/icons-material/Info';

function CreatePostForm({ onPostSuccess }) {
  const [postContent, setPostContent] = useState('');
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
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
      // Limite de 100MB (100 * 1024 * 1024 bytes)
      const maxSize = 100 * 1024 * 1024;
      
      if (selectedFile.size > maxSize) {
         setError("O arquivo excede o limite máximo de 100MB.");
         setFile(null);
         setFileName("");
         // Limpa o input para permitir selecionar o mesmo arquivo novamente se necessário
         e.target.value = null; 
         return;
      }
      
      setFile(selectedFile);
      setFileName(selectedFile.name);
      setError('');
    }
  };

  // Função de Upload usando XMLHttpRequest
  const uploadToCloudinary = (file) => {
    return new Promise((resolve, reject) => {
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
      
      const resourceType = file.type.startsWith('video/') ? 'video' : 'image';
      const url = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;

      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);

      xhr.open('POST', url, true);
      
      xhr.timeout = 300000; // 5 minutos

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percent);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          const data = JSON.parse(xhr.responseText);
          resolve({ secure_url: data.secure_url, resource_type: data.resource_type });
        } else {
          try {
             const errorResp = JSON.parse(xhr.responseText);
             reject(new Error(errorResp.error?.message || 'Erro no Cloudinary'));
          } catch (e) {
             reject(new Error('Erro desconhecido no upload.'));
          }
        }
      };

      xhr.onerror = () => reject(new Error('Erro de rede. Verifique sua conexão.'));
      xhr.ontimeout = () => reject(new Error('O upload demorou muito e expirou.'));

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

      // 1. Upload
      if (file) {
        try {
          const uploadData = await uploadToCloudinary(file);
          mediaURL = uploadData.secure_url;
          mediaType = uploadData.resource_type;
        } catch (uploadErr) {
          console.error("Upload error:", uploadErr);
          throw new Error(`Falha no upload: ${uploadErr.message}`);
        }
      }

      // 2. Salvar no Firebase
      const postsListRef = ref(rtdb, 'posts');
      const newPostRef = push(postsListRef);
      
      const newPostData = {
        textContent: postContent,
        authorId: currentUser.uid,
        authorNickname: userProfile.nickname,
        authorPhotoURL: userProfile.photoURL || null,
        createdAt: serverTimestamp(),
        isNSFW: false,
        moderationStatus: 'pending',
        mediaURL: mediaURL || null,
        mediaType: mediaType || null
      };

      await update(newPostRef, newPostData);

      // 3. Limpeza
      setPostContent('');
      setFile(null);
      setFileName('');
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (onPostSuccess) onPostSuccess();

      // 4. Moderação em Background
      if (postContent && postContent.trim().length > 0) {
        const isToxicFromModel = await classifyText(postContent);
        const isForbiddenFromList = containsForbiddenWord(postContent);
        
        if (isToxicFromModel || isForbiddenFromList) {
          const postToUpdateRef = ref(rtdb, `posts/${newPostRef.key}`);
          await update(postToUpdateRef, { isNSFW: true, moderationStatus: 'completed' });
        }
      }

    } catch (err) {
      console.error("Erro no processo:", err);
      setError(err.message || "Erro ao publicar post.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
      {loadingModel && <Typography variant="caption">Verificando segurança...</Typography>}
      {error && <Alert severity="error">{error}</Alert>}

      <TextField
        fullWidth multiline rows={4} variant="outlined" label="No que você está pensando?"
        value={postContent} onChange={(e) => setPostContent(e.target.value)}
      />

      {/* Barra de Progresso */}
      {loading && file && (
        <Box sx={{ width: '100%' }}>
           <LinearProgress variant="determinate" value={uploadProgress} />
           <Typography variant="caption" color="text.secondary" align="center" display="block">
             Enviando arquivo... {uploadProgress}%
           </Typography>
        </Box>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Button component="label" startIcon={<AttachFileIcon />}>
            Anexar Mídia
            <input type="file" hidden ref={fileInputRef} onChange={handleFileChange} accept="image/*,video/*" />
          </Button>
        </Box>
        
        <Button
          variant="contained" type="submit" disabled={loading || loadingModel}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
        >
          {loading ? 'Postar' : 'Publicar'}
        </Button>
      </Box>

      {/* Nome do arquivo e Aviso de Limite */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, ml: 1 }}>
          {fileName && (
            <Typography variant="caption" noWrap sx={{ fontWeight: 'bold' }}>
              Arquivo: {fileName}
            </Typography>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary' }}>
            <InfoIcon sx={{ fontSize: 16, mr: 0.5 }} />
            <Typography variant="caption">
              Limite máximo: 100MB por arquivo (Vídeo/Foto)
            </Typography>
          </Box>
      </Box>

    </Box>
  );
}

export default CreatePostForm;
