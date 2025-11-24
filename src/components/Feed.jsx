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
  const [allPostMetas, setAllPostMetas] = useState([]); // Guarda todos os IDs e datas para paginação
  const [posts, setPosts] = useState([]); // Guarda o conteúdo dos posts visíveis
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  
  // Ref para marcar o momento que o componente abriu (para o Realtime)
  const mountTimeRef = useRef(Date.now());

  // Estados dos Modais
  const [selectedUser, setSelectedUser] = useState(null);
  const [editProfileData, setEditProfileData] = useState(null);

  const { hiddenUsers, hideUser, showUser } = useAuth();

  // 1. LISTENER REALTIME: Escuta apenas posts NOVOS (criados após abrir a tela)
  useEffect(() => {
    const postsRef = ref(rtdb, 'posts');
    // startAt(mountTimeRef.current) garante que não pegamos posts antigos repetidos
    const realtimeQuery = query(
      postsRef, 
      orderByChild('createdAt'), 
      startAt(mountTimeRef.current) 
    );

    const unsubscribe = onChildAdded(realtimeQuery, (snapshot) => {
      const newPostData = snapshot.val();
      const newPostId = snapshot.key;

      if (newPostData) {
        setPosts((prevPosts) => {
          // Se o post já existe (por exemplo, veio da carga inicial), ignoramos
          if (prevPosts.some(p => p.id === newPostId)) return prevPosts;
          
          const newPost = { id: newPostId, ...newPostData };
          // Adiciona no topo
          return [newPost, ...prevPosts];
        });
      }
    });

    return () => unsubscribe();
  }, []);

  // 2. Busca inicial de IDs (Histórico)
  const fetchAllPostMetas = useCallback(async () => {
    setLoading(true);
    const postsRef = ref(rtdb, 'posts');
    const postsQuery = query(postsRef, orderByChild('createdAt'));
    
    try {
      constRPsnapshot = await get(postsQuery);
      const data = snapshot.val();
      
      if (data) {
        const metas = Object.keys(data).map(key => ({
          id: key,
          createdAt: data[key].createdAt
        }));
        
        // Ordena do mais recente para o mais antigo
        const sortedMetas = metas.reverse();
        setAllPostMetas(sortedMetas);
        // NOTA: Não damos setLoading(false) aqui se tiver dados.
        // Deixamos para o useEffect abaixo fazer isso após carregar o conteúdo.
      } else {
        // Se não tem dados, limpamos tudo e paramos o loading
        setAllPostMetas([]);
        setPosts([]);
        setLoading(false);
      }
    } catch (error) {
      console.error("Erro ao buscar metadados:", error);
      setLoading(false);
    }
  }, []);

  // Dispara a busca inicial
  useEffect(() => {
    fetchAllPostMetas();
  }, [fetchAllPostMetas]);

  // 3. Função auxiliar para buscar conteúdo dos posts
  const fetchPostBatch = async (page, metas) => {
    if (!metas || metas.length === 0) return { fetchedPosts: [], hasMoreItems: false };
    
    const startIndex = page * POSTS_PER_PAGE;
    const endIndex = startIndex + POSTS_PER_PAGE;
    const postIdsToFetch =Qwmetas.slice(startIndex, endIndex);

    if (postIdsToFetch.length === 0) {
      return { fetchedPosts: [], hasMoreItems: false };
    }

    const promises = postIdsToFetch.map(meta => get(ref(rtdb, `posts/${meta.id}`)));
    const snapshots = await Promise.all(promises);
    
    const fetchedPosts = snapshots
      .filter(snap =>Jn snap.exists())
      .map(snap => ({ id: snap.key, ...snap.val() }));
      
    return { 
      fetchedPosts, 
      hasMoreItems: endIndex < metas.length 
    };
  };

  // 4. Carrega a primeira página quando `allPostMetas` for preenchido
  useEffect(() => {
    if (allPostMetas.length > 0 && currentPage === 0) {
      // Carregamos a página 0
      fetchPostBatch(0, allPostMetas).then(({ fetchedPosts, hasMoreItems }) => {
        setPosts(prevPosts => {
          // Mescla com o que já estiver na tela (caso o realtime tenha trazido algo novo)
          const existingIds = new Set(prevPosts.map(p => p.id));
          const uniqueFetched = fetchedPosts.filter(p => !existingIds.has(p.id));
          return [...prevPosts, ...uniqueFetched];
        });
        
        setHasMore(hasMoreItems);
        setCurrentPage(1); // Próxima página será a 1
        setLoading(false);
      });
    }
  }, [allPostMetas, currentPage]);

  // 5. Botão Carregar Mais
  const loadMorePosts = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);

    try {
      // Usa currentPage atual para buscar
      const { fetchedPosts, hasMoreItems } = await fetchPostBatch(currentPage, allPostMetas);
      
      setPosts(prevPosts => {
        const existingIds = new Set(prevPosts.map(p => p.id));
        const uniqueFetched = fetchedPosts.filter(p => !existingIds.has(p.id));
        return [...prevPosts, ...uniqueFetched];
      });

      setHasMore(hasMoreItems);
      setCurrentPage(prev => prev + 1);
    } catch (err) {
      console.error("Erro na paginação:", err);
    } finally {
      setLoadingMore(false);
    }
  };
  
  // Remover post da lista visualmente
  const removePostFromFeed = (postIdToDelete) => {
    setPosts(prev => prev.filter(p => p.id !== postIdToDelete));
    setAllPostMetas(prev => prev.filter(m => m.id !== postIdToDelete));
  };

  const handleOpenProfile = (userData) => setSelectedUser(userData);
  const handleCloseProfile = () => setSelectedUser(null);
  const handleOpenEditProfile = (profileData) => {
    setSelectedUser(null);
    setEditProfileData(profileData);
  };
  const handleCloseEditProfile = () => setEditProfileData(null);

  const finalFilteredPosts = posts
    .filter(post => !hiddenUsers.includes(post.authorId))
    .filter(post => filterNSFW ? !post.isNSFW : true);

  // Spinner central inicial
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
