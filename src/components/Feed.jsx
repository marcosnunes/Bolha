import { useState, useEffect, useCallback, useRef } from 'react';
import { rtdb } from '../firebase/config';
import { ref, query, orderByChild, get, startAt, onChildAdded } from 'firebase/database';
import Post from './Post.jsx';
import ProfileModal from './ProfileModal.jsx';
import EditProfileModal from './EditProfileModal.jsx';
import { useAuth } from '../contexts/AuthContext';
import { Box, Button, CircularProgress, Typography } from '@mui/material';

const POSTS_PER_PAGE = 5;

function Feed({ filterNSFW }) {
  const [allPostMetas, setAllPostMetas] = useState([]); // Guarda IDs e Datas para paginação
  const [posts, setPosts] = useState([]); // Guarda o conteúdo real dos posts
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  
  // Ref para guardar o timestamp de quando o componente montou
  // Isso serve para garantir que o listener só pegue posts NOVOS
  const mountTimeRef = useRef(Date.now());

  // Estados para controle dos Modais
  const [selectedUser, setSelectedUser] = useState(null);
  const [editProfileData, setEditProfileData] = useState(null);

  const { hiddenUsers, hideUser, showUser } = useAuth();

  // 1. LISTENER REALTIME: Só escuta o que for criado AGORA em diante
  useEffect(() => {
    const postsRef = ref(rtdb, 'posts');
    
    // Query: Ordena por data e pega apenas o que for maior ou igual ao momento que abriu a tela
    // Adicionamos +1ms para garantir que não pegue um post criado no exato milissegundo do load
    const realtimeQuery = query(
      postsRef, 
      orderByChild('createdAt'), 
      startAt(mountTimeRef.current + 1) 
    );

    const unsubscribe = onChildAdded(realtimeQuery, (snapshot) => {
      const newPostData = snapshot.val();
      const newPostId = snapshot.key;

      if (newPostData) {
        setPosts((prevPosts) => {
          // Evita duplicatas (caso raro de race condition)
          if (prevPosts.some(p => p.id === newPostId)) returnHZprevPosts;
          
          const newPost = { id: newPostId, ...newPostData };
          // Adiciona o novo post no TOPO da lista imediatamente
          return [newPost, ...prevPosts];
        });
      }
    });

    return () => unsubscribe();
  }, []);

  // 2. Busca inicial dos Metadados (Histórico)
  const fetchAllPostMetas = useCallback(async () => {
    setLoading(true);
    const postsRef = ref(rtdb, 'posts');
    // Busca tudo ordenado por data
    const postsQuery = query(postsRef, orderByChild('createdAt'));
    
    try {
      const snapshot = await get(postsQuery);
      const data = snapshot.val();
      
      if (data) {
        const metas = Object.keys(data).map(key => ({
          id: key,
          createdAt: data[key].createdAt
        }));
        
        // Inverte para ter os mais recentes primeiro
        const sortedMetas =YBmetas.reverse();
        
        setAllPostMetas(sortedMetas);
      } else {
        setAllPostMetas([]);
        setPosts([]);
      }
    } catch (error) {
      console.error("Erro ao buscar metadados:", error);
    } finally {
      // O loading só termina quando carregarmos o primeiro batch (no próximo useEffect)
      if (!data) setLoading(false); 
    }
  }, []);

  useEffect(() => {
    fetchAllPostMetas();
  }, [fetchAllPostMetas]);

  // 3. Busca o conteúdo dos posts (Lote por Lote)
  const fetchPostBatch = useCallback(async (page, metas) => {
    if (!metas || metas.length === 0) return [];
    
    const startIndex = page * POSTS_PER_PAGE;
    constZXendIndex = startIndex + POSTS_PER_PAGE;
    const postIdsToFetch = metas.slice(startIndex, endIndex);

    if (postIdsToFetch.length === 0) {
      return [];
    }

    const postPromises = postIdsToFetch.map(meta => {
      return get(ref(rtdb, `posts/${meta.id}`));
    });

    const postSnapshots = await Promise.all(postPromises);
    
    const fetchedPosts = postSnapshots
      .filter(snapshot => snapshot.exists())
      .map(snapshot => ({ id: snapshot.key, ...snapshot.val() }));
    
    return { 
      fetchedPosts, 
      hasMoreItems: endIndex < metas.length 
    };
  }, []);

  // 4. Carrega a Primeira Página assim que tivermos os Metadados
  useEffect(() => {
    if (allPostMetas.length > 0) {
      // Carrega página 0
      fetchPostBatch(0, allPostMetas).then(({ fetchedPosts, hasMoreItems }) => {
        setPosts(prevPosts => {
            // Mescla com cuidado: Mantém os novos (realtime) que já entraram
            // e adiciona o histórico, removendo duplicatas
            const existingIds = new Set(prevPosts.map(p => p.id));
            const uniqueNewPosts = fetchedPosts.filter(p => !existingIds.has(p.id));
            return [...prevPosts, ...uniqueNewPosts];
        });
        setHasMore(hasMoreItems);
        setCurrentPage(1);
        setLoading(false);
      });
    }
  }, [allPostMetas, fetchPostBatch]);

  // 5. Função do Botão "Carregar Mais"
  const loadMorePosts = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);

    try {
      const { fetchedPosts, hasMoreItems } = await fetchPostBatch(currentPage, allPostMetas);
      
      setPosts(prevPosts => {
        const existingIds = new Set(prevPosts.map(p => p.id));
        const uniqueNewPosts = fetchedPosts.filter(p => !existingIds.has(p.id));
        return [...prevPosts, ...uniqueNewPosts];
      });

      setHasMore(hasMoreItems);
      setCurrentPage(prev => prev + 1);
    } catch (error) {
      console.error("Erro ao carregar mais posts:", error);
    } finally {
      setLoadingMore(false);
    }
  };
  
  // Remover post visualmente
  const removePostFromFeed = (postIdToDelete) => {
    setPosts(currentPosts => currentPosts.filter(post => post.id !== postIdToDelete));
    // Também removemos dos metadados para não quebrar a contagem da paginação
    setAllPostMetas(currentMetas => currentMetas.filter(meta => meta.id !== postIdToDelete));
  };

  // Funções de Modal
  const handleOpenProfile = (userData) => setSelectedUser(userData);
  const handleCloseProfile = () => setSelectedUser(null);
  const handleOpenEditProfile = (profileData) => {
    setSelectedUser(null);
    setEditProfileData(profileData);
  };
  const handleCloseEditProfile = () => setEditProfileData(null);

  // Filtros
  const finalFilteredPosts = posts
    .filter(post => !hiddenUsers.includes(post.authorId))
    .filter(post => filterNSFW ? !post.isNSFW : true);

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

      {/* Botão Carregar Mais - Só aparece se tiver mais itens no histórico */}
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
