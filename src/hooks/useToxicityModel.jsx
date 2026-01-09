import { useState, useEffect } from 'react';

const useToxicityModel = () => {
  const [model, setModel] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadModel = async () => {
      try {
        // 'toxicity' fica disponível globalmente por causa do script no HTML
        // Carregamos com threshold 0.6 para ser mais sensível
        // Vamos verificar múltiplas categorias
        const toxicityModel = await window.toxicity.load(0.6, [
          'toxicity',
          'severe_toxicity',
          'identity_attack',
          'insult',
          'profanity',
          'threat',
          'sexual_explicit',
          'flirtation'
        ]); 
        setModel(toxicityModel);
        setLoading(false);
        console.log("Modelo de toxicidade carregado com sucesso!");
      } catch (error) {
        console.error("Falha ao carregar o modelo de toxicidade:", error);
        setLoading(false);
      }
    };
    loadModel();
  }, []); 

  // Classifica texto e retorna se é sensível/malicioso em qualquer categoria
  const classifyText = async (text) => {
    if (!model || !text || text.trim() === '') return false;
    
    try {
      const predictions = await model.classify([text]);
      
      let isSensitive = false;
      const scores = {};

      // Verifica cada categoria com thresholds específicos
      predictions.forEach(prediction => {
        const category = prediction.label;
        const probability = prediction.results[0].probabilities;
        
        // Armazenar score para debug
        scores[category] = probability[1]; // [false, true] -> queremos true
        
        // Thresholds específicos por categoria
        let threshold = 0.5; // padrão
        
        if (category === 'sexual_explicit') {
          threshold = 0.3; // Mais sensível para conteúdo sexual
        } else if (category === 'severe_toxicity') {
          threshold = 0.4; // Sensível para toxicidade severa
        } else if (category === 'threat') {
          threshold = 0.4; // Sensível para ameaças
        }
        
        // Considerar sensível se a probabilidade ultrapassar o threshold da categoria
        if (probability[1] > threshold) {
          isSensitive = true;
        }
      });

      console.log('Análise de sensibilidade:', { text: text.substring(0, 50), scores, isSensitive });
      
      return isSensitive;
    } catch (error) {
      console.error("Erro na classificação do texto:", error);
      // Fail-open: em caso de erro, deixar passar
      return false;
    }
  };

  // Função alternativa para ter mais controle - retorna scores detalhados
  const classifyTextDetailed = async (text) => {
    if (!model || !text || text.trim() === '') {
      return {
        isSensitive: false,
        scores: {},
        summary: 'texto vazio'
      };
    }
    
    try {
      const predictions = await model.classify([text]);
      
      let isSensitive = false;
      const scores = {};
      const flaggedCategories = [];

      predictions.forEach(prediction => {
        const category = prediction.label;
        const probability = prediction.results[0].probabilities;
        
        scores[category] = probability[1];
        
        // Thresholds específicos por categoria
        let threshold = 0.5; // padrão
        
        if (category === 'sexual_explicit') {
          threshold = 0.3; // Mais sensível para conteúdo sexual
        } else if (category === 'severe_toxicity') {
          threshold = 0.4; // Sensível para toxicidade severa
        } else if (category === 'threat') {
          threshold = 0.4; // Sensível para ameaças
        }
        
        if (probability[1] > threshold) {
          isSensitive = true;
          flaggedCategories.push(category);
        }
      });

      return {
        isSensitive,
        scores,
        flaggedCategories,
        summary: isSensitive ? `Conteúdo flagrado em: ${flaggedCategories.join(', ')}` : 'Conteúdo apropriado'
      };
    } catch (error) {
      console.error("Erro na classificação detalhada:", error);
      return {
        isSensitive: false,
        scores: {},
        error: true,
        summary: 'Erro na análise (permitindo por segurança)'
      };
    }
  };

  return { 
    model, 
    loadingModel: loading, 
    classifyText,
    classifyTextDetailed
  };
};

export default useToxicityModel;
