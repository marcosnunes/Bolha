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
    // Busca inicial dos primeiros posts (funcionalidade original mantida)
    const postsRef = ref(rtdb, 'posts');
    const postsQuery = query(postsRef, orderByChild('createdAt'), limitToLast(POSTS_PER_PAGE));
    
    const unsubscribe = onValue(postsQuery, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const postsList = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        setPosts(postsList.reverse());
        setHasMore(postsList.length === POSTS_PER_PAGE);
      } else {
        setPosts([]);
        setHasMore(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loadMorePosts = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);

    // Pega o último post da lista atual para usar como ponto de partida
    const lastPost = posts[posts.length - 1];
    if (!lastPost) {
        setLoadingMore(false);
        return;
    }
    
    const postsRef = ref(rtdb, 'posts');
    
    const postsQuery = query(
        postsRef, 
        orderByChild('createdAt'), 
        endBefore(lastPost.createdAt, lastPost.id), 
        limitToLast(POSTS_PER_PAGE)
    );
    
    // Usamos 'get' para o "carregar mais"
    const snapshot = await get(postsQuery);
    const data = snapshot.val();

    if (data) {
      const newPosts = Object.keys(data).map(key => ({ id: key, ...data[key] }));
      setPosts(prevPosts => [...prevPosts, ...newPosts.reverse()]);
      setHasMore(newPosts.length === POSTS_PER_PAGE);
    } else {
      setHasMore(false); // Não há mais posts para carregar
    }
    setLoadingMore(false);
  };

  const handleOpenProfile = (userData) => setSelectedUser(userData);
  const handleCloseProfile = () => setSelectedUser(null);

  // Filtros (sem mudanças)
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
