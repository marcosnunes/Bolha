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
    'caralho',
    'bct',
    'xana',
    'xoxota',
    'xereca',
    'piranhas',
    'vadias',
    'putas',
    'novinha',
    'virgem',
    'amamentar',
    'mamãe',
    'pauzão',
    'gostosa',
    'gostoso',
    'rabuda',
    'putinha',
    'memu',
    'nudes'
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
    'vou te matar',
    'assassinar',
    'botar fogo',
    'queimar vivo',
    'facada',
    'pedrada',
    'murro',
    'paulada',
    'apunhalar',
    'enforcamento',
    'enforcar',
    'crucificar',
    'massacre'
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
    'nazismo',
    'lgbtfóbico',
    'racista',
    'xenófobo',
    'antissemita',
    'cigano',
    'muçulmano',
    'árabe',
    'chinês',
    'índio',
    'gay',
    'lésbica',
    'trans',
    'travesti',
    'comunista',
    'bolchevique',
    'zika'
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
    'seu nojento',
    'idiota',
    'estúpido',
    'débil',
    'imbecil',
    'burro',
    'tapado',
    'jumento',
    'asno',
    'sua mãe',
    'tua mãe',
    'filho da mãe',
    'fdp',
    'meu pau',
    'chupa',
    'pau no seu cu',
    'vai se foder',
    'cretino',
    'malandro',
    'safadeza',
    'pilantra'
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
      // Método 1: Usar word boundary (mais preciso)
      let regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      if (regex.test(lowerText)) {
        return {
          detected: true,
          category,
          keyword,
          method: 'boundary'
        };
      }
      
      // Método 2: Busca direta se word boundary falhar (fallback para palavras isoladas)
      // Importante para casos como "sua puta" onde a detecção com \b pode falhar
      if (lowerText.includes(keyword)) {
        // Validar que é realmente a palavra (não parte de outra palavra)
        // Ex: "puta" não deve detectar em "deputado"
        const words = lowerText.split(/[^a-záéíóúâêãõç]+/);
        if (words.includes(keyword)) {
          return {
            detected: true,
            category,
            keyword,
            method: 'direct'
          };
        }
      }
    }
  }
  
  return { detected: false };
};
