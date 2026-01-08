import { useState, useCallback } from 'react';
import * as nsfwjs from 'nsfwjs';

const useNSFWDetection = () => {
  const [model, setModel] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Carrega o modelo na primeira vez que for necessário
  const loadModel = useCallback(async () => {
    if (model) return model;
    
    try {
      setLoading(true);
      setError(null);
      const loadedModel = await nsfwjs.load();
      setModel(loadedModel);
      return loadedModel;
    } catch (err) {
      console.error('Erro ao carregar modelo NSFW:', err);
      setError('Erro ao carregar modelo de detecção');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [model]);

  // Classifica uma imagem e retorna se é NSFW
  const classifyImage = useCallback(async (imageUrl) => {
    try {
      setError(null);
      
      const loadedModel = await loadModel();
      
      // Criar elemento de imagem
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = imageUrl;

      // Aguardar imagem carregar
      return new Promise((resolve, reject) => {
        img.onload = async () => {
          try {
            // Classificar imagem
            const predictions = await loadedModel.classify(img);
            
            // predictions é um array com: porn, hentai, sexy, neutral
            // Considerar NSFW se porn, hentai ou sexy tiverem probabilidade > threshold
            const threshold = 0.5; // 50% de confiança
            
            const pornScore = predictions.find(p => p.className === 'Porn')?.probability || 0;
            const hentaiScore = predictions.find(p => p.className === 'Hentai')?.probability || 0;
            const sexyScore = predictions.find(p => p.className === 'Sexy')?.probability || 0;
            
            const isNSFW = pornScore > threshold || hentaiScore > threshold || sexyScore > threshold;
            
            resolve({
              isNSFW,
              scores: {
                porn: pornScore,
                hentai: hentaiScore,
                sexy: sexyScore,
                neutral: predictions.find(p => p.className === 'Neutral')?.probability || 0
              },
              predictions
            });
          } catch (err) {
            console.error('Erro ao classificar imagem:', err);
            reject(err);
          }
        };

        img.onerror = () => {
          reject(new Error('Erro ao carregar imagem para análise'));
        };
      });
    } catch (err) {
      console.error('Erro na detecção NSFW:', err);
      // Fail-open: se houver erro, não marca como NSFW
      return {
        isNSFW: false,
        error: true,
        message: 'Não foi possível analisar a imagem, mas o post foi permitido'
      };
    }
  }, [loadModel]);

  // Classifica usando File ou Blob
  const classifyFile = useCallback(async (file) => {
    try {
      setError(null);

      // Converter File para URL
      const url = URL.createObjectURL(file);

      const result = await classifyImage(url);

      // Limpar URL temporária
      URL.revokeObjectURL(url);

      return result;
    } catch (err) {
      console.error('Erro na detecção NSFW:', err);
      return {
        isNSFW: false,
        error: true,
        message: 'Não foi possível analisar a imagem'
      };
    }
  }, [classifyImage]);

  return {
    model,
    loading,
    error,
    classifyImage,
    classifyFile,
    loadModel
  };
};

export default useNSFWDetection;
