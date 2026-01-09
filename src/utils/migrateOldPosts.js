// Script de migração para adicionar isNSFW a posts antigos
// Execute isso uma vez para atualizar todos os posts que não têm isNSFW definido

import { ref, get, update } from 'firebase/database';
import { rtdb } from '../firebase/config';

export async function migrateOldPosts() {
  try {
    console.log('Iniciando migração de posts antigos...');
    
    const postsRef = ref(rtdb, 'posts');
    const snapshot = await get(postsRef);
    
    if (!snapshot.exists()) {
      console.log('Nenhum post encontrado');
      return;
    }

    const posts = snapshot.val();
    const updates = {};
    let migratedCount = 0;

    // Verificar cada post
    Object.keys(posts).forEach(postId => {
      const post = posts[postId];
      
      // Se não tiver isNSFW, adicionar como false
      if (post.isNSFW === undefined || post.isNSFW === null) {
        updates[`/posts/${postId}/isNSFW`] = false;
        migratedCount++;
        console.log(`Adicionando isNSFW ao post: ${postId}`);
      }
    });

    if (migratedCount === 0) {
      console.log('Nenhum post para migrar - todos já têm isNSFW definido');
      return;
    }

    // Aplicar todas as atualizações
    await update(ref(rtdb), updates);
    console.log(`✅ Migração concluída! ${migratedCount} posts atualizados`);

  } catch (error) {
    console.error('❌ Erro na migração:', error);
  }
}
