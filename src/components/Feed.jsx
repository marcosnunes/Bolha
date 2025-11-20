import { useState, useEffect } from 'react';
import { rtdb } from '../firebase/config';
import { ref, onValue, query, orderByChild, limitToLast, endBefore, get } from 'firebase/database';
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

  useEffect(() => {
    // Busca inicial dos primeiros posts
    const postsRef = ref(rtdb, 'posts');
    const postsQuery = query(postsRef, orderByChild('createdAt'), limitToLast(POSTS_PER_PAGE));
    
    // Usamos onValue para a primeira carga para que o feed seja atualizado em tempo real com novos posts
    const unsubscribe = onValue(postsQuery, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const postsList = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        setPosts(postsList.reverse()); // Inverte para mostrar o mais novo primeiro
        setHasMore(postsList.length === POSTS_PER_PAGE);
      } else {
        setPosts([]);
        setHasMore(false);
      }
      setLoading(false);
    });

    return () => unsubscribe(); // Limpa o listener em tempo real
  }, []);

  const loadMorePosts = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);

    // Pega o timestamp do último post carregado para saber de onde continuar
    const lastPost = posts[posts.length - 1];
    const lastKey = lastPost.createdAt;

    const postsRef = ref(rtdb, 'posts');
    const postsQuery = query(postsRef, orderByChild('createdAt'), endBefore(lastKey), limitToLast(POSTS_PER_PAGE));
    
    // Usamos 'get' para o "carregar mais", pois é uma ação única, não em tempo real
    const snapshot = await get(postsQuery);
    const data = snapshot.val();

    if (data) {
      const newPosts = Object.keys(data).map(key => ({ id: key, ...data[key] }));
      setPosts(prevPosts => [...prevPosts, ...newPosts.reverse()]);
      setHasMore(newPosts.length === POSTS_PER_PAGE);
    } else {
      setHasMore(false);
    }
    setLoadingMore(false);
  };

  const handleOpenProfile = (userData) => setSelectedUser(userData);
  const handleCloseProfile = () => setSelectedUser(null);

  // Aplica os filtros de ocultar e NSFW
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