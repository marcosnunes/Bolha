import { useState, useEffect, useCallback, useRef } from 'react';
import { rtdb } from '../firebase/config';
import { ref, query, orderByChild, get, startAt, onChildAdded, onChildChanged, onChildRemoved, limitToLast, endAt } from 'firebase/database';
import Post from './Post.jsx';
import ProfileModal from './ProfileModal.jsx';
import EditProfileModal from './EditProfileModal.jsx';
import { useAuth } from '../contexts/AuthContext';
import { Box, Button, CircularProgress, Typography } from '@mui/material';

const POSTS_PER_PAGE = 5;

function Feed({ filterNSFW }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastPostTimestamp, setLastPostTimestamp] = useState(null);
  const mountTimeRef = useRef(Date.now());

  const [selectedUser, setSelectedUser] = useState(null);
  const [editProfileData, setEditProfileData] = useState(null);
  const { hiddenUsers, hideUser, showUser } = useAuth();

  // Listener para novos posts (em tempo real)
  useEffect(() => {
    const postsRef = ref(rtdb, 'posts');
    const realtimeQuery = query(postsRef, orderByChild('createdAt'), startAt(mountTimeRef.current + 1));

    const unsubAdded = onChildAdded(realtimeQuery, (snapshot) => {
      if (snapshot.exists()) {
        const newPostData = { id: snapshot.key, ...snapshot.val() };
        // Adiciona o novo post no topo, apenas se não for de um usuário oculto
        if (!hiddenUsers.includes(newPostData.authorId)) {
          setPosts(prev => [newPostData, ...prev]);
        }
      }
    });

    // Atualiza posts existentes caso aconteça uma mudança (por exemplo, authorPhotoURL atualizado)
    const unsubChanged = onChildChanged(realtimeQuery, (snapshot) => {
      if (snapshot.exists()) {
        const updated = { id: snapshot.key, ...snapshot.val() };
        setPosts(prev => prev.map(p => p.id === snapshot.key ? updated : p));
      }
    });

    // Remove post do feed se for deletado por outro lugar
    const unsubRemoved = onChildRemoved(realtimeQuery, (snapshot) => {
      setPosts(prev => prev.filter(p => p.id !== snapshot.key));
    });

    // Listener global para deletions de TODOS os posts (incluindo pré-carregados)
    // Isso garante que deletions sejam síncronos em tempo real, independente de quando o post foi criado
    const unsubDeletedAll = onChildRemoved(ref(rtdb, 'posts'), (snapshot) => {
      setPosts(prev => prev.filter(p => p.id !== snapshot.key));
    });

    return () => { unsubAdded(); unsubChanged(); unsubRemoved(); unsubDeletedAll(); };
  }, [hiddenUsers]);

  // Busca posts paginados
  const fetchPosts = useCallback(async (cursorTimestamp = null) => {
    const postsRef = ref(rtdb, 'posts');
    let postsQuery;

    if (cursorTimestamp) {
      // Busca a próxima página, terminando no cursor (menos 1 para não repetir)
      postsQuery = query(postsRef, orderByChild('createdAt'), endAt(cursorTimestamp - 1), limitToLast(POSTS_PER_PAGE));
    } else {
      // Busca inicial (os posts mais recentes)
      postsQuery = query(postsRef, orderByChild('createdAt'), limitToLast(POSTS_PER_PAGE));
    }

    try {
      const snapshot = await get(postsQuery);
      if (snapshot.exists()) {
        const fetchedPosts = [];
        snapshot.forEach(child => {
          fetchedPosts.push({ id: child.key, ...child.val() });
        });

        // A ordem vem do mais antigo para o mais novo, então revertemos
        fetchedPosts.reverse();
        
        // Se for a carga inicial e não houver cursor, define o próximo cursor.
        // Se for uma carga de "mais", anexa os posts.
        setPosts(prev => cursorTimestamp ? [...prev, ...fetchedPosts] : fetchedPosts);
        
        // Define o timestamp do último post para o próximo cursor
        setLastPostTimestamp(fetchedPosts[fetchedPosts.length - 1].createdAt);

        // Se o número de posts buscados for menor que o limite, não há mais
        if (fetchedPosts.length < POSTS_PER_PAGE) {
          setHasMore(false);
        }
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Erro ao buscar posts:", error);
    } finally {
        if (cursorTimestamp) setLoadingMore(false); else setLoading(false);
    }
  }, []);

  // Efeito para busca inicial
  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Função para carregar mais posts
  const loadMorePosts = () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    fetchPosts(lastPostTimestamp);
  };

  const removePostFromFeed = (postId) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
  };

  // Modais
  const handleOpenProfile = (u) => setSelectedUser(u);
  const handleCloseProfile = () => setSelectedUser(null);
  const handleOpenEditProfile = (data) => { setSelectedUser(null); setEditProfileData(data); };
  const handleCloseEditProfile = () => setEditProfileData(null);

  // Filtros
  const finalFilteredPosts = posts
    .filter(post => !hiddenUsers.includes(post.authorId))
    .filter(post => filterNSFW ? !post.isNSFW : true);

  if (loading && posts.length === 0) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress /></Box>;
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
