import { useState, useEffect, useCallback, useRef } from 'react';
import { rtdb } from '../firebase/config';
import { ref, query, orderByChild, get, startAt, onChildAdded, onChildChanged } from 'firebase/database';
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

  // Marca o tempo de início para o Realtime só pegar posts futuros
  const mountTimeRef = useRef(Date.now());

  const [selectedUser, setSelectedUser] = useState(null);
  const [editProfileData, setEditProfileData] = useState(null);

  const { hiddenUsers, hideUser, showUser } = useAuth();

  // 1. LISTENER REALTIME (Apenas novos posts e mudanças em lastActivityAt para boost)
  useEffect(() => {
    const postsRef = ref(rtdb, 'posts');
    // +1ms para garantir que não pegue nada do passado
    const realtimeQuery = query(postsRef, orderByChild('createdAt'), startAt(mountTimeRef.current + 1));
    
    const unsubAdded = onChildAdded(realtimeQuery, (snapshot) => {
      const newPostData = snapshot.val();
      const newPostId = snapshot.key;

      if (newPostData) {
        setPosts(prev => {
          // Evita duplicatas
          if (prev.some(p => p.id === newPostId)) return prev;
          return [{ id: newPostId, ...newPostData }, ...prev];
        });
      }
    });

    // Listener para atualizar lastActivityAt quando post recebe interação (like, comentário)
    const unsubChanged = onChildChanged(realtimeQuery, (snapshot) => {
      if (snapshot.exists()) {
        const updatedPostData = snapshot.val();
        const postId = snapshot.key;

        setPosts(prev => {
          // Atualiza o post existente com novos dados (lastActivityAt mudou)
          return prev.map(p => 
            p.id === postId ? { id: postId, ...updatedPostData } : p
          );
        });
      }
    });

    return () => { unsubAdded(); unsubChanged(); };
  }, []);

  // 2. Busca Inicial de IDs (Histórico)
  const fetchAllPostMetas = useCallback(async () => {
    setLoading(true);
    const postsRef = ref(rtdb, 'posts');
    const postsQuery = query(postsRef, orderByChild('createdAt'));

    try {
      const snapshot = await get(postsQuery);

      if (snapshot.exists()) {
        const metas = [];
        // Importante: Usar forEach para garantir a ordem correta do Firebase
        snapshot.forEach((child) => {
          metas.push({
            id: child.key,
            createdAt: child.val().createdAt
          });
        });

        // Inverte para o mais recente ficar primeiro (Descrescente)
        metas.reverse();

        setAllPostMetas(metas);
        // Não setamos loading(false) aqui ainda, esperamos carregar o conteúdo abaixo
      } else {
        setAllPostMetas([]);
        setPosts([]);
        setLoading(false); // Se não tem nada, paramos aqui
      }
    } catch (error) {
      console.error("Erro ao buscar lista de posts:", error);
      setLoading(false);
    }
  }, []);

  // Inicia a busca
  useEffect(() => {
    fetchAllPostMetas();
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
      .map(snap => ({ id: snap.key, ...snap.val() }));

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

  // Filtros - ORDENAR POR lastActivityAt PARA BOOST (mais ativos no topo)
  const finalFilteredPosts = posts
    .filter(post => !hiddenUsers.includes(post.authorId))
    .filter(post => filterNSFW ? !post.isNSFW : true)
    .sort((a, b) => (b.lastActivityAt || b.createdAt || 0) - (a.lastActivityAt || a.createdAt || 0));

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
