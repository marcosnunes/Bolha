// Lista de palavras-chave sensíveis em português para complementar a IA
// O TensorFlow.js toxicity model foi treinado principalmente em inglês
// Então usamos isso como complemento para detectar conteúdo sensível em português

export const PORTUGUESE_SENSITIVE_KEYWORDS = {
  sexual: [
    'transar',
    'sexo',
    'foder',
    'puta',
    'putaria',
    'prostituta',
    'cu',
    'buceta',
    'piranha',
    'vadia',
    'safada',
    'tarada',
    'tesão',
    'rola',
    'pênis',
    'caralho'
  ],
  violence: [
    'matar',
    'morte',
    'bater',
    'espancar',
    'estupro',
    'violência',
    'assassino',
    'vou te bater',
    'vou te matar'
  ],
  hate: [
    'negro imundo',
    'preto imundo',
    'judeu',
    'macaco',
    'bicha',
    'traveco',
    'retardado',
    'mongol',
    'deficiente',
    'aleijado',
    'nazista',
    'nazismo'
  ],
  offensive: [
    'arrombado',
    'arrombada',
    'babaca',
    'miserável',
    'desgraçado',
    'infame',
    'canalha',
    'seu lixo',
    'seu verme',
    'seu nojento'
  ]
};

// Verifica se o texto contém palavras-chave sensíveis em português
export const containsPortugueseSensitiveKeyword = (text) => {
  if (!text) return false;
  
  const lowerText = text.toLowerCase();
  
  // Verificar cada categoria
  for (const category in PORTUGUESE_SENSITIVE_KEYWORDS) {
    const keywords = PORTUGUESE_SENSITIVE_KEYWORDS[category];
    
    for (const keyword of keywords) {
      // Usar boundary word para evitar falsos positivos
      // Ex: "casa" não deve match "casaca"
      const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      if (regex.test(lowerText)) {
        return {
          detected: true,
          category,
          keyword
        };
      }
    }
  }
  
  return { detected: false };
};
