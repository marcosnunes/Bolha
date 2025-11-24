import { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { rtdb } from '../firebase/config';
import { ref, push, serverTimestamp, update } from 'firebase/database';
import useToxicityModel from '../hooks/useToxicityModel';
import { v4 as uuidv4 } from 'uuid'; // Vamos precisar de IDs únicos para o upload

// Componentes e Ícones do MUI
import {
  TextField, Button, CircularProgress, Alert, Box, Typography, LinearProgress
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';

// Função simples para gerar ID se não quiser instalar a lib uuid
const generateUniqueId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

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
      // Removemos a limitação artificial de tamanho aqui, o chunking vai lidar com isso.
      setFile(selectedFile);
      setFileName(selectedFile.name);
      setError('');
    }
  };

  const uploadFileInChunks = async (file) => {
    const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
    
    // Define se é video ou image baseada no tipo do arquivo
    const resourceType = file.type.startsWith('video/') ? 'video' : 'image';
    const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`;
    
    const XUniqueUploadId = generateUniqueId(); // ID único para esta sessão de upload
    const CHUNK_SIZE = 6 * 1024 * 1024; // 6MB por pedaço (seguro para mobile)
    const totalSize = file.size;
    let start = 0;
    let end = Math.min(CHUNK_SIZE, totalSize);

    while (start < totalSize) {
      const chunk = file.slice(start, end);
      const formData = new FormData();
      formData.append('file', chunk);
      formData.append('upload_preset', UPLOAD_PRESET);
      formData.append('cloud_name', CLOUD_NAME);
      
      // Cabeçalho CRUCIAL para dizer ao Cloudinary que é um pedaço
      const contentRange = `bytes ${start}-${end - 1}/${totalSize}`;

      try {
        const response = await fetch(url, {
          method: 'POST',
          body: formData,
          headers: {
            'X-Unique-Upload-Id': XUniqueUploadId,
            'Content-Range': contentRange
          }
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'Erro no upload do fragmento.');
        }

        // Se for o último pedaço, retorna os dados finais
        if (end === totalSize) {
          const data = await response.json();
          return { secure_url: data.secure_url, resource_type: data.resource_type };
        }

        // Atualiza progresso
        const percent = Math.round((end / totalSize) * 100);
        setUploadProgress(percent);

        // Prepara próximo pedaço
        start = end;
        end = Math.min(start + CHUNK_SIZE, totalSize);

      } catch (err) {
        console.error("Erro no chunk:", err);
        throw new Error("Falha na conexão durante o upload. Tente novamente.");
      }
    }
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

      // 1. Upload Inteligente
      if (file) {
        // Se o arquivo for pequeno (< 10MB), usa upload normal (mais rápido)
        // Se for grande, usa o chunked (mais seguro)
        if (file.size < 10 * 1024 * 1024) {
             // Lógica simplificada para arquivos pequenos dentro da mesma função se possível, 
             // mas para garantir, vamos chamar o chunked para tudo acima de 10MB ou videos
             const uploadData = await uploadFileInChunks(file);
             mediaURL = uploadData.secure_url;
             mediaType = uploadData.resource_type;
        } else {
             const uploadData = await uploadFileInChunks(file);
             mediaURL = uploadData.secure_url;
             mediaType = uploadData.resource_type;
        }
      }

      // 2. Criação do Post no Firebase
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

      // Limpeza e Sucesso
      setPostContent('');
      setFile(null);
      setFileName('');
      setUploadProgress(0);
      
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (onPostSuccess) onPostSuccess(); 

      // 3. Moderação (Fundo)
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
      setError(err.message || "Erro ao publicar post. Verifique sua conexão.");
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

      {/* Barra de Progresso de Upload */}
      {loading && file && (
        <Box sx={{ width: '100%' }}>
           <LinearProgress variant="determinate" value={uploadProgress} />
           <Typography variant="caption" color="text.secondary" align="center" display="block">
             Enviando arquivo... {uploadProgress}%
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
