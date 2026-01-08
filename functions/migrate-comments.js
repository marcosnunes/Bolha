/**
 * Script de migração para adicionar 'likes: {}' a comentários antigos
 * Este script usa o Firebase Admin SDK com credenciais de ambiente
 * 
 * Uso: node migrate-comments.js
 * 
 * ANTES DE EXECUTAR:
 * 1. Configure sua credencial do Firebase: export GOOGLE_APPLICATION_CREDENTIALS="/caminho/para/serviceAccountKey.json"
 * 2. Ou use: firebase functions:config:get > .runtimeconfig.json
 * 3. Ou execute via Firebase Functions Shell
 */

const admin = require('firebase-admin');
require('dotenv').config({ path: __dirname + '/.env' });

async function migrateComments() {
  try {
    console.log('🔄 Iniciando migração de comentários...\n');
    
    // Tentar inicializar com credenciais de ambiente
    if (!admin.apps.length) {
      try {
        // Primeiro tenta com arquivo de credenciais
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
        });
        console.log('✅ Credenciais carregadas do ambiente');
      } catch (e) {
        // Se falhar, tenta inicializar sem credenciais (útil para emulator)
        admin.initializeApp({
          projectId: process.env.GCLOUD_PROJECT || 'bolha-social',
          databaseURL: 'https://bolha-social.firebaseio.com'
        });
        console.log('⚠️  Usando inicialização padrão (certifique-se de ter as credenciais configuradas)');
      }
    }
    
    const db = admin.database();
    
    console.log('⏳ Conectando ao banco de dados...');
    const postsRef = db.ref('posts');
    
    const snapshot = await postsRef.once('value');
    const posts = snapshot.val() || {};
    
    if (!posts || Object.keys(posts).length === 0) {
      console.log('⚠️  Nenhum post encontrado no banco de dados');
      process.exit(0);
    }
    
    let updatedCount = 0;
    let totalComments = 0;
    let skippedCount = 0;
    
    console.log('📝 Processando comentários...\n');
    
    for (const [postId, postData] of Object.entries(posts)) {
      if (!postData.comments) continue;
      
      for (const [commentId, commentData] of Object.entries(postData.comments)) {
        totalComments++;
        
        // Se o comentário não tem 'likes', adiciona
        if (!commentData.likes) {
          try {
            await db.ref(`posts/${postId}/comments/${commentId}/likes`).set({});
            updatedCount++;
            console.log(`✅ Comentário atualizado [${updatedCount}]`);
          } catch (error) {
            console.error(`❌ Erro ao atualizar comentário ${commentId}:`, error.message);
          }
        } else {
          skippedCount++;
        }
      }
    }
    
    console.log(`\n✨ Migração concluída!`);
    console.log(`📊 Total de comentários processados: ${totalComments}`);
    console.log(`✅ Comentários atualizados: ${updatedCount}`);
    console.log(`⏭️  Comentários já tinham likes: ${skippedCount}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro na migração:', error.message);
    console.error('\n📋 Soluções:');
    console.error('  1. Configure credenciais: export GOOGLE_APPLICATION_CREDENTIALS="path/to/key.json"');
    console.error('  2. Ou use Firebase CLI: firebase functions:shell');
    console.error('  3. Ou update manual no Firebase Console');
    process.exit(1);
  }
}

// Executar se for chamado diretamente
if (require.main === module) {
  migrateComments();
}

module.exports = { migrateComments };
