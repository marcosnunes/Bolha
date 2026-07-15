import { useState, useEffect, useCallback } from 'react';
import { rtdb } from '../firebase/config';
import { ref, query, orderByChild, get, startAt, onChildAdded, onValue } from 'firebase/database';
import Post from './Post.jsx';
import ProfileModal from './ProfileModal.jsx';
import EditProfileModal from './EditProfileModal.jsx';
import { useAuth } from '../contexts/AuthContext';
import { Box, Button, CircularProgress, Typography } from '@mui/material';

const POSTS_PER_PAGE = 5;

function Feed({ filterNSFW }) {
  const [allPostMetas, setAllPostMetas] = useState([]);
  const [posts, setPosts] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true); // Começa carregando
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false); // Começa falso até verificar

  const [selectedUser, setSelectedUser] = useState(null);
  const [editProfileData, setEditProfileData] = useState(null);

  const { hiddenUsers, hideUser, showUser } = useAuth();

  // 1. LISTENER GLOBAL PARA REORDENAÇÃO POR TIMESTAMP
  // Detecta qualquer mudança em qualquer post (novo, comentário, like) e reordena tudo
  useEffect(() => {
    const mountedAt = Date.now();
    const postsRef = ref(rtdb, 'posts');
    
    // Listener que dispara para QUALQUER mudança na raiz de posts
    const unsubValue = onValue(postsRef, (snapshot) => {
      if (!snapshot.exists()) return;
      
      // Pega todos os posts do banco
      const allPostsData = {};
      snapshot.forEach(child => {
        const postData = child.val();
        allPostsData[child.key] = { 
          id: child.key, 
          ...postData,
          // Garante que todo post tem um timestamp para ordenação
          _sortTimestamp: postData.lastActivityAt || postData.createdAt || 0
        };
      });
      
      // Atualiza apenas os posts que estão carregados no feed
      setPosts(prev => {
        const updated = prev.map(p => allPostsData[p.id] || p).filter(p => p);
        // Reordena por timestamp (lastActivityAt > createdAt > 0)
        return updated.sort((a, b) => (b._sortTimestamp || 0) - (a._sortTimestamp || 0));
      });
    });

    // Listener para novos posts criados após montar
    const realtimeQuery = query(postsRef, orderByChild('createdAt'), startAt(mountedAt + 1));
    const unsubAdded = onChildAdded(realtimeQuery, (snapshot) => {
      const newPostData = snapshot.val();
      const newPostId = snapshot.key;

      if (newPostData) {
        setPosts(prev => {
          // Evita duplicatas
          if (prev.some(p => p.id === newPostId)) return prev;
          const newPost = { 
            id: newPostId, 
            ...newPostData,
            _sortTimestamp: newPostData.lastActivityAt || newPostData.createdAt || 0
          };
          // Insere em posição ordenada por timestamp (mais recente primeiro)
          const newPosts = [...prev, newPost];
          return newPosts.sort((a, b) => (b._sortTimestamp || 0) - (a._sortTimestamp || 0));
        });
      }
    });

    return () => { unsubValue(); unsubAdded(); };
  }, []);

  // 2. Busca Inicial de IDs (Histórico) - Ordena por lastActivityAt para trazer posts com atividade recente ao topo
  const fetchAllPostMetas = useCallback(async () => {
    const postsRef = ref(rtdb, 'posts');
    const postsQuery = query(postsRef, orderByChild('lastActivityAt'));

    try {
      const snapshot = await get(postsQuery);

      if (snapshot.exists()) {
        const metas = [];
        // Importante: Usar forEach para garantir a ordem correta do Firebase
        snapshot.forEach((child) => {
          const postData = child.val();
          metas.push({
            id: child.key,
            lastActivityAt: postData.lastActivityAt || postData.createdAt,
            createdAt: postData.createdAt
          });
        });

        // Inverte para o mais recente (em atividade) ficar primeiro (Descrescente)
        metas.reverse();

        return metas;
      } else {
        return [];
      }
    } catch (error) {
      console.error("Erro ao buscar lista de posts:", error);
      return null;
    }
  }, []);

  // Inicia a busca
  useEffect(() => {
    let isActive = true;

    const loadAllPostMetas = async () => {
      const metas = await fetchAllPostMetas();
      if (!isActive) return;

      if (metas === null) {
        setLoading(false);
        return;
      }

      if (metas.length === 0) {
        setAllPostMetas([]);
        setPosts([]);
        setLoading(false);
        return;
      }

      setAllPostMetas(metas);
    };

    loadAllPostMetas();

    return () => {
      isActive = false;
    };
  }, [fetchAllPostMetas]);

  // 3. Carrega o conteúdo dos posts (Paginação)
  const fetchPostBatch = async (page, metas) => {
    if (!metas || metas.length === 0) return { fetchedPosts: [], hasMoreItems: false };

    const startIndex = page * POSTS_PER_PAGE;
    const endIndex = startIndex + POSTS_PER_PAGE;
    const postIdsToFetch = metas.slice(startIndex, endIndex);

    if (postIdsToFetch.length === 0) {
      return { fetchedPosts: [], hasMoreItems: false };
    }

    // Busca cada post individualmente pelo ID
    const promises = postIdsToFetch.map(meta => get(ref(rtdb, `posts/${meta.id}`)));
    const snapshots = await Promise.all(promises);

    const fetchedPosts = snapshots
      .filter(snap => snap.exists())
      .map(snap => {
        const postData = snap.val();
        return { 
          id: snap.key, 
          ...postData,
          // Garante timestamp para ordenação
          _sortTimestamp: postData.lastActivityAt || postData.createdAt || 0
        };
      });

    // Ordena por timestamp (lastActivityAt > createdAt) para boost de atividade
    fetchedPosts.sort((a, b) => (b._sortTimestamp || 0) - (a._sortTimestamp || 0));

    return {
      fetchedPosts,
      hasMoreItems: endIndex < metas.length
    };
  };

  // 4. Efeito que carrega a página 0 assim que temos os Metas
  useEffect(() => {
    if (allPostMetas.length > 0 && currentPage === 0) {
      // Ainda estamos na fase de loading inicial
      fetchPostBatch(0, allPostMetas).then(({ fetchedPosts, hasMoreItems }) => {
        setPosts(prev => {
          // Mescla posts do realtime (se houver) com o histórico
          const existingIds = new Set(prev.map(p => p.id));
          const uniqueFetched = fetchedPosts.filter(p => !existingIds.has(p.id));
          return [...prev, ...uniqueFetched];
        });

        setHasMore(hasMoreItems);
        setCurrentPage(1);
        setLoading(false); // FIM DO LOADING INICIAL
      });
    }
  }, [allPostMetas, currentPage]);

  // Botão Carregar Mais
  const loadMorePosts = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);

    try {
      const { fetchedPosts, hasMoreItems } = await fetchPostBatch(currentPage, allPostMetas);

      setPosts(prev => {
        const existingIds = new Set(prev.map(p => p.id));
        const uniqueFetched = fetchedPosts.filter(p => !existingIds.has(p.id));
        return [...prev, ...uniqueFetched];
      });

      setHasMore(hasMoreItems);
      setCurrentPage(prev => prev + 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMore(false);
    }
  };

  // Remove visualmente (delete)
  const removePostFromFeed = (postId) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
    setAllPostMetas(prev => prev.filter(m => m.id !== postId));
  };

  // Modais
  const handleOpenProfile = (u) => setSelectedUser(u);
  const handleCloseProfile = () => setSelectedUser(null);
  const handleOpenEditProfile = (data) => { setSelectedUser(null); setEditProfileData(data); };
  const handleCloseEditProfile = () => setEditProfileData(null);

  // Filtros - posts já estão ordenados por lastActivityAt em tempo real
  const finalFilteredPosts = posts
    .filter(post => !hiddenUsers.includes(post.authorId))
    .filter(post => filterNSFW ? !post.isNSFW : true);

  // Spinner apenas se estiver carregando E não tiver nenhum post na tela
  if (loading && posts.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <ProfileModal
        userToDisplay={selectedUser}
        onClose={handleCloseProfile}
        onHideUser={hideUser}
        onShowUser={showUser}
        onEditProfile={handleOpenEditProfile}
      />

      {editProfileData && (
        <EditProfileModal
          open={!!editProfileData}
          onClose={handleCloseEditProfile}
          currentNickname={editProfileData.nickname}
          currentPhotoURL={editProfileData.photoURL}
        />
      )}

      {finalFilteredPosts.length > 0 ? (
        finalFilteredPosts.map(post =>
          <Post
            key={post.id}
            postData={post}
            onAuthorClick={handleOpenProfile}
            onPostDelete={removePostFromFeed}
          />)
      ) : (
        !loading && (
          <Typography variant="body1" color="text.secondary" align="center" sx={{my: 4}}>
            Ainda não há posts para exibir.
          </Typography>
        )
      )}

      {/* O botão aparece se tiver mais itens E se o carregamento inicial já terminou */}
      {hasMore && !loading && (
        <Box sx={{ textAlign: 'center', my: 2 }}>
          <Button onClick={loadMorePosts} disabled={loadingMore}>
            {loadingMore ? <CircularProgress size={24} /> : 'Carregar Mais Posts'}
          </Button>
        </Box>
      )}
    </Box>
  );
}

export default Feed;
