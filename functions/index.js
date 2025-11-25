const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

// A definição da função agora é mais direta
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