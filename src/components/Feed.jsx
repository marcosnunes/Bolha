import { useState, useEffect, useCallback } from 'react';
import { rtdb } from '../firebase/config';
import { ref, query, orderByChild, get } from 'firebase/database';
import Post from './Post.jsx';
import ProfileModal from './ProfileModal.jsx';
import { useAuth } from '../contexts/AuthContext';
import { Box, Button, CircularProgress, Typography } from '@mui/material';

const POSTS_PER_PAGE = 5;

function Feed({ filterNSFW }) {
  const [allPostMetas, setAllPostMetas] = useState([]); // Guarda {id, createdAt} de TODOS os posts
  const [posts, setPosts] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const { hiddenUsers, hideUser, showUser } = useAuth();

  // 1. Busca os metadados (ID e timestamp) de TODOS os posts uma única vez.
  useEffect(() => {
    const fetchAllPostMetas = async () => {
      const postsRef = ref(rtdb, 'posts');
      const postsQuery = query(postsRef, orderByChild('createdAt'));
      try {
        const snapshot = await get(postsQuery);
        const data = snapshot.val();
        if (data) {
          const metas = Object.keys(data).map(key => ({
            id: key,
            createdAt: data[key].createdAt
          }));
          setAllPostMetas(metas.reverse()); // Armazena a lista completa, do mais novo para o mais antigo
        } else {
          setLoading(false); // Não há posts
        }
      } catch (error) {
        console.error("Erro ao buscar metadados dos posts:", error);
        setLoading(false);
      }
    };
    fetchAllPostMetas();
  }, []);

  // 2. Função para buscar o conteúdo completo de um lote de posts
  const fetchPostBatch = useCallback(async (page) => {
    if (allPostMetas.length === 0) return [];
    
    const startIndex = page * POSTS_PER_PAGE;
    const endIndex = startIndex + POSTS_PER_PAGE;
    const postIdsToFetch = allPostMetas.slice(startIndex, endIndex);

    if (postIdsToFetch.length === 0) {
      setHasMore(false);
      return [];
    }

    // Cria uma promessa para cada busca de post individual
    const postPromises = postIdsToFetch.map(meta => {
      const postRef = ref(rtdb, `posts/${meta.id}`);
      return get(postRef);
    });

    const postSnapshots = await Promise.all(postPromises);
    const newPosts = postSnapshots.map(snapshot => ({ id: snapshot.key, ...snapshot.val() }));
    
    setHasMore(endIndex < allPostMetas.length);
    return newPosts;
  }, [allPostMetas]);

  // 3. Efeito para carregar a primeira página QUANDO os metadados estiverem prontos
  useEffect(() => {
    if (allPostMetas.length > 0) {
      setLoading(true);
      fetchPostBatch(0).then(initialPosts => {
        setPosts(initialPosts);
        setCurrentPage(1);
        setLoading(false);
      });
    }
  }, [allPostMetas, fetchPostBatch]);

  // 4. Função "Carregar Mais" agora é muito mais simples
  const loadMorePosts = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    const newPosts = await fetchPostBatch(currentPage);
    setPosts(prevPosts => [...prevPosts, ...newPosts]);
    setCurrentPage(prevPage => prevPage + 1);
    setLoadingMore(false);
  };
  
  const handleOpenProfile = (userData) => setSelectedUser(userData);
  const handleCloseProfile = () => setSelectedUser(null);

  const finalFilteredPosts = posts
    .filter(post => !hiddenUsers.includes(post.authorId))
    .filter(post => filterNSFW ? !post.isNSFW : true);
  
  if (loading) { /* ... (sem mudanças) ... */ }

  return (
    <Box>
      <ProfileModal 
        userToDisplay={selectedUser} 
        onClose={handleCloseProfile}
        onHideUser={hideUser}
        onShowUser={showUser}
      />

      {finalFilteredPosts.length > 0 ? (
        finalFilteredPosts.map(post => 
          <Post 
            key={post.id} 
            postData={post} 
            onAuthorClick={handleOpenProfile} 
          />)
      ) : (
        <Typography variant="body1" color="text.secondary" align="center" sx={{my: 4}}>
          Ainda não há posts para exibir.
        </Typography>
      )}

      {hasMore && (
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
