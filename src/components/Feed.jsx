import { useState, useEffect } from 'react';
import { rtdb } from '../firebase/config';
import { ref, query, orderByChild, limitToLast, endBefore, get } from 'firebase/database';
import Post from './Post.jsx';
import ProfileModal from './ProfileModal.jsx';
import { useAuth } from '../contexts/AuthContext';
import { Box, Button, CircularProgress, Typography } from '@mui/material';

const POSTS_PER_PAGE = 5; // Quantos posts carregar por vez

function Feed({ filterNSFW }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const { hiddenUsers, hideUser, showUser } = useAuth();

  // Função para buscar a primeira página de posts
  const fetchInitialPosts = async () => {
    setLoading(true);
    const postsRef = ref(rtdb, 'posts');
    const postsQuery = query(postsRef, orderByChild('createdAt'), limitToLast(POSTS_PER_PAGE));
    
    try {
      const snapshot = await get(postsQuery);
      const data = snapshot.val();
      if (data) {
        const postsList = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        setPosts(postsList.reverse());
        setHasMore(postsList.length === POSTS_PER_PAGE);
      } else {
        setPosts([]);
        setHasMore(false);
      }
    } catch (error) {
      console.error("Erro ao buscar posts iniciais:", error);
    } finally {
      setLoading(false);
    }
  };

  // Roda a busca inicial apenas uma vez
  useEffect(() => {
    fetchInitialPosts();
  }, []); // Dependência vazia garante que rode apenas na montagem

  const loadMorePosts = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);

    // Pega o último post da lista atual
    const lastPost = posts[posts.length - 1];
    if (!lastPost) {
      setLoadingMore(false);
      return;
    }

    const postsRef = ref(rtdb, 'posts');
    // Passamos o valor (timestamp) E a chave (ID do post) para 'endBefore'
    const postsQuery = query(
      postsRef,
      orderByChild('createdAt'),
      endBefore(lastPost.createdAt, lastPost.id),
      limitToLast(POSTS_PER_PAGE)
    );
    
    try {
      const snapshot = await get(postsQuery);
      const data = snapshot.val();

      if (data) {
        const newPosts = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        // Adiciona os novos posts ao final da lista existente
        setPosts(prevPosts => [...prevPosts, ...newPosts.reverse()]);
        setHasMore(newPosts.length === POSTS_PER_PAGE);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Erro ao carregar mais posts:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleOpenProfile = (userData) => setSelectedUser(userData);
  const handleCloseProfile = () => setSelectedUser(null);

  // Aplica os filtros de ocultar e NSFW no momento da renderização
  const finalFilteredPosts = posts
    .filter(post => !hiddenUsers.includes(post.authorId))
    .filter(post => filterNSFW ? !post.isNSFW : true);

  if (loading) {
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
