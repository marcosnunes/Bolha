// Esta função roda nos servidores da Vercel (Node.js)
// Ela protege sua chave de API.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Apenas POST é permitido' });
  }

  const { prompt, userPosts } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ message: 'Chave da API não configurada no servidor.' });
  }

  try {
    // Construir o contexto para o Gemini com base nos posts do usuário
    const postsContext = userPosts.map(p => `- ${p.textContent} (${new Date(p.createdAt).toLocaleDateString()})`).join('\n');
    
    const fullPrompt = `
      Você é um assistente de uma rede social pessoal.
      Aqui estão as postagens recentes do usuário:
      ${postsContext}
      
      Pergunta do usuário: "${prompt}"
      
      Responda de forma amigável, curta e direta, baseando-se apenas nos posts acima. Se não houver posts suficientes, diga isso.
    `;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: fullPrompt }]
        }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Erro na API do Gemini');
    }

    const generatedText = data.candidates[0].content.parts[0].text;
    return res.status(200).json({ text: generatedText });

  } catch (error) {
    console.error('Erro na função serverless:', error);
    return res.status(500).json({ message: 'Erro ao gerar insights.', details: error.message });
  }
}