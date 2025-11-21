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

  useEffect(() => {
    const fetchInitialPosts = async () => {
      setLoading(true);
      const postsRef = ref(rtdb, 'posts');
      // Busca os últimos posts ordenados por data
      const postsQuery = query(postsRef, orderByChild('createdAt'), limitToLast(POSTS_PER_PAGE));
      
      try {
        // Mudamos de onValue para get para evitar que atualizações em tempo real resetem a paginação
        const snapshot = await get(postsQuery);
        if (snapshot.exists()) {
          const postsList = [];
          // CRUCIAL: Usar forEach garante que iteramos na ordem correta do banco (Mais antigo -> Mais novo)
          snapshot.forEach((childSnapshot) => {
            postsList.push({ id: childSnapshot.key, ...childSnapshot.val() });
          });
          // Invertemos para mostrar o mais novo no topo
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
  }, []);

  const loadMorePosts = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);

    try {
      // Pega o timestamp do último post da lista atual (que é o mais antigo visível)
      const lastPost = posts[posts.length - 1];
      const lastKey = lastPost.createdAt;

      const postsRef = ref(rtdb, 'posts');
      // Busca posts que foram criados ANTES do timestamp do último post carregado
      const postsQuery = query(postsRef, orderByChild('createdAt'), endBefore(lastKey), limitToLast(POSTS_PER_PAGE));
      
      const snapshot = await get(postsQuery);

      if (snapshot.exists()) {
        const newPosts = [];
        // Novamente, usamos forEach para garantir a ordem correta vinda do banco
        snapshot.forEach((childSnapshot) => {
          newPosts.push({ id: childSnapshot.key, ...childSnapshot.val() });
        });

        // newPosts vem do banco como [Antigo ... Menos Antigo]. 
        // Invertemos para [Menos Antigo ... Antigo] e adicionamos ao final da lista.
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
