
import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Apenas o método POST é permitido' });
  }

  const { prompt, userPosts } = req.body;

  if (!prompt) {
    return res.status(400).json({ message: 'O prompt é obrigatório' });
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    let postContext = "";
    if (userPosts && userPosts.length > 0) {
        postContext = "Aqui está um histórico dos meus posts:\n\n";
        userPosts.forEach(post => {
            postContext += `- Postagem: \"${post.content}\" (Likes: ${post.likes || 0}, Dislikes: ${post.dislikes || 0})\n`;
        });
    } else {
        postContext = "O usuário ainda não fez nenhum post.";
    }

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const finalPrompt = `
      Você é um assistente pessoal para uma rede social chamada \"Bolha Social\".
      Sua tarefa é analisar a atividade de um usuário e fornecer insights úteis.
      Responda em markdown.

      Contexto do usuário (posts anteriores):
      ${postContext}

      Pergunta do usuário:
      \"${prompt}\"

      Sua análise:
    `;

    const result = await model.generateContent(finalPrompt);
    const response = await result.response;
    const text = response.text();

    return res.status(200).json({ success: true, text });

  } catch (error) {
    console.error("Erro ao chamar a API do Gemini:", error);
    return res.status(500).json({ message: 'Ocorreu um erro ao gerar os insights.' });
  }
}
