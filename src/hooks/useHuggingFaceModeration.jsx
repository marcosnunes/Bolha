import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/config';

const useHuggingFaceModeration = () => {
  const validateText = async (text) => {
    if (!text || text.trim().length === 0) {
      return { isSensitive: false, confidence: 0 };
    }

    try {
      const validateWithHF = httpsCallable(functions, 'validateTextWithHuggingFace');
      const result = await validateWithHF({ text });
      
      console.log('✓ Validação Hugging Face:', result.data);
      return result.data;
    } catch (error) {
      console.error('Erro ao validar com Hugging Face:', error);
      // Fail-open: se der erro, deixa passar
      return {
        isSensitive: false,
        confidence: 0,
        error: error.message,
        fallback: true
      };
    }
  };

  return { validateText };
};

export default useHuggingFaceModeration;
