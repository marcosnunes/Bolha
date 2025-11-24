import { useState, useEffect, useCallback } from 'react';
import { rtdb } from '../firebase/config';
import { ref, query, orderByChild, get, limitToLast, onChildAdded } from 'firebase/database';
import Post from './Post.jsx';
import ProfileModal from './ProfileModal.jsx';
import EditProfileModal from './EditProfileModal.jsx';
import { useAuth } from '../contexts/AuthContext';
import { Box, Button, CircularProgress, Typography } from '@mui/material';

const POSTS_PER_PAGE = 5;

function Feed({ filterNSFW }) {
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

  useEffect(() => {
    const postsRef = ref(rtdb, 'posts');
    // Escuta o último item adicionado ao banco (ordenado por data)
    const latestPostQuery = query(postsRef, orderByChild('createdAt'), limitToLast(1));

    const unsubscribe = onChildAdded(latestPostQuery, (snapshot) => {
      const newPostData = snapshot.val();
      const newPostId = snapshot.key;

      if (newPostData) {
        setPosts((currentPosts) => {
          // Verifica se o post JÁ existe na lista (para evitar duplicatas na carga inicial)
          const alreadyExists = currentPosts.some(post => post.id === newPostId);
          
          if (alreadyExists) {
            return currentPosts; // Não faz nada se já tivermos esse post
          }

          // Se não existe, é um post novo! Adiciona no topo da lista.
          const newPostObj = { id: newPostId, ...newPostData };
          return [newPostObj, ...currentPosts];
        });

        // Atualiza a lista de IDs também para manter a consistência se o usuário rolar
        setAllPostMetas((currentMetas) => {
          const metaExists = currentMetas.some(meta => meta.id === newPostId);
          if (metaExists) returnHZcurrentMetas;
          return [{ id: newPostId, createdAt: newPostData.createdAt }, ...currentMetas];
        });
      }
    });

    // Limpa o ouvinte quando sair da página
    return () => unsubscribe();
  }, []); 
  
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

  // Efeito para buscar dados iniciais
  useEffect(() => {
    fetchAllPostMetas();
  }, [fetchAllPostMetas]);

  // 2. Função para buscar o conteúdo completo de um lote de posts
  // (Mantido idêntico ao seu código original)
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
      returnHbget(postRef);
    });

    constqnpostSnapshots = await Promise.all(postPromises);
    
    // Filtra posts que podem ter sido deletados e formata os dados
    const newPosts = postSnapshots
      .filter(snapshot => snapshot.exists())
      .map(snapshot => ({ id: snapshot.key, ...snapshot.val() }));
    
    setHasMore(endIndex < allPostMetas.length);
    return newPosts;
  }, [allPostMetas]);

  // 3. Efeito para carregar a primeira página quando os metadados estiverem prontos
  useEffect(() => {
    if (allPostMetas.length > 0 && currentPage === 0) { // Adicionei check de currentPage === 0
      setLoading(true);
      fetchPostBatch(0).then(initialPosts => {
        // AQUI ESTÁ O SEGREDO: Mesclamos com o estado atual em vez de substituir
        // Isso impede que um post novo (do realtime) suma quando o carregamento inicial terminar
        setPosts(currentPosts => {
            const existingIds = new Set(currentPosts.map(p => p.id));
            const uniqueInitialPosts = initialPosts.filter(p => !existingIds.has(p.id));
            // Coloca o que já tinha (novos) primeiro, depois o histórico
            return [...currentPosts, ...uniqueInitialPosts];
        });
        setCurrentPage(1);
        setLoading(false);
      });
    }
  }, [allPostMetas, fetchPostBatch, currentPage]);

  // Função para carregar mais posts (paginação)
  const loadMorePosts = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    const newPosts = await fetchPostBatch(currentPage);
    
    setPosts(prevPosts => {
        // Proteção extra contra duplicatas na paginação
        const existingIds = new Set(prevPosts.map(p => p.id));
        const uniqueNewPosts = newPosts.filter(p => !existingIds.has(p.id));
        return [...prevPosts, ...uniqueNewPosts];
    });

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
