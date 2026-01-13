import { useState, useEffect, useCallback, useRef } from 'react';
import { rtdb } from '../firebase/config';
import { ref, query, orderByChild, get, startAt, onChildAdded, onChildChanged, onChildRemoved, limitToLast, endAt } from 'firebase/database';
import Post from './Post.jsx';
import ProfileModal from './ProfileModal.jsx';
import EditProfileModal from './EditProfileModal.jsx';
import { useAuth } from '../contexts/AuthContext';
import { Box, Button, CircularProgress, Typography } from '@mui/material';

const POSTS_PER_PAGE = 5;

function Feed() {
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
    const realtimeQuery = query(postsRef, orderByChild('lastActivityAt'), startAt(mountTimeRef.current + 1));

    const unsubAdded = onChildAdded(realtimeQuery, (snapshot) => {
      if (snapshot.exists()) {
        const newPostData = { id: snapshot.key, ...snapshot.val() };
        // Adiciona o novo post no topo, apenas se não for de um usuário oculto
        if (!hiddenUsers.includes(newPostData.authorId)) {
          setPosts(prev => [newPostData, ...prev]);
        }
      }
    });

    // Atualiza posts existentes caso aconteça uma mudança (por exemplo, lastActivityAt ou likes atualizados)
    const unsubChanged = onChildChanged(realtimeQuery, (snapshot) => {
      if (snapshot.exists()) {
        const updated = { id: snapshot.key, ...snapshot.val() };
        // Remove o post da sua posição atual e re-insere no topo (simulando o boost)
        setPosts(prev => {
          const filtered = prev.filter(p => p.id !== snapshot.key);
          return [updated, ...filtered];
        });
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

  // Busca posts paginados - usa createdAt para paginação confiável
  const fetchPosts = useCallback(async (cursorTimestamp = null) => {
    const postsRef = ref(rtdb, 'posts');
    let postsQuery;

    if (cursorTimestamp && typeof cursorTimestamp === 'number') {
      // Busca a próxima página usando createdAt (nunca muda)
      postsQuery = query(postsRef, orderByChild('createdAt'), endAt(cursorTimestamp - 1), limitToLast(POSTS_PER_PAGE));
    } else {
      // Busca inicial (os posts mais antigos primeiro para paginação)
      postsQuery = query(postsRef, orderByChild('createdAt'), limitToLast(POSTS_PER_PAGE));
    }

    try {
      const snapshot = await get(postsQuery);
      if (snapshot.exists()) {
        const fetchedPosts = [];
        snapshot.forEach(child => {
          const postData = { id: child.key, ...child.val() };
          // Valida que o post tem createdAt válido
          if (postData.createdAt && typeof postData.createdAt === 'number') {
            fetchedPosts.push(postData);
          }
        });

        if (fetchedPosts.length === 0) {
          setHasMore(false);
          setLastPostTimestamp(null);
          return;
        }

        // A ordem vem do mais antigo para o mais novo por createdAt, então revertemos
        fetchedPosts.reverse();
        
        // Ordena os posts retornados por lastActivityAt (mais ativos primeiro)
        // Mas mantém a paginação segura baseada em createdAt
        const sortedByActivity = fetchedPosts.sort((a, b) => (b.lastActivityAt || 0) - (a.lastActivityAt || 0));
        
        // Se for a carga inicial e não houver cursor, define o próximo cursor.
        // Se for uma carga de "mais", anexa os posts.
        setPosts(prev => cursorTimestamp ? [...prev, ...sortedByActivity] : sortedByActivity);
        
        // Se o número de posts buscados for menor que o limite, não há mais posts
        if (fetchedPosts.length < POSTS_PER_PAGE) {
          setHasMore(false);
          setLastPostTimestamp(null);
        } else {
          // Se chegou aqui, pode haver mais posts, atualiza o cursor baseado em createdAt
          const oldestPost = fetchedPosts[0];
          if (oldestPost?.createdAt && typeof oldestPost.createdAt === 'number') {
            setLastPostTimestamp(oldestPost.createdAt);
          } else {
            setHasMore(false);
            setLastPostTimestamp(null);
          }
        }
      } else {
        setHasMore(false);
        setLastPostTimestamp(null);
      }
    } catch (error) {
      console.error("Erro ao buscar posts:", error);
      setHasMore(false);
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
    if (!lastPostTimestamp || typeof lastPostTimestamp !== 'number') {
      setHasMore(false);
      return;
    }
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
    .filter(post => !hiddenUsers.includes(post.authorId));

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
