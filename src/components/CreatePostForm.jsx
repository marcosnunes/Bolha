import { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useUpload } from '../contexts/UploadContext';
import useHuggingFaceModeration from '../hooks/useHuggingFaceModeration';
import useNSFWDetection from '../hooks/useNSFWDetection';

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
  const { validateText } = useHuggingFaceModeration();
  const { loading: nsfwLoading, classifyFile } = useNSFWDetection();
  const { addUpload, updateUploadStatus, updateUploadProgress, createPost } = useUpload();

  const fileInputRef = useRef(null);

  const containsLink = (text) => {
    if (!text) return false;
    const urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|])|(\bwww\.[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|])/ig;
    return urlRegex.test(text);
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

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    
    setError('');
    setInfo('');
    
    // Só comprimir imagens > 100MB na hora (síncrono)
    if (selectedFile.type.startsWith('image/') && selectedFile.size > 100 * 1024 * 1024) {
      setLoading(true);
      try {
        const compressed = await compressImage(selectedFile, 100);
        setFile(compressed);
        setFileName(selectedFile.name);
        const originalSizeMB = (selectedFile.size / 1024 / 1024).toFixed(2);
        const newSizeMB = (compressed.size / 1024 / 1024).toFixed(2);
        setInfo(`✓ Imagem comprimida: ${originalSizeMB}MB → ${newSizeMB}MB`);
      } catch (err) {
        setError(err.message);
        setFile(null);
        setFileName('');
        e.target.value = null;
      } finally {
        setLoading(false);
      }
    } else {
      // Vídeos e imagens pequenas: aceitar direto
      setFile(selectedFile);
      setFileName(selectedFile.name);
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

      // 1. Validar texto com Hugging Face (IA em português)
      if (postContent && postContent.trim().length > 0) {
        const result = await validateText(postContent);
        if (result.isSensitive) {
          isPostNSFW = true;
          console.log('Conteúdo sensível detectado (Hugging Face):', result);
        }
      }

      // 2. Classificar a imagem se houver
      if (file && file.type.startsWith('image/')) {
        try {
          const imageClassification = await classifyFile(file);
          if (imageClassification.isNSFW) {
            isPostNSFW = true;
            console.log('Imagem NSFW detectada');
          }
        } catch (err) {
          console.error('Erro ao classificar imagem:', err);
          // Fail-open: continua mesmo se der erro na classificação
        }
      }

      // Capturar dados antes de processar
      const capturedPost = postContent;
      const capturedFile = file;
      const capturedFileName = fileName;
      const capturedIsNSFW = isPostNSFW;

      // 3. Criar notificação IMEDIATAMENTE
      const isLargeVideo = file && file.type.startsWith('video/') && file.size > 100 * 1024 * 1024;
      
      const uploadId = addUpload({
        fileName: capturedFileName || 'Novo post',
        status: isLargeVideo ? 'processing' : 'uploading',
        progress: 0
      });

      // 3. Limpar formulário
      setPostContent('');
      setFile(null);
      setFileName('');
      setUploadProgress(0);
      setInfo('');
      setError('');
      if (fileInputRef.current) fileInputRef.current.value = "";
      
      // 4. Fechar modal DEPOIS de criar notificação
      if (onPostSuccess) {
        // Pequeno delay para garantir que o estado foi atualizado
        setTimeout(() => onPostSuccess(), 100);
      }

      // 5. Processar em background (IMPORTAR compressVideo localmente para não bloquear UI)
      setTimeout(async () => {
        try {
          let finalFile = capturedFile;
          
          // Se é vídeo grande, comprimir primeiro
          if (capturedFile && capturedFile.type.startsWith('video/') && capturedFile.size > 100 * 1024 * 1024) {
            updateUploadStatus(uploadId, 'processing');
            
            // Importar FFmpeg dinamicamente para não bloquear UI
            const { FFmpeg } = await import('@ffmpeg/ffmpeg');
            const { fetchFile, toBlobURL } = await import('@ffmpeg/util');
            
            const ffmpeg = new FFmpeg();
            
            // Listener de progresso
            ffmpeg.on('progress', ({ progress: p }) => {
              const progressPercent = Math.round(p * 100);
              try {
                updateUploadProgress(uploadId, progressPercent);
              } catch (err) {
                console.error('Erro ao atualizar progresso:', err);
              }
            });
            
            // Carregar FFmpeg
            const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
            await ffmpeg.load({
              coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
              wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm')
            });
            
            // Comprimir
            const inputName = 'input.mp4';
            const outputName = 'output.mp4';
            
            await ffmpeg.writeFile(inputName, await fetchFile(capturedFile));
            
            await ffmpeg.exec([
              '-i', inputName,
              '-c:v', 'libx264',
              '-preset', 'fast',
              '-crf', '28',
              '-b:v', '1000k',
              '-maxrate', '1000k',
              '-bufsize', '2M',
              '-vf', 'scale=1280:-2',
              '-c:a', 'aac',
              '-b:a', '128k',
              '-movflags', '+faststart',
              outputName
            ]);
            
            const data = await ffmpeg.readFile(outputName);
            const compressedBlob = new Blob([data.buffer], { type: 'video/mp4' });
            finalFile = new File(
              [compressedBlob],
              capturedFile.name.replace(/\.[^/.]+$/, '') + '_compressed.mp4',
              { type: 'video/mp4' }
            );
            
            await ffmpeg.deleteFile(inputName);
            await ffmpeg.deleteFile(outputName);
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
      {(loadingModel || nsfwLoading) && <Typography variant="caption">Verificando segurança...</Typography>}
      {error && <Alert severity="error">{error}</Alert>}
      {info && <Alert severity="info">{info}</Alert>}

      <TextField
        fullWidth multiline rows={4} variant="outlined" label="No que você está pensando?"
        value={postContent} onChange={(e) => setPostContent(e.target.value)}
        helperText="Dica: Use **negrito** ou *itálico* para estilizar. Pule uma linha para novo parágrafo."
      />

      {loading && file && (
        <Box sx={{ width: '100%' }}>
           <LinearProgress variant="determinate" value={uploadProgress} />
           <Typography variant="caption" color="text.secondary" align="center" display="block">
             Preparando arquivo... {uploadProgress}%
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
          variant="contained" type="submit" disabled={loading || loadingModel || nsfwLoading}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
        >
          {loading ? 'Publicando...' : 'Publicar'}
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
