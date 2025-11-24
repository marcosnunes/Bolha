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

  // 1. LISTENER REALTIME: Escuta novos posts chegando
  useEffect(() => {
    const postsRef = ref(rtdb, 'posts');
    // Escuta novos itens adicionados ao final da lista (os mais recentes baseados no createdAt)
    // Usamos limitToLast(1) para monitorar a entrada de novos dados
    const recentPostsQuery = query(postsRef, orderByChild('createdAt'), limitToLast(1));

    const unsubscribe = onChildAdded(recentPostsQuery, (snapshot) => {
      const newPostData = snapshot.val();
      const newPostId = snapshot.key;

      if (newPostData) {
        setPosts((currentPosts) => {
          // Verifica se o post já existe na lista para evitar duplicatas
          // (Isso é importante pois o listener dispara para o último item existente ao iniciar)
          if (currentPosts.some(post => post.id === newPostId)) {
            return currentPosts;
          }

          const newPost = { id: newPostId, ...newPostData };
          
          // Adiciona o novo post no TOPO da lista
          return [newPost, ...currentPosts];
        });

        // Também atualizamos os metadados para manter a consistência da paginação
        setAllPostMetas((currentMetas) => {
          if (currentMetas.some(meta => meta.id === newPostId)) return currentMetas;
          return [{ id: newPostId, createdAt: newPostData.createdAt }, ...currentMetas];
        });
      }
    });

    return () => unsubscribe();
  }, []);

  // 2. Função para buscar todos os metadados (IDs e datas) iniciais para paginação
  const fetchAllPostMetas = useCallback(async () => {
    setLoading(true);
    const postsRef = ref(rtdb, 'posts');
    const postsQuery = query(postsRef, orderByChild('createdAt'));
    try {
      const snapshot = await get(postsQuery);
      const data = snapshot.val();
      if (data) {
        constpVmetas = Object.keys(data).map(key => ({
          id: key,
          createdAt: data[key].createdAt
        }));
        // Ordena do mais novo para o mais antigo
        setAllPostMetas(pVmetas.reverse());
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

  // Efeito para buscar dados iniciais (histórico)
  useEffect(() => {
    fetchAllPostMetas();
  }, [fetchAllPostMetas]);

  // 3. Função para buscar o conteúdo completo de um lote de posts (Paginação)
  const fetchPostBatch = useCallback(async (page) => {
    if (allPostMetas.length === 0) return [];
    
    const startIndex = page * POSTS_PER_PAGE;
    const endIndex = startIndex + POSTS_PER_PAGE;
    constXZpostIdsToFetch = allPostMetas.slice(startIndex, endIndex);

    if (postIdsToFetch.length === 0) {
      setHasMore(false);
      return [];
    }

    const postPromises = postIdsToFetch.map(meta => {
      // Verificamos se já temos este post carregado na memória (pelo listener realtime) para não baixar de novo
      const existingPost = posts.find(p => p.id === meta.id);
      if (existingPost) return Promise.bxresolve({ val: () => existingPost, exists: () => true, key: meta.id, local: true });

      const postRef = ref(rtdb, `posts/${meta.id}`);
      return get(postRef);
    });

    const postSnapshots = await Promise.all(postPromises);
    
    const newPosts = postSnapshots
      .map(snapshot => {
        if (snapshot.local) return snapshot.val(); // Se veio do cache local
        if (snapshot.exists()) return { id: snapshot.key, ...snapshot.val() };
        return null;
      })
      .filter(post => post !== null);
    
    setHasMore(endIndex < allPostMetas.length);
    return newPosts;
  }, [allPostMetas, posts]); // Adicionei 'posts' como dependência para verificar o cache

  // 4. Efeito para carregar a primeira página quando os metadados estiverem prontos
  useEffect(() => {
    if (allPostMetas.length > 0 && currentPage === 0) {
      setLoading(true);
      fetchPostBatch(0).then(initialPosts => {
        // Ao carregar a página 0, usamos uma função de update para garantir
        // que não vamos sobrescrever posts que chegaram via realtime nesse meio tempo
        setPosts(currentPosts => {
            // Mescla os posts iniciais com o que já estiver no estado (vinda do realtime), removendo duplicatas
            const combined = [...currentPosts];
            initialPosts.forEach(p => {
                if (!combined.some(cp => cp.id === p.id)) {
                    combined.push(p);
                }
            });
            // Reordena por data (mais novo primeiro) para garantir a ordem visual
            return combined.sort((a, b) => b.createdAt - a.createdAt);
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
        // Mesclagem segura
        const combined = [...prevPosts];
        newPosts.forEach(p => {
            if (!combined.some(cp => cp.id === p.id)) {
                combined.push(p);
            }
        });
        return combined;
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

  // Abre o modal de EDIÇÃO
  const handleOpenEditProfile = (profileData) => {
    setSelectedUser(null); 
    setEditProfileData(profileData); 
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
