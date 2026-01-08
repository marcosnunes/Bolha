/**
 * Script de migração para adicionar 'likes: {}' a comentários antigos
 * Execute isso UMA VEZ para atualizar a estrutura de todos os comentários
 * 
 * Uso: node migrate-comments.js
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

async function migrateComments() {
  try {
    console.log('🔄 Iniciando migração de comentários...');
    
    // Tentar ler a configuração do firebase.json
    const firebaseJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../firebase.json'), 'utf8'));
    const projectId = firebaseJson.projects?.default || process.env.GCLOUD_PROJECT;
    
    if (!projectId) {
      throw new Error('Não foi possível encontrar o projectId. Configure GCLOUD_PROJECT ou firebase.json');
    }
    
    console.log(`📊 Project ID: ${projectId}`);
    
    // Inicializar se não estiver inicializado
    if (!admin.apps.length) {
      admin.initializeApp({
        projectId: projectId,
      });
    }
    
    const db = admin.database();
    const postsRef = db.ref('posts');
    
    const snapshot = await postsRef.once('value');
    const posts = snapshot.val() || {};
    
    let updatedCount = 0;
    let totalComments = 0;
    
    for (const [postId, postData] of Object.entries(posts)) {
      if (!postData.comments) continue;
      
      for (const [commentId, commentData] of Object.entries(postData.comments)) {
        totalComments++;
        
        // Se o comentário não tem 'likes', adiciona
        if (!commentData.likes) {
          await db.ref(`posts/${postId}/comments/${commentId}/likes`).set({});
          updatedCount++;
          console.log(`✅ Comentário ${commentId} atualizado`);
        }
      }
    }
    
    console.log(`\n✨ Migração concluída!`);
    console.log(`📊 Total de comentários: ${totalComments}`);
    console.log(`✅ Comentários atualizados: ${updatedCount}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro na migração:', error.message);
    process.exit(1);
  }
}

// Executar se for chamado diretamente
if (require.main === module) {
  migrateComments();
}

module.exports = { migrateComments };
