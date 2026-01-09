import { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';

const usePerspectiveAPI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const validateText = async (text) => {
    if (!text || text.trim() === '') {
      return {
        isSensitive: false,
        reason: 'texto vazio'
      };
    }

    try {
      setLoading(true);
      setError(null);

      const functions = getFunctions();
      const validateTextWithPerspective = httpsCallable(functions, 'validateTextWithPerspective');

      const result = await validateTextWithPerspective({
        text: text.trim()
      });

      console.log('Perspective API resultado:', result.data);

      return result.data;
    } catch (err) {
      console.error('Erro ao validar com Perspective API:', err);
      setError(err.message);
      
      // Fail-open: em caso de erro, deixar passar
      return {
        isSensitive: false,
        reason: 'Erro na API (fail-open)',
        error: true
      };
    } finally {
      setLoading(false);
    }
  };

  return {
    validateText,
    loading,
    error
  };
};

export default usePerspectiveAPI;
