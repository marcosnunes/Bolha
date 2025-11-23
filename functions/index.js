const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { GoogleGenerativeAI } = require("@google/generative-ai");

admin.initializeApp();

// Acessa a chave de API do Gemini a partir das variáveis de ambiente do Firebase
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.generatePersonalInsights = functions
  .runWith({ secrets: ["GEMINI_API_KEY"] }) // Garante que a chave de API está disponível
  .https.onCall(async (data, context) => {

  // 1. Verifica se o usuário está autenticado
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Você precisa estar logado para usar o assistente."
    );
  }

  const uid = context.auth.uid;
  const userPrompt = data.prompt;

  if (!userPrompt) {
    throw new functions.https.HttpsError(
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
    console.error("Erro na execução da Cloud Function:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Ocorreu um erro ao gerar os insights."
    );
  }
});
