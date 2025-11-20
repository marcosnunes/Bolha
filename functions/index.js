import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

// É uma boa prática definir a região
export const deleteUserAccount = functions.region("us-central1").https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Ação não permitida. Você precisa estar logado."
    );
  }

  const uid = context.auth.uid;
  const db = admin.database();
  const auth = admin.auth();

  console.log(`Iniciando exclusão da conta para o UID: ${uid}`);

  try {
    // 1. Apagar dados do Realtime Database
    const postsQuery = db.ref("/posts").orderByChild("authorId").equalTo(uid);
    const postsSnapshot = await postsQuery.once("value");

    const updates = {};
    if (postsSnapshot.exists()) {
      postsSnapshot.forEach((child) => {
        updates[`/posts/${child.key}`] = null;
      });
    }
    updates[`/profiles/${uid}`] = null;
    updates[`/users/${uid}`] = null;
    
    await db.ref().update(updates);
    console.log(`Dados do RTDB para o UID ${uid} foram removidos.`);

    // 2. Apagar o usuário do Authentication (este é o último passo)
    await auth.deleteUser(uid);
    console.log(`Usuário ${uid} apagado do Authentication com sucesso.`);

    return { success: true };

  } catch (error) {
    console.error(`Falha ao apagar a conta para o UID: ${uid}`, error);
    throw new functions.https.HttpsError(
      "internal",
      "Ocorreu um erro interno ao processar sua solicitação. Verifique os logs do servidor.",
      error
    );
  }
});