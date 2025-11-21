import { useState, useEffect } from 'react';
import { rtdb } from '../firebase/config';
import { ref, query, orderByChild, limitToLast, endBefore, get } from 'firebase/database';
import Post from './Post.jsx';
import ProfileModal from './ProfileModal.jsx';
import { useAuth } from '../contexts/AuthContext';
import { Box, Button, CircularProgress, Typography } from '@mui/material';

const POSTS_PER_PAGE = 5;

// Recebe refreshTrigger (do createPost) e filterNSFW
function Feed({ filterNSFW, refreshTrigger }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const { hiddenUsers, hideUser, showUser } = useAuth();

  // Busca inicial e Reload quando refreshTrigger muda
  useEffect(() => {
    const fetchInitialPosts = async () => {
      setLoading(true);
      try {
        const postsRef = ref(rtdb, 'posts');
        const postsQuery = query(postsRef, orderByChild('createdAt'), limitToLast(POSTS_PER_PAGE));
        
        const snapshot = await get(postsQuery);
        
        if (snapshot.exists()) {
          const postsList = [];
          snapshot.forEach((childSnapshot) => {
            postsList.push({ id: childSnapshot.key, ...childSnapshot.val() });
          });
          
          setPosts(postsList.reverse()); 
          setHasMore(postsList.length === POSTS_PER_PAGE);
        } else {
          setPosts([]);
          setHasMore(false);
        }
      } catch (error) {
        console.error("Erro ao carregar feed:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialPosts();
  }, [refreshTrigger]); // IMPORTANTE: Recarrega quando o trigger muda

  const loadMorePosts = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);

    try {
      const lastPost = posts[posts.length - 1];
      if (!lastPost || !lastPost.createdAt) {
        setHasMore(false);
        setLoadingMore(false);
        return;
      }
      
      const lastKey = lastPost.createdAt;
      const postsRef = ref(rtdb, 'posts');
      const postsQuery = query(postsRef, orderByChild('createdAt'), endBefore(lastKey), limitToLast(POSTS_PER_PAGE));
      
      const snapshot = await get(postsQuery);

      if (snapshot.exists()) {
        const newPosts = [];
        snapshot.forEach((childSnapshot) => {
          newPosts.push({ id: childSnapshot.key, ...childSnapshot.val() });
        });

        setPosts(prevPosts => [...prevPosts, ...newPosts.reverse()]);
        setHasMore(newPosts.length === POSTS_PER_PAGE);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Erro ao carregar mais posts:", error);
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  };

  // Função para remover o post da lista visualmente na hora
  const removePostFromFeed = (postIdToDelete) => {
    setPosts(currentPosts => currentPosts.filter(post => post.id !== postIdToDelete));
  };

  const handleOpenProfile = (userData) => setSelectedUser(userData);
  const handleCloseProfile = () => setSelectedUser(null);

  const finalFilteredPosts = posts
    .filter(post => !hiddenUsers.includes(post.authorId))
    .filter(post => filterNSFW ? !post.isNSFW : true);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <ProfileModal 
        userToDisplay={selectedUser} onClose={handleCloseProfile}
        onHideUser={hideUser} onShowUser={showUser}
      />

      {finalFilteredPosts.length > 0 ? (
        finalFilteredPosts.map(post => 
          <Post 
            key={post.id} 
            postData={post} 
            onAuthorClick={handleOpenProfile}
            onPostDelete={removePostFromFeed} // Passamos a função de remoção
          />)
      ) : (
        <Typography variant="body1" color="text.secondary" align="center" sx={{my: 4}}>
          {posts.length > 0 ? "Posts ocultados pelos filtros." : "Ainda não há posts."}
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
