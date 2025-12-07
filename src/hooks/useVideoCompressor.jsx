import { useState, useRef, useCallback } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export default function useVideoCompressor() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const ffmpegRef = useRef(null);
  const [isReady, setIsReady] = useState(false);

  // Inicializar FFmpeg (só precisa fazer uma vez)
  const loadFFmpeg = useCallback(async () => {
    if (ffmpegRef.current) return;

    const ffmpeg = new FFmpeg();
    ffmpegRef.current = ffmpeg;

    // Monitorar progresso
    ffmpeg.on('progress', ({ progress: p }) => {
      setProgress(Math.round(p * 100));
    });

    ffmpeg.on('log', ({ message }) => {
      console.log('FFmpeg:', message);
    });

    try {
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      setIsReady(true);
    } catch (error) {
      console.error('Erro ao carregar FFmpeg:', error);
      throw new Error('Não foi possível inicializar o compressor de vídeo');
    }
  }, []);

  // Comprimir vídeo
  const compressVideo = useCallback(async (file) => {
    setLoading(true);
    setProgress(0);

    try {
      // Carregar FFmpeg se ainda não estiver carregado
      if (!isReady) {
        await loadFFmpeg();
      }

      const ffmpeg = ffmpegRef.current;
      const inputName = 'input.mp4';
      const outputName = 'output.mp4';

      // Escrever arquivo no sistema virtual do FFmpeg
      await ffmpeg.writeFile(inputName, await fetchFile(file));

      // Calcular bitrate aproximado para atingir tamanho desejado
      // Formula: (tamanho_alvo_MB * 8192) / duração_segundos
      // Usamos um valor conservador de 1000kbps para garantir < 100MB
      const videoBitrate = '1000k';
      const audioBitrate = '128k';

      // Comando FFmpeg para compressão otimizada
      // -c:v libx264: codec H.264
      // -preset fast: velocidade de encode (fast = bom equilíbrio)
      // -crf 28: qualidade (23=alta, 28=média, 32=baixa)
      // -b:v: bitrate do vídeo
      // -maxrate: bitrate máximo
      // -bufsize: buffer para controle de bitrate
      // -vf scale: redimensiona se necessário (manter proporção)
      // -c:a aac: codec de áudio AAC
      // -b:a: bitrate do áudio
      await ffmpeg.exec([
        '-i', inputName,
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '28',
        '-b:v', videoBitrate,
        '-maxrate', videoBitrate,
        '-bufsize', '2M',
        '-vf', 'scale=1280:-2', // Max 720p, manter proporção
        '-c:a', 'aac',
        '-b:a', audioBitrate,
        '-movflags', '+faststart', // Otimizar para streaming
        outputName
      ]);

      // Ler arquivo comprimido
      const data = await ffmpeg.readFile(outputName);
      const compressedBlob = new Blob([data.buffer], { type: 'video/mp4' });
      
      // Criar File object
      const compressedFile = new File(
        [compressedBlob],
        file.name.replace(/\.[^/.]+$/, '') + '_compressed.mp4',
        { type: 'video/mp4' }
      );

      // Limpar arquivos temporários
      await ffmpeg.deleteFile(inputName);
      await ffmpeg.deleteFile(outputName);

      setLoading(false);
      setProgress(0);

      return compressedFile;

    } catch (error) {
      setLoading(false);
      setProgress(0);
      console.error('Erro na compressão:', error);
      throw new Error(`Falha ao comprimir vídeo: ${error.message}`);
    }
  }, [isReady, loadFFmpeg]);

  return {
    compressVideo,
    loading,
    progress,
    isReady,
    loadFFmpeg
  };
}
