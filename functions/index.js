/* eslint-disable no-undef */

// Carregar .env APENAS se as variáveis não estão configuradas
// (para compatibilidade com desenvolvimento local)
if (!process.env.EMAIL_USER) {
  try {
    require("dotenv").config({ path: __dirname + "/.env" });
  } catch {
    // .env não existe em produção, é ok
  }
}

const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const cors = require("cors");

admin.initializeApp();

// Middleware CORS
const corsMiddleware = cors({ origin: true });

// Obter credenciais de email
// Prioridade:
// 1. firebase functions:config:set (process.env.EMAIL_USER)
// 2. .env arquivo (desenvolvimento local)
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;

// Log da configuração
logger.info(`✓ Email configurado: ${EMAIL_USER ? EMAIL_USER.substring(0, EMAIL_USER.indexOf("@")) + "@..." : "NÃO ENCONTRADO"}`);

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASSWORD,
  },
});

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const EIGHT_MONTHS_MS = 8 * 30 * 24 * 60 * 60 * 1000;
const TEN_MONTHS_MS = 10 * 30 * 24 * 60 * 60 * 1000;
const MAX_AUTO_DELETIONS_PER_RUN = 50;
const MAX_BACKFILL_UPDATES_PER_BATCH = 200;

function getFallbackLastSeenFromAuthRecord(authUserRecord) {
  if (authUserRecord.metadata?.lastSignInTime) {
    return new Date(authUserRecord.metadata.lastSignInTime).getTime();
  }
  if (authUserRecord.metadata?.creationTime) {
    return new Date(authUserRecord.metadata.creationTime).getTime();
  }
  return 0;
}

async function deleteUserAndData(uid, reason = "manual") {
  const db = admin.database();
  const authAdmin = admin.auth();

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
  await authAdmin.deleteUser(uid);
  logger.info(`Conta removida (${reason}) para UID: ${uid}`);
}

async function getLastActivityMs(uid, authUserRecord) {
  const lastSeenSnapshot = await admin.database().ref(`/users/${uid}/lastSeen`).once("value");
  const lastSeen = lastSeenSnapshot.val();
  if (typeof lastSeen === "number" && Number.isFinite(lastSeen)) {
    return lastSeen;
  }

  // Fallback seguro para contas antigas sem campo lastSeen.
  return getFallbackLastSeenFromAuthRecord(authUserRecord);
}

async function sendInactivityWarningEmail(user, stage) {
  if (!EMAIL_USER || !EMAIL_PASSWORD) {
    logger.warn("Credenciais de email ausentes. Avisos de inatividade nao enviados.");
    return false;
  }

  if (!user.email) {
    return false;
  }

  const monthsToDeletion = stage === "8m" ? 4 : 2;
  const subject = "Bolha: sua conta pode ser excluida por inatividade";
  const html = `
    <h2>Sentimos sua falta no Bolha</h2>
    <p>Identificamos que sua conta esta inativa.</p>
    <p>Se a inatividade chegar a 12 meses, sua conta e publicacoes serao excluidas automaticamente.</p>
    <p><strong>Prazo atual: ${monthsToDeletion} mes(es) para exclusao automatica.</strong></p>
    <p>Para manter sua conta, basta entrar no app novamente.</p>
  `;

  await transporter.sendMail({
    from: EMAIL_USER,
    to: user.email,
    subject,
    html,
  });

  return true;
}

async function maybeSendInactivityWarnings(user, inactiveForMs) {
  if (inactiveForMs >= ONE_YEAR_MS) {
    return { sent8m: false, sent10m: false };
  }

  const warningsRef = admin.database().ref(`/users/${user.uid}/inactivityWarnings`);
  const warningsSnapshot = await warningsRef.once("value");
  const warnings = warningsSnapshot.val() || {};
  const updates = {};

  let sent8m = false;
  let sent10m = false;

  if (inactiveForMs >= EIGHT_MONTHS_MS && inactiveForMs < TEN_MONTHS_MS && !warnings.warn8SentAt) {
    const sent = await sendInactivityWarningEmail(user, "8m");
    if (sent) {
      sent8m = true;
      updates.warn8SentAt = admin.database.ServerValue.TIMESTAMP;
    }
  }

  if (inactiveForMs >= TEN_MONTHS_MS && inactiveForMs < ONE_YEAR_MS && !warnings.warn10SentAt) {
    const sent = await sendInactivityWarningEmail(user, "10m");
    if (sent) {
      sent10m = true;
      updates.warn10SentAt = admin.database.ServerValue.TIMESTAMP;
    }
  }

  if (Object.keys(updates).length > 0) {
    await warningsRef.update(updates);
  }

  return { sent8m, sent10m };
}


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

  logger.info(`Iniciando o processo de exclusão para o UID: ${uid}`);

  try {
    await deleteUserAndData(uid, "manual");

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

// Exclusao silenciosa de contas com mais de 1 ano de inatividade.
exports.deleteInactiveAccounts = onSchedule(
  {
    region: "us-central1",
    schedule: "every sunday 03:00",
    timeZone: "America/Sao_Paulo",
  },
  async () => {
    const now = Date.now();
    let nextPageToken;
    let scanned = 0;
    let deleted = 0;
    let warning8mSent = 0;
    let warning10mSent = 0;
    let errors = 0;

    logger.info("Iniciando varredura de inatividade para exclusao automatica.");

    do {
      const page = await admin.auth().listUsers(1000, nextPageToken);

      for (const user of page.users) {
        scanned += 1;

        if (deleted >= MAX_AUTO_DELETIONS_PER_RUN) {
          logger.warn("Limite de exclusoes automaticas por execucao atingido.", {
            limit: MAX_AUTO_DELETIONS_PER_RUN,
          });
          break;
        }

        try {
          const lastActivityMs = await getLastActivityMs(user.uid, user);
          if (!lastActivityMs) continue;

          const inactiveForMs = now - lastActivityMs;
          if (inactiveForMs >= ONE_YEAR_MS) {
            await deleteUserAndData(user.uid, "inactive-1y");
            deleted += 1;
            continue;
          }

          const warningResult = await maybeSendInactivityWarnings(user, inactiveForMs);
          if (warningResult.sent8m) warning8mSent += 1;
          if (warningResult.sent10m) warning10mSent += 1;
        } catch (error) {
          errors += 1;
          logger.error(`Falha ao processar exclusao automatica para UID ${user.uid}`, error);
        }
      }

      if (deleted >= MAX_AUTO_DELETIONS_PER_RUN) {
        break;
      }

      nextPageToken = page.pageToken;
    } while (nextPageToken);

    logger.info("Varredura de inatividade concluida.", {
      scanned,
      deleted,
      warning8mSent,
      warning10mSent,
      errors,
      maxDeletionsPerRun: MAX_AUTO_DELETIONS_PER_RUN,
    });
  }
);

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

/**
 * Função de administrador para migração de comentários
 * CHAMAR UMA ÚNICA VEZ via Firebase CLI
 * firebase functions:shell
 * > migrateCommentLikesAdmin()
 */
exports.migrateCommentLikesAdmin = onRequest({ region: "us-central1" }, async (req, res) => {
  // Verificação simples: só aceita POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    logger.info("🔄 Iniciando migração de comentários...");

    const db = admin.database();
    const postsRef = db.ref("posts");

    const snapshot = await postsRef.once("value");
    const posts = snapshot.val() || {};

    let updatedCount = 0;
    let totalComments = 0;
    let skippedCount = 0;

    for (const [postId, postData] of Object.entries(posts)) {
      if (!postData.comments) continue;

      for (const [commentId, commentData] of Object.entries(postData.comments)) {
        totalComments++;

        // Verificar se precisa de migração
        const needsMigration = !commentData.likes || !commentData.authorId || !commentData.authorNickname;

        if (needsMigration) {
          const updates = {};
          
          // Adicionar likes se não existir
          if (!commentData.likes) {
            updates[`posts/${postId}/comments/${commentId}/likes`] = {};
          }
          
          // Tentar recuperar dados do autor se faltar
          if (!commentData.authorId && postData.authorId) {
            updates[`posts/${postId}/comments/${commentId}/authorId`] = postData.authorId;
          }
          if (!commentData.authorNickname && postData.authorNickname) {
            updates[`posts/${postId}/comments/${commentId}/authorNickname`] = postData.authorNickname;
          }
          if (!commentData.authorPhotoURL && postData.authorPhotoURL) {
            updates[`posts/${postId}/comments/${commentId}/authorPhotoURL`] = postData.authorPhotoURL;
          }
          
          if (Object.keys(updates).length > 0) {
            await db.ref().update(updates);
            updatedCount++;
            logger.log(`✅ Comentário ${commentId} atualizado`);
          }
        } else {
          skippedCount++;
        }
      }
    }

    const result = {
      success: true,
      totalComments,
      updatedCount,
      skippedCount,
      message: `✨ Migração concluída! ${updatedCount} comentários atualizados.`
    };

    logger.info(`✨ Migração finalizada: ${JSON.stringify(result)}`);
    return res.status(200).json(result);
  } catch (error) {
    logger.error("❌ Erro na migração:", error);
    return res.status(500).json({
      error: `Erro na migração: ${error.message}`
    });
  }
});

/**
 * Backfill de lastSeen para contas antigas que ainda nao possuem users/{uid}/lastSeen.
 *
 * Seguranca:
 * - Exige metodo POST
 * - Exige cabecalho x-admin-key igual a process.env.MIGRATION_ADMIN_KEY
 *
 * Modo:
 * - dryRun=true (padrao): apenas simula e retorna contagens
 * - dryRun=false: grava no RTDB em lotes
 */
exports.backfillLastSeenAdmin = onRequest({ region: "us-central1", secrets: ["MIGRATION_ADMIN_KEY"] }, async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const adminKey = process.env.MIGRATION_ADMIN_KEY;
  const incomingKey = req.headers["x-admin-key"];

  if (!adminKey) {
    logger.error("MIGRATION_ADMIN_KEY não configurada no ambiente.");
    return res.status(500).json({ error: "Chave administrativa não configurada" });
  }

  if (!incomingKey || incomingKey !== adminKey) {
    return res.status(403).json({ error: "Acesso negado" });
  }

  const dryRun = req.query.dryRun !== "false" && req.body?.dryRun !== false;

  try {
    let nextPageToken;
    let scanned = 0;
    let alreadyHadLastSeen = 0;
    let eligibleToBackfill = 0;
    let backfilled = 0;
    let skippedNoFallback = 0;

    const pendingUpdates = {};

    const flushUpdatesIfNeeded = async (force = false) => {
      const pendingCount = Object.keys(pendingUpdates).length;
      if (dryRun || pendingCount === 0) return;

      if (force || pendingCount >= MAX_BACKFILL_UPDATES_PER_BATCH) {
        await admin.database().ref().update(pendingUpdates);
        Object.keys(pendingUpdates).forEach((key) => delete pendingUpdates[key]);
      }
    };

    do {
      const page = await admin.auth().listUsers(1000, nextPageToken);

      for (const user of page.users) {
        scanned += 1;

        const lastSeenSnapshot = await admin.database().ref(`/users/${user.uid}/lastSeen`).once("value");
        const existingLastSeen = lastSeenSnapshot.val();

        if (typeof existingLastSeen === "number" && Number.isFinite(existingLastSeen)) {
          alreadyHadLastSeen += 1;
          continue;
        }

        const fallbackLastSeen = getFallbackLastSeenFromAuthRecord(user);
        if (!fallbackLastSeen) {
          skippedNoFallback += 1;
          continue;
        }

        eligibleToBackfill += 1;

        if (!dryRun) {
          pendingUpdates[`/users/${user.uid}/lastSeen`] = fallbackLastSeen;
          backfilled += 1;
          await flushUpdatesIfNeeded();
        }
      }

      nextPageToken = page.pageToken;
    } while (nextPageToken);

    await flushUpdatesIfNeeded(true);

    const result = {
      success: true,
      dryRun,
      scanned,
      alreadyHadLastSeen,
      eligibleToBackfill,
      backfilled,
      skippedNoFallback,
      message: dryRun ?
        "Dry-run concluído. Nenhum dado foi alterado." :
        "Backfill de lastSeen concluído com sucesso.",
    };

    logger.info("Backfill de lastSeen finalizado.", result);
    return res.status(200).json(result);
  } catch (error) {
    logger.error("Erro no backfill de lastSeen:", error);
    return res.status(500).json({
      error: `Erro no backfill de lastSeen: ${error.message}`,
    });
  }
});

// ============================================
// Validação com Hugging Face + Modelo Português
// ============================================

/**
 * Cloud Function para validar conteúdo sensível usando Hugging Face
 * Usa modelos específicos para português (não requer modelo no cliente)
 * 
 * API usada: Hugging Face Inference API (gratuita)
 * Modelos: zero-shot-classification com labels em português
 * 
 * @param {string} text - Texto a validar
 * @returns {object} { isSensitive, confidence, label }
 */
// DESABILITADO: Moderação automática com Hugging Face
// Comentado porque estava sinalizando incorretamente todo conteúdo como false
/*
exports.validateTextWithHuggingFace = onCall({ region: "us-central1" }, async (request) => {
  const { text } = request.data;

  if (!text || text.trim() === '') {
    return {
      isSensitive: false,
      confidence: 0,
      reason: 'Texto vazio'
    };
  }

  try {
    // Obter API key do Firebase config ou .env
    const HF_API_KEY = config().huggingface?.api_key;

    if (!HF_API_KEY) {
      logger.warn('HUGGINGFACE_API_KEY não configurada');
      return {
        isSensitive: false,
        confidence: 0,
        fallback: true,
        reason: 'API key não configurada'
      };
    }

    // Estratégia 1: Zero-shot classification com labels em português
    // Detecta se o texto é "sensível" vs "apropriado"
    const zeroShotResponse = await fetch('https://api-inference.huggingface.co/models/facebook/bart-large-mnli', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${HF_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: text,
        parameters: {
          candidate_labels: ['conteúdo sensível e ofensivo', 'conteúdo apropriado e seguro'],
          multi_class: false
        }
      })
    });

    if (!zeroShotResponse.ok) {
      logger.warn(`Erro Hugging Face: ${zeroShotResponse.status}`);
      // Fallback para análise local se HF falhar
      return {
        isSensitive: false,
        confidence: 0,
        fallback: true,
        reason: 'Erro ao chamar Hugging Face'
      };
    }

    const zeroShotData = await zeroShotResponse.json();

    // Extrair resultado
    const scores = zeroShotData.scores || [];
    const labels = zeroShotData.labels || [];

    // Encontrar score de "conteúdo sensível"
    const sensitiveIndex = labels.findIndex(l => l.includes('sensível'));
    const sensitiveScore = sensitiveIndex >= 0 ? scores[sensitiveIndex] : 0;

    logger.info(`Hugging Face - Score sensível: ${(sensitiveScore * 100).toFixed(1)}% - Texto: "${text.substring(0, 50)}..."`);

    const isSensitive = sensitiveScore > 0.6; // Threshold: 60%

    return {
      isSensitive,
      confidence: sensitiveScore,
      label: labels[0] || 'indeterminado',
      reason: isSensitive ? `Conteúdo detectado como sensível (${(sensitiveScore * 100).toFixed(1)}%)` : 'Conteúdo apropriado'
    };

  } catch (error) {
    logger.error('Erro ao validar com Hugging Face:', error);
    return {
      isSensitive: false,
      confidence: 0,
      error: error.message,
      fallback: true,
      reason: 'Erro na validação'
    };
  }
});
*/
