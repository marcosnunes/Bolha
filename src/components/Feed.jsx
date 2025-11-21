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
  const [cursor, setCursor] = useState({ key: null, id: null }); // Armazena o cursor para a próxima página
  const [selectedUser, setSelectedUser] = useState(null);
  const { hiddenUsers, hideUser, showUser } = useAuth();

  // Função unificada para buscar posts
  const fetchPosts = async (currentCursor) => {
    const postsRef = ref(rtdb, 'posts');
    let postsQuery;

    // Se não houver cursor, é a primeira busca.
    if (!currentCursor.key) {
      postsQuery = query(postsRef, orderByChild('createdAt'), limitToLast(POSTS_PER_PAGE));
    } else {
      // Se houver um cursor, busca a página seguinte.
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
        
        // O Firebase retorna em ordem ascendente. O primeiro item (índice 0) é o mais antigo do lote.
        // Ele será nosso cursor para a próxima página.
        const oldestPostInBatch = postsList[0];
        setCursor({ key: oldestPostInBatch.createdAt, id: oldestPostInBatch.id });
        
        // Inverte a lista para exibir os mais novos primeiro.
        const reversedPosts = postsList.reverse();

        // Se for a primeira busca, define os posts. Se não, anexa os novos.
        if (!currentCursor.key) {
          setPosts(reversedPosts);
        } else {
          setPosts(prevPosts => [...prevPosts, ...reversedPosts]);
        }
        
        setHasMore(postsList.length === POSTS_PER_PAGE);
      } else {
        setHasMore(false); // Não há mais posts para carregar
      }
    } catch (error) {
      console.error("Erro ao buscar posts:", error);
    }
  };

  // Efeito para a busca inicial
  useEffect(() => {
    setLoading(true);
    fetchPosts({ key: null, id: null }).finally(() => setLoading(false));
  }, []); // Roda apenas uma vez

  const loadMorePosts = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    await fetchPosts(cursor);
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

      {/* Exibe o botão "Carregar Mais" apenas se houver mais posts e não estiver carregando */}
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
