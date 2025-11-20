import { useState, useEffect } from 'react';

const useToxicityModel = () => {
  const [model, setModel] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadModel = async () => {
      try {
        // 'toxicity' fica disponível globalmente por causa do script que adicionamos no HTML
        const toxicityModel = await window.toxicity.load(0.9, []); // threshold = 0.9
        setModel(toxicityModel);
        setLoading(false);
        console.log("Modelo de toxicidade carregado com sucesso!");
      } catch (error) {
        console.error("Falha ao carregar o modelo de toxicidade:", error);
        setLoading(false);
      }
    };
    loadModel();
  }, []); // Array vazio garante que o modelo só será carregado uma vez

  const classifyText = async (text) => {
    if (!model) return null;
    
    const predictions = await model.classify([text]);
    // predictions é um array de resultados como:
    console.log("Previsões do Modelo:", predictions);
    // [{ label: 'toxicity', results: [{ probabilities: [0.1, 0.9], match: true }] }]
    
    let isToxic = false;
    predictions.forEach(p => {
      if (p.results[0].match) {
        isToxic = true;
      }
    });

    return isToxic;
  };

  return { model, loadingModel: loading, classifyText };
};

export default useToxicityModel;