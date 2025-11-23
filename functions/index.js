const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions/v2");
const admin = require("firebase-admin");
const { GoogleGenerativeAI } = require("@google/generative-ai");

admin.initializeApp();

// Acessa a chave de API do Gemini a partir das variáveis de ambiente do Firebase
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Declaração da função usando a sintaxe "Gen 2", que resolve o erro de deploy.
exports.generatePersonalInsights = onCall({ secrets: ["GEMINI_API_KEY"], region: "us-central1" }, async (request) => {

  // 1. Verifica se o usuário está autenticado
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "Você precisa estar logado para usar o assistente."
    );
  }

  const uid = request.auth.uid;
  const userPrompt = request.data.prompt;

  if (!userPrompt) {
    throw new HttpsError(
      "invalid-argument",
      "A função foi chamada sem um prompt."
    );
  }

  try {
    const rtdb = admin.database();
    const postsRef = rtdb.ref("posts");

    // 2. Busca todos os posts do usuário
    const snapshot = await postsRef.orderByChild("authorId").equalTo(uid).once("value");
    const userPosts = snapshot.val();

    let postContext = "";
    if (userPosts) {
        // 3. Formata os posts para enviar ao Gemini
        postContext = "Aqui está um histórico dos meus posts:\n\n";
        Object.keys(userPosts).forEach(key => {
            const post = userPosts[key];
            postContext += `- Postagem: \"${post.content}\" (Likes: ${Object.keys(post.likes || {}).length}, Dislikes: ${Object.keys(post.dislikes || {}).length})\n`;
        });
    } else {
        postContext = "O usuário ainda não fez nenhum post.";
    }

    // 4. Monta o prompt final para o Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const finalPrompt = `
      Você é um assistente pessoal para uma rede social chamada \"Bolha Social\".
      Sua tarefa é analisar a atividade de um usuário e fornecer insights úteis.
      Responda em markdown.

      Contexto do usuário (posts anteriores):
      ${postContext}

      Pergunta do usuário:
      \"${userPrompt}\"

      Sua análise:
    `;

    // 5. Chama a API do Gemini
    const result = await model.generateContent(finalPrompt);
    const response = await result.response;
    const text = response.text();

    // 6. Retorna a resposta para o cliente
    return { success: true, text: text };

  } catch (error) {
    logger.error("Erro na execução da Cloud Function:", error);
    throw new HttpsError(
      "internal",
      "Ocorreu um erro ao gerar os insights."
    );
  }
});
