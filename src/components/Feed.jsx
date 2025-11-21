import { useState, useEffect, useCallback } from 'react';
import { rtdb } from '../firebase/config';
import { ref, query, orderByChild, limitToLast, endBefore, get } from 'firebase/database';
import Post from './Post.jsx';
import ProfileModal from './ProfileModal.jsx';
import { useAuth } from '../contexts/AuthContext';
import { Box, Button, CircularProgress, Typography } from '@mui/material';

const POSTS_PER_PAGE = 5;

function Feed({ filterNSFW }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState({ key: null, id: null });
  const [selectedUser, setSelectedUser] = useState(null);
  const { hiddenUsers, hideUser, showUser } = useAuth();

  const fetchPosts = useCallback(async (currentCursor) => {
    const postsRef = ref(rtdb, 'posts');
    let postsQuery;

    if (!currentCursor.key) {
      postsQuery = query(postsRef, orderByChild('createdAt'), limitToLast(POSTS_PER_PAGE));
    } else {
      postsQuery = query(
        postsRef,
        orderByChild('createdAt'),
        endBefore(currentCursor.key, currentCursor.id),
        limitToLast(POSTS_PER_PAGE)
      );
    }

    try {
      const snapshot = await get(postsQuery);
      const data = snapshot.val();

      if (data) {
        const postsList = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        if (postsList.length > 0) {
          const oldestPostInBatch = postsList[0];
          setCursor({ key: oldestPostInBatch.createdAt, id: oldestPostInBatch.id });
        }
        
        const reversedPosts = postsList.reverse();

        if (!currentCursor.key) {
          setPosts(reversedPosts);
        } else {
          setPosts(prevPosts => [...prevPosts, ...reversedPosts]);
        }
        
        setHasMore(postsList.length === POSTS_PER_PAGE);
      } else {
        setHasMore(false);
        if (!currentCursor.key) {
            setPosts([]);
        }
      }
    } catch (error) {
      console.error("Erro ao buscar posts:", error);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchPosts({ key: null, id: null }).finally(() => {
      setLoading(false);
    });
  }, [fetchPosts]);

  const loadMorePosts = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    await fetchPosts(cursor);
    setLoadingMore(false);
  };

  const handleOpenProfile = (userData) => setSelectedUser(userData);
  const handleCloseProfile = () => setSelectedUser(null);

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
