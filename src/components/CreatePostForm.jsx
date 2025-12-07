import { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { rtdb } from '../firebase/config';
import { ref, push, serverTimestamp, update } from 'firebase/database';
import useToxicityModel from '../hooks/useToxicityModel';
import useVideoCompressor from '../hooks/useVideoCompressor';

// Componentes e Ícones do MUI
import {
  TextField, Button, CircularProgress, Alert, Box, Typography, LinearProgress
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
  const [info, setInfo] = useState('');
  
  const { currentUser, userProfile } = useAuth();
  const { loadingModel, classifyText } = useToxicityModel();
  const { compressVideo, loading: compressingVideo, progress: compressionProgress } = useVideoCompressor();

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

  // Função para comprimir imagem usando Canvas API
  const compressImage = (file, maxSizeMB = 100) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Reduzir dimensões progressivamente até arquivo ficar < 100MB
          let quality = 0.9;
          const maxSizeBytes = maxSizeMB * 1024 * 1024;
          
          // Calcular redução proporcional baseada no tamanho do arquivo
          const scaleFactor = Math.sqrt(maxSizeBytes / file.size);
          
          if (scaleFactor < 1) {
            width = Math.floor(width * scaleFactor);
            height = Math.floor(height * scaleFactor);
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // Tentar comprimir com diferentes qualidades
          const attemptCompress = (q) => {
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  reject(new Error('Falha ao comprimir imagem'));
                  return;
                }
                
                // Se ainda está grande e podemos reduzir qualidade
                if (blob.size > maxSizeBytes && q > 0.3) {
                  attemptCompress(q - 0.1);
                } else {
                  const compressedFile = new File([blob], file.name, {
                    type: 'image/jpeg',
                    lastModified: Date.now(),
                  });
                  resolve(compressedFile);
                }
              },
              'image/jpeg',
              q
            );
          };
          
          attemptCompress(quality);
        };
        
        img.onerror = () => reject(new Error('Falha ao carregar imagem'));
      };
      
      reader.onerror = () => reject(new Error('Falha ao ler arquivo'));
    });
  };

  // Função para processar arquivo antes do upload
  const processFile = async (file) => {
    const maxSize = 100 * 1024 * 1024; // 100MB - limite do Cloudinary free tier
    
    // Se é imagem maior que 100MB, comprimir
    if (file.type.startsWith('image/')) {
      if (file.size > maxSize) {
        setError(''); // Limpa erro anterior
        try {
          const compressed = await compressImage(file, 100);
          console.log(`Imagem comprimida: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(compressed.size / 1024 / 1024).toFixed(2)}MB`);
          return compressed;
        } catch (err) {
          throw new Error(`Erro ao comprimir imagem: ${err.message}`);
        }
      }
      return file;
    }
    
    // Se é vídeo, comprimir automaticamente se > 100MB
    if (file.type.startsWith('video/')) {
      const fileSizeMB = file.size / 1024 / 1024;
      
      if (file.size > maxSize) {
        setInfo(`🎬 Comprimindo vídeo (${fileSizeMB.toFixed(2)}MB)... Isso pode levar alguns minutos.`);
        try {
          const compressed = await compressVideo(file, 95); // Comprimir para ~95MB
          const compressedSizeMB = compressed.size / 1024 / 1024;
          
          console.log(`Vídeo comprimido: ${fileSizeMB.toFixed(2)}MB → ${compressedSizeMB.toFixed(2)}MB`);
          setInfo(`✓ Vídeo comprimido com sucesso: ${fileSizeMB.toFixed(2)}MB → ${compressedSizeMB.toFixed(2)}MB`);
          
          return compressed;
        } catch (err) {
          throw new Error(`Erro ao comprimir vídeo: ${err.message}. Tente usar um vídeo menor.`);
        }
      }
      
      if (fileSizeMB > 50) {
        setInfo(`⏳ Vídeo detectado (${fileSizeMB.toFixed(2)}MB). Isso pode levar alguns minutos para fazer upload.`);
      }
      
      return file;
    }
    
    return file;
  };

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    
    setError('');
    setInfo('');
    setLoading(true);
    
    try {
      const processedFile = await processFile(selectedFile);
      setFile(processedFile);
      setFileName(selectedFile.name);
      
      // Mostrar mensagem se arquivo foi comprimido
      if (processedFile.size < selectedFile.size) {
        const originalSizeMB = (selectedFile.size / 1024 / 1024).toFixed(2);
        const newSizeMB = (processedFile.size / 1024 / 1024).toFixed(2);
        setInfo(`✓ Imagem comprimida automaticamente: ${originalSizeMB}MB → ${newSizeMB}MB`);
      }
    } catch (err) {
      setError(err.message);
      setFile(null);
      setFileName('');
      e.target.value = null;
    } finally {
      setLoading(false);
    }
  };

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
      
      // Upload simples sem transformações - deixar Cloudinary processar naturalmente
      // As transformações serão aplicadas via URL quando necessário

      xhr.open('POST', url, true);
      // Aumentar timeout para vídeos grandes (10 minutos)
      xhr.timeout = resourceType === 'video' ? 600000 : 300000; 

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
          } catch {
             reject(new Error('Erro desconhecido no upload.'));
          }
        }
      };

      xhr.onerror = () => {
        // Detectar erro CORS específico
        if (xhr.status === 0) {
          reject(new Error('Erro de CORS: Verifique as configurações do upload preset no Cloudinary. O domínio atual precisa estar na lista de domínios permitidos.'));
        } else {
          reject(new Error('Erro de rede. Verifique sua conexão.'));
        }
      };
      xhr.ontimeout = () => reject(new Error('O upload demorou muito e expirou. Tente um arquivo menor ou aguarde e tente novamente.'));

      xhr.send(formData);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');

    if (containsLink(postContent)) return setError("Posts contendo links não são permitidos.");
    if (!postContent.trim() && !file) return setError("O post precisa ter texto ou uma imagem/vídeo.");
    if (!currentUser || !userProfile) return setError("Você precisa estar logado para postar.");

    setLoading(true);
    setUploadProgress(0);

    try {
      let mediaURL = null;
      let mediaType = null;
      let isPostNSFW = false;

      // 1. Classificar o texto ANTES de qualquer outra coisa
      if (postContent && postContent.trim().length > 0) {
        const isToxicFromModel = await classifyText(postContent);
        const isForbiddenFromList = containsForbiddenWord(postContent);
        if (isToxicFromModel || isForbiddenFromList) {
          isPostNSFW = true;
        }
      }

      // 2. Fazer o upload do arquivo, se existir
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

      // 3. Criar o post no DB com todos os dados corretos em UMA operação
      const postsListRef = ref(rtdb, 'posts');
      const newPostRef = push(postsListRef);
      
      const newPostData = {
        textContent: postContent,
        authorId: currentUser.uid,
        authorNickname: userProfile.nickname,
        authorPhotoURL: userProfile.photoURL || null,
        createdAt: serverTimestamp(),
        isNSFW: isPostNSFW, // Usar o valor já classificado
        moderationStatus: 'completed', // O status já está definido
        mediaURL: mediaURL || null,
        mediaType: mediaType || null
      };

      await update(newPostRef, newPostData);

      // 4. Limpar o formulário e dar feedback de sucesso
      setPostContent('');
      setFile(null);
      setFileName('');
      setUploadProgress(0);
      setInfo('');
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (onPostSuccess) onPostSuccess();

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
      {info && <Alert severity="info">{info}</Alert>}

      <TextField
        fullWidth multiline rows={4} variant="outlined" label="No que você está pensando?"
        value={postContent} onChange={(e) => setPostContent(e.target.value)}
        helperText="Dica: Use **negrito** ou *itálico* para estilizar. Pule uma linha para novo parágrafo."
        disabled={compressingVideo}
      />

      {compressingVideo && (
        <Box sx={{ width: '100%' }}>
           <LinearProgress variant="determinate" value={compressionProgress} />
           <Typography variant="caption" color="text.secondary" align="center" display="block">
             🎬 Comprimindo vídeo... {compressionProgress}%
           </Typography>
           <Typography variant="caption" color="text.secondary" align="center" display="block">
             Isso pode levar alguns minutos. Não feche esta página.
           </Typography>
        </Box>
      )}

      {loading && file && !compressingVideo && (
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
          variant="contained" type="submit" disabled={loading || loadingModel || compressingVideo}
          startIcon={loading || compressingVideo ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
        >
          {compressingVideo ? 'Comprimindo...' : loading ? 'Publicando...' : 'Publicar'}
        </Button>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, ml: 1 }}>
          {fileName && (
            <Typography variant="caption" noWrap sx={{ fontWeight: 'bold' }}>
              Arquivo: {fileName}
            </Typography>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary' }}>
            <InfoIcon sx={{ fontSize: 16, mr: 0.5 }} />
            <Typography variant="caption">
              Imagens e vídeos grandes são comprimidos/otimizados automaticamente durante o upload.
            </Typography>
          </Box>
      </Box>

    </Box>
  );
}

export default CreatePostForm;
