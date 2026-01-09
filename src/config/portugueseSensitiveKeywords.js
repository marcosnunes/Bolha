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
  if (!text) return { detected: false };
  
  const lowerText = text.toLowerCase();
  
  // Verificar cada categoria
  for (const category in PORTUGUESE_SENSITIVE_KEYWORDS) {
    const keywords = PORTUGUESE_SENSITIVE_KEYWORDS[category];
    
    for (const keyword of keywords) {
      // Simples: buscar a palavra diretamente (case-insensitive)
      if (lowerText.includes(keyword)) {
        // Dupla-validação: separar por espaços/pontuação e conferir se realmente é a palavra
        const cleanedText = lowerText.replace(/[^a-záéíóúâêãõç\s]/g, ' ');
        const words = cleanedText.split(/\s+/).filter(w => w.length > 0);
        
        if (words.includes(keyword)) {
          console.log(`[DEBUG] Detectada palavra sensível: "${keyword}" em categoria "${category}"`);
          return {
            detected: true,
            category,
            keyword
          };
        }
      }
    }
  }
  
  return { detected: false };
};
