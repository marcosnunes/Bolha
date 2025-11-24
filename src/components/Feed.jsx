import { useState, useEffect, useCallback } from 'react';
import { rtdb } from '../firebase/config';
import { ref, query, orderByChild, get } from 'firebase/database';
import Post from './Post.jsx';
import ProfileModal from './ProfileModal.jsx';
import EditProfileModal from './EditProfileModal.jsx';
import { useAuth } from '../contexts/AuthContext';
import { Box, Button, CircularProgress, Typography } from '@mui/material';

const POSTS_PER_PAGE = 5;

function Feed({ filterNSFW, refreshTrigger }) {
  const [allPostMetas, setAllPostMetas] = useState([]);
  const [posts, setPosts] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  
  // Estados para controle dos Modais
  const [selectedUser, setSelectedUser] = useState(null);
  const [editProfileData, setEditProfileData] = useState(null);

  const { hiddenUsers, hideUser, showUser } = useAuth();

  // 1. Função para buscar todos os metadados (IDs e datas) dos posts
  const fetchAllPostMetas = useCallback(async () => {
    setLoading(true);
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
        // Ordena do mais novo para o mais antigo
        setAllPostMetas(metas.reverse());
      } else {
        setAllPostMetas([]);
        setPosts([]);
      }
    } catch (error) {
      console.error("Erro ao buscar metadados dos posts:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Efeito para buscar dados iniciais e reagir ao refreshTrigger (novo post)
  useEffect(() => {
    fetchAllPostMetas();
  }, [fetchAllPostMetas, refreshTrigger]);

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

    const postPromises = postIdsToFetch.map(meta => {
      const postRef = ref(rtdb, `posts/${meta.id}`);
      return get(postRef);
    });

    const postSnapshots = await Promise.all(postPromises);
    
    // Filtra posts que podem ter sido deletados e formata os dados
    const newPosts = postSnapshots
      .filter(snapshot => snapshot.exists())
      .map(snapshot => ({ id: snapshot.key, ...snapshot.val() }));
    
    setHasMore(endIndex < allPostMetas.length);
    return newPosts;
  }, [allPostMetas]);

  // 3. Efeito para carregar a primeira página quando os metadados estiverem prontos
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

  // Função para carregar mais posts (paginação)
  const loadMorePosts = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    const newPosts = await fetchPostBatch(currentPage);
    setPosts(prevPosts => [...prevPosts, ...newPosts]);
    setCurrentPage(prevPage => prevPage + 1);
    setLoadingMore(false);
  };
  
  // Função para remover o post da lista visualmente na hora
  const removePostFromFeed = (postIdToDelete) => {
    setPosts(currentPosts => currentPosts.filter(post => post.id !== postIdToDelete));
    setAllPostMetas(currentMetas => currentMetas.filter(meta => meta.id !== postIdToDelete));
  };

  // Abre o modal de visualização de perfil
  const handleOpenProfile = (userData) => {
    setSelectedUser(userData);
  };

  // Fecha o modal de visualização de perfil
  const handleCloseProfile = () => {
    setSelectedUser(null);
  };

  // Abre o modal de EDIÇÃO (chamado de dentro do ProfileModal)
  const handleOpenEditProfile = (profileData) => {
    setSelectedUser(null); // Fecha o modal de visualização primeiro
    setEditProfileData(profileData); // Abre o modal de edição
  };

  // Fecha o modal de EDIÇÃO
  const handleCloseEditProfile = () => {
    setEditProfileData(null);
  };

  // Filtros de exibição (Bloqueio e NSFW)
  const finalFilteredPosts = posts
    .filter(post => !hiddenUsers.includes(post.authorId))
    .filter(post => filterNSFW ? !post.isNSFW : true);

  if (loading && posts.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Modal de Visualização de Perfil */}
      <ProfileModal 
        userToDisplay={selectedUser} 
        onClose={handleCloseProfile}
        onHideUser={hideUser} 
        onShowUser={showUser}
        onEditProfile={handleOpenEditProfile}
      />

      {/* Modal de Edição de Perfil */}
      {editProfileData && (
        <EditProfileModal 
          open={!!editProfileData}
          onClose={handleCloseEditProfile}
          currentNickname={editProfileData.nickname}
          currentPhotoURL={editProfileData.photoURL}
        />
      )}

      {/* Lista de Posts */}
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

      {/* Botão Carregar Mais */}
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
