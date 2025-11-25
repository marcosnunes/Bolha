import { useState, useEffect } from 'react';

const useToxicityModel = () => {
  const [model, setModel] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadModel = async () => {
      try {
        // 'toxicity' fica disponível globalmente por causa do script no HTML
        // Carregamos com threshold 0.85 (levemente menos estrito que 0.9)
        const toxicityModel = await window.toxicity.load(0.85, []); 
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

  const classifyText = async (text) => {
    // SE O TEXTO FOR VAZIO OU NULO, NÃO É TÓXICO.
    if (!model || !text || text.trim() === '') return false;
    
    try {
      const predictions = await model.classify([text]);
      
      let isToxic = false;
      predictions.forEach(p => {
        // Verifica se houve match em alguma categoria
        if (p.results[0].match) {
          isToxic = true;
        }
      });

      return isToxic;
    } catch (error) {
      console.error("Erro na classificação do texto:", error);
      // Em caso de erro na IA, deixamos passar (fail-open) para não travar o usuário
      return false;
    }
  };

  return { model, loadingModel: loading, classifyText };
};

export default useToxicityModel;
