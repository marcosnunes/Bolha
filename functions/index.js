/* eslint-disable no-undef */
const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const cors = require("cors");

admin.initializeApp();

// Middleware CORS
const corsMiddleware = cors({ origin: true });

// Carregar variáveis de .env.local localmente (development)
try {
  require('dotenv').config({ path: '.env.local' });
} catch (e) {
  // Em produção, vai usar process.env diretamente
}

// Obter credenciais de email
// Em desenvolvimento: .env.local
// Em produção: Firebase CLI transforma email.user em email_user
const EMAIL_USER = process.env.EMAIL_USER || process.env.email_user;
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD || process.env.email_password;

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASSWORD,
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

// Função para enviar email de verificação (HTTP com CORS)
exports.sendVerificationEmail = onRequest({ region: "us-central1" }, async (req, res) => {
  // Aplicar CORS
  corsMiddleware(req, res, async () => {
    // Apenas POST
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Método não permitido" });
    }

    // Obter token do Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Não autenticado" });
    }

    const idToken = authHeader.split("Bearer ")[1];

    try {
      // Debug detalhado: Log variáveis de ambiente
      logger.info(`=== DEBUG EMAIL CONFIG ===`);
      logger.info(`EMAIL_USER: "${EMAIL_USER}"`);
      logger.info(`EMAIL_USER length: ${EMAIL_USER ? EMAIL_USER.length : 0}`);
      logger.info(`EMAIL_PASSWORD: "${EMAIL_PASSWORD ? EMAIL_PASSWORD.substring(0, 4) + '...' : 'NÃO CONFIGURADO'}"`);
      logger.info(`EMAIL_PASSWORD length: ${EMAIL_PASSWORD ? EMAIL_PASSWORD.length : 0}`);
      
      // Verificar se estão vazios ou undefined
      if (!EMAIL_USER) {
        logger.error('❌ EMAIL_USER não está configurado!');
        return res.status(500).json({
          error: "Configuração de email não encontrada. EMAIL_USER não definido."
        });
      }
      
      if (!EMAIL_PASSWORD) {
        logger.error('❌ EMAIL_PASSWORD não está configurado!');
        return res.status(500).json({
          error: "Configuração de email não encontrada. EMAIL_PASSWORD não definido."
        });
      }
      
      logger.info(`✅ Credenciais carregadas com sucesso`);
      
      // Verificar token
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const uid = decodedToken.uid;
      const email = decodedToken.email;
      
      const db = admin.database();

      // Buscar dados do usuário
      const userRef = db.ref(`profiles/${uid}`);
      const snapshot = await userRef.once("value");
      const userProfile = snapshot.val() || {};

      // Verificar se o usuário tem foto de perfil
      if (!userProfile.photoURL) {
        return res.status(400).json({
          error: "Apenas usuários com foto de perfil podem ser verificados"
        });
      }

      // Verificar se já está verificado
      if (userProfile.isVerified) {
        return res.status(400).json({
          error: "Sua conta já está verificada"
        });
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

      // Construir URL de verificação
      const verificationUrl = `https://bolha-social.vercel.app/verificacao/${uid}/${verificationToken}`;

      // Enviar email
      const mailOptions = {
        from: EMAIL_USER,  // Use a variável carregada, não process.env.EMAIL_USER
        to: email,
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

      logger.info(`Tentando enviar email de ${mailOptions.from} para ${email}`);
      await transporter.sendMail(mailOptions);
      logger.info(`✅ Email de verificação enviado para o UID: ${uid}`);

      return res.status(200).json({
        success: true,
        message: "Email de verificação enviado com sucesso"
      });
    } catch (error) {
      logger.error("❌ Erro ao enviar email de verificação:", error);
      
      if (error.code === "auth/argument-error") {
        return res.status(401).json({ error: "Token inválido" });
      }
      
      return res.status(500).json({
        error: "Erro ao enviar email de verificação: " + error.message
      });
    }
  });
});

// Função para verificar token e marcar conta como verificada (HTTP com CORS)
exports.verifyEmailToken = onRequest({ region: "us-central1" }, async (req, res) => {
  // Aplicar CORS
  corsMiddleware(req, res, async () => {
    // Apenas GET (ou POST se preferir)
    if (req.method !== "GET" && req.method !== "POST") {
      return res.status(405).json({ error: "Método não permitido" });
    }

    // Extrair UID e token dos parâmetros (URL ou body)
    const uid = req.query.uid || req.body?.uid;
    const token = req.query.token || req.body?.token;

    if (!uid || !token) {
      return res.status(400).json({
        error: "UID e token são obrigatórios"
      });
    }

    const db = admin.database();

    try {
      // Buscar token de verificação
      const tokenRef = db.ref(`verificationTokens/${uid}`);
      const snapshot = await tokenRef.once("value");
      const tokenData = snapshot.val();

      if (!tokenData) {
        return res.status(404).json({
          error: "Token de verificação não encontrado"
        });
      }

      // Verificar se token é válido
      if (tokenData.token !== token) {
        return res.status(400).json({
          error: "Token de verificação inválido"
        });
      }

      // Verificar expiração
      if (Date.now() > tokenData.expiresAt) {
        return res.status(400).json({
          error: "Token de verificação expirou"
        });
      }

      // Marcar usuário como verificado
      await db.ref(`profiles/${uid}`).update({
        isVerified: true,
        verifiedAt: admin.database.ServerValue.TIMESTAMP,
      });

      // Remover token de verificação
      await tokenRef.remove();

      logger.info(`Usuário ${uid} verificado com sucesso`);

      return res.status(200).json({
        success: true,
        message: "Conta verificada com sucesso"
      });
    } catch (error) {
      logger.error(`Erro ao verificar token para o UID: ${uid}`, error);
      return res.status(500).json({
        error: "Erro ao verificar email: " + error.message
      });
    }
  });
});