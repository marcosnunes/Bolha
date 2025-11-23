const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");
const { GoogleGenerativeAI } = require("@google/generative-ai");

admin.initializeApp();

// Inicializa o cliente da API do Gemini. A chave será acessada via process.env
// que é preenchido pelo sistema de Secrets do Firebase.
let genAI;
if (process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
} else {
    logger.warn("Secret GEMINI_API_KEY não configurada. A função de insights não funcionará.");
}

// A função deleteUserAccount permanece a mesma
exports.deleteUserAccount = onCall({ region: "us-central1" }, async (request) => {
  const { auth } = request;

  if (!auth) {
    logger.error("Tentativa de exclusão de conta não autenticada.");
    throw new HttpsError(
      "unauthenticated",
      "Ação não permitida. Você precisa estar logado."
    );
  }

  const uid = auth.uid;
  const db = admin.database();
  const authAdmin = admin.auth();

  logger.info(`Iniciando o processo de exclusão para o UID: ${uid}`);

  try {
    const updates = {};
    updates[`/profiles/${uid}`] = null;
    updates[`/users/${uid}`] = null;
    
    const postsQuery = db.ref("/posts").orderByChild("authorId").equalTo(uid);
    const postsSnapshot = await postsQuery.once("value");
    if (postsSnapshot.exists()) {
      postsSnapshot.forEach((child) => {
        updates[`/posts/${child.key}`] = null;
      });
    }

    await db.ref().update(updates);
    logger.info(`Dados do RTDB para o UID ${uid} foram removidos.`);

    await authAdmin.deleteUser(uid);
    logger.info(`Usuário ${uid} apagado do Authentication com sucesso.`);

    return { success: true, message: "Sua conta foi removida com sucesso." };
  } catch (error) {
    logger.error(`Falha CRÍTICA ao apagar a conta para o UID: ${uid}`, error);
    throw new HttpsError(
      "internal",
      "Ocorreu um erro interno ao processar sua solicitação.",
      error.message
    );
  }
});


// Adicionamos a opção "secrets" para dar acesso à chave da API
exports.generatePersonalInsights = onCall({ region: "us-central1", secrets: ["GEMINI_API_KEY"] }, async (request) => {
    const { auth, data } = request;
  
    if (!auth) {
      throw new HttpsError("unauthenticated", "Ação não permitida. Você precisa estar logado.");
    }
  
    const { prompt } = data;
    if (!prompt) {
        throw new HttpsError("invalid-argument", "A função precisa de um 'prompt' para ser executada.");
    }

    // Recriamos a instância aqui dentro para garantir que a variável de ambiente está carregada
    const localGenAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const uid = auth.uid;
    const db = admin.database();

    try {
        const profileRef = db.ref(`/profiles/${uid}`);
        const userPostsRef = db.ref("/posts").orderByChild("authorId").equalTo(uid);
        const allPostsRef = db.ref("/posts");

        const [profileSnap, userPostsSnap, allPostsSnap] = await Promise.all([
            profileRef.once("value"),
            userPostsRef.once("value"),
            allPostsRef.once("value")
        ]);

        const profile = profileSnap.val() || {};
        const userPosts = userPostsSnap.val() || {};
        const allPosts = allPostsSnap.val() || {};

        const likedPosts = Object.values(allPosts).filter(post => post.likes && post.likes[uid]);
        
        const userDataContext = {
            nickname: profile.nickname || 'Usuário',
            createdAt: profile.createdAt ? new Date(profile.createdAt).toLocaleDateString('pt-BR') : 'Não disponível',
            totalPosts: Object.keys(userPosts).length,
            totalLikesGiven: likedPosts.length,
            userPosts: Object.values(userPosts).map(p => ({ content: p.content, createdAt: new Date(p.createdAt).toISOString() })).slice(0, 20), // Limita para não exceder o prompt
            likedPosts: likedPosts.map(p => ({ content: p.content, authorNickname: p.authorNickname || 'Anônimo' })).slice(0, 20) // Limita para não exceder o prompt
        };

        const finalPrompt = `
            Você é o "Assistente de Insights" da rede social "Bolha". Sua missão é analisar os dados de um usuário e fornecer respostas amigáveis, inteligentes e úteis, em português do Brasil (pt-BR).
            
            ## CONTEXTO SOBRE O USUÁRIO:
            - Nickname: ${userDataContext.nickname}
            - Usuário desde: ${userDataContext.createdAt}
            - Total de posts criados: ${userDataContext.totalPosts}
            - Total de posts que curtiu: ${userDataContext.totalLikesGiven}
            - Alguns posts que o usuário escreveu (JSON): ${JSON.stringify(userDataContext.userPosts)}
            - Alguns posts que o usuário curtiu (JSON): ${JSON.stringify(userDataContext.likedPosts)}

            ## TAREFA:
            Com base no contexto acima, responda à seguinte pergunta do usuário de forma pessoal e criativa. Use os dados para embasar sua resposta.
            Seja conciso, mas informativo. Use formatação Markdown simples (negrito com ** e itálico com *) para destacar informações importantes.

            ## PERGUNTA DO USUÁRIO:
            "${prompt}"
        `;

        const model = localGenAI.getGenerativeModel({ model: "gemini-1.5-flash"});
        const generationResult = await model.generateContent(finalPrompt);
        const response = await generationResult.response;
        const text = await response.text();

        return { success: true, text: text };

    } catch (error) {
        logger.error(`Erro ao gerar insights para o UID: ${uid}`, error);
        throw new HttpsError("internal", "Ocorreu um erro ao buscar ou analisar seus dados.", error.message);
    }
});
