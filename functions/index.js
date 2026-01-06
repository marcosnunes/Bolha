/* eslint-disable no-undef */
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

admin.initializeApp();

// Configurar transporte de email (usando Gmail ou sua preferência)
// Para usar em produção, configure as variáveis de ambiente
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER || "seu-email@gmail.com",
    pass: process.env.EMAIL_PASSWORD || "sua-senha-app",
  },
});

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

// Função para enviar email de verificação
exports.sendVerificationEmail = onCall({ region: "us-central1" }, async (request) => {
  const { auth } = request;

  if (!auth) {
    logger.error("Tentativa de envio de email de verificação não autenticada.");
    throw new HttpsError(
      "unauthenticated",
      "Ação não permitida. Você precisa estar logado."
    );
  }

  const uid = auth.uid;
  const db = admin.database();

  try {
    // Buscar dados do usuário
    const userRef = db.ref(`profiles/${uid}`);
    const snapshot = await userRef.once("value");
    const userProfile = snapshot.val() || {};

    // Verificar se o usuário tem foto de perfil
    if (!userProfile.photoURL) {
      throw new HttpsError(
        "failed-precondition",
        "Apenas usuários com foto de perfil podem ser verificados"
      );
    }

    // Verificar se já está verificado
    if (userProfile.isVerified) {
      throw new HttpsError(
        "already-exists",
        "Sua conta já está verificada"
      );
    }

    // Gerar token de verificação
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const tokenExpiry = Date.now() + 24 * 60 * 60 * 1000; // 24 horas

    // Armazenar token no banco de dados
    await db.ref(`verificationTokens/${uid}`).set({
      token: verificationToken,
      expiresAt: tokenExpiry,
      createdAt: admin.database.ServerValue.TIMESTAMP,
    });

    // Construir URL de verificação (ajuste conforme seu domínio)
    const verificationUrl = `https://bolha.vercel.app/verificacao/${uid}/${verificationToken}`;

    // Enviar email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: auth.token.email,
      subject: "Verifique sua conta no Bolha",
      html: `
        <h2>Bem-vindo ao Bolha!</h2>
        <p>Clique no link abaixo para verificar sua conta:</p>
        <a href="${verificationUrl}" style="display: inline-block; padding: 10px 20px; background-color: #1976d2; color: white; text-decoration: none; border-radius: 5px;">
          Verificar Conta
        </a>
        <p>Este link expira em 24 horas.</p>
        <p>Se você não solicitou esta verificação, ignore este email.</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    logger.info(`Email de verificação enviado para o UID: ${uid}`);

    return { success: true, message: "Email de verificação enviado com sucesso" };
  } catch (error) {
    logger.error(`Erro ao enviar email de verificação para o UID: ${uid}`, error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError(
      "internal",
      "Erro ao enviar email de verificação: " + error.message
    );
  }
});

// Função para verificar token e marcar conta como verificada
exports.verifyEmailToken = onCall({ region: "us-central1" }, async (request) => {
  const { uid, token } = request.data;

  if (!uid || !token) {
    throw new HttpsError(
      "invalid-argument",
      "UID e token são obrigatórios"
    );
  }

  const db = admin.database();

  try {
    // Buscar token de verificação
    const tokenRef = db.ref(`verificationTokens/${uid}`);
    const snapshot = await tokenRef.once("value");
    const tokenData = snapshot.val();

    if (!tokenData) {
      throw new HttpsError(
        "not-found",
        "Token de verificação não encontrado"
      );
    }

    // Verificar se token é válido
    if (tokenData.token !== token) {
      throw new HttpsError(
        "invalid-argument",
        "Token de verificação inválido"
      );
    }

    // Verificar expiração
    if (Date.now() > tokenData.expiresAt) {
      throw new HttpsError(
        "deadline-exceeded",
        "Token de verificação expirou"
      );
    }

    // Marcar usuário como verificado
    await db.ref(`profiles/${uid}`).update({
      isVerified: true,
      verifiedAt: admin.database.ServerValue.TIMESTAMP,
    });

    // Remover token de verificação
    await tokenRef.remove();

    logger.info(`Usuário ${uid} verificado com sucesso`);

    return { success: true, message: "Conta verificada com sucesso" };
  } catch (error) {
    logger.error(`Erro ao verificar token para o UID: ${uid}`, error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError(
      "internal",
      "Erro ao verificar email: " + error.message
    );
  }
});