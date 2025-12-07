import { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useUpload } from '../contexts/UploadContext';
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
  const { addUpload, updateUploadStatus, updateUploadProgress, createPost } = useUpload();

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');

    if (containsLink(postContent)) return setError("Posts contendo links não são permitidos.");
    if (!postContent.trim() && !file) return setError("O post precisa ter texto ou uma imagem/vídeo.");
    if (!currentUser || !userProfile) return setError("Você precisa estar logado para postar.");

    try {
      let isPostNSFW = false;

      // 1. Classificar o texto ANTES de qualquer outra coisa
      if (postContent && postContent.trim().length > 0) {
        const isToxicFromModel = await classifyText(postContent);
        const isForbiddenFromList = containsForbiddenWord(postContent);
        if (isToxicFromModel || isForbiddenFromList) {
          isPostNSFW = true;
        }
      }

      // Capturar dados antes de processar
      const capturedPost = postContent;
      const capturedFile = file;
      const capturedFileName = fileName;
      const capturedIsNSFW = isPostNSFW;

      // 2. Mostrar mensagem informativa para o usuário
      const isLargeVideo = file && file.type.startsWith('video/') && file.size > 100 * 1024 * 1024;
      
      if (isLargeVideo) {
        setInfo('🎬 Seu vídeo será processado em segundo plano. Você pode fechar este modal e continuar navegando!');
      } else if (file) {
        setInfo('📤 Seu post será enviado em segundo plano. Você pode fechar este modal!');
      }

      // Aguardar um momento para usuário ver a mensagem
      await new Promise(resolve => setTimeout(resolve, 1500));

      // 3. Criar notificação ANTES de limpar formulário
      const uploadId = addUpload({
        fileName: capturedFileName || 'Post',
        status: isLargeVideo ? 'processing' : 'uploading',
        progress: 0
      });

      // 4. Limpar formulário e fechar modal
      setPostContent('');
      setFile(null);
      setFileName('');
      setUploadProgress(0);
      setInfo('');
      setError('');
      if (fileInputRef.current) fileInputRef.current.value = "";
      
      // Fechar modal
      if (onPostSuccess) onPostSuccess();

      // 5. Processar em background
      setTimeout(async () => {
        try {
          let finalFile = capturedFile;
          
          // Se é vídeo grande, comprimir primeiro
          if (capturedFile && capturedFile.type.startsWith('video/') && capturedFile.size > 100 * 1024 * 1024) {
            updateUploadStatus(uploadId, 'processing');
            
            // Comprimir com callback de progresso
            finalFile = await compressVideo(capturedFile, (progress) => {
              try {
                updateUploadProgress(uploadId, progress);
              } catch (err) {
                console.error('Erro ao atualizar progresso:', err);
              }
            });
          }
          
          // Fazer upload e criar post
          await createPost(
            { textContent: capturedPost, isNSFW: capturedIsNSFW },
            finalFile,
            uploadId,
            currentUser,
            userProfile
          );
        } catch (err) {
          console.error("Erro no background:", err);
          updateUploadStatus(uploadId, 'error', err.message || 'Erro desconhecido');
        }
      }, 500);

    } catch (err) {
      console.error("Erro no processo:", err);
      setError(err.message || "Erro ao publicar post.");
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
