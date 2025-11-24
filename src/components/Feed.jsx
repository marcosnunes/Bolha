import { useState, useEffect, useCallback, useRef } from 'react';
import { rtdb } from '../firebase/config';
import { ref, query, orderByChild, get, startAt, onChildAdded } from 'firebase/database';
import Post from './Post.jsx';
import ProfileModal from './ProfileModal.jsx';
import EditProfileModal from './EditProfileModal.jsx';
import { useAuth } from '../contexts/AuthContext';
import { Box, Button, CircularProgress, Typography } from '@mui/material';

const POSTS_PER_PAGE = 5;

// Removemos refreshTrigger das props, pois o realtime fará esse trabalho
function Feed({ filterNSFW }) {
  const [allPostMetas, setAllPostMetas] = useState([]);
  const [posts, setPosts] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  
  // Ref para marcar o tempo exato que o componente montou.
  // Usaremos isso para dizer ao Firebase: "Só me mande posts criados DEPOIS desse horário".
  const mountTimeRef = useRef(Date.now());

  // Estados para controle dos Modais
  const [selectedUser, setSelectedUser] = useState(null);
  const [editProfileData, setEditProfileData] = useState(null);

  const { hiddenUsers, hideUser, showUser } = useAuth();

  // ----------------------------------------------------------------
  // 1. LISTENER REALTIME (Para novos posts instantâneos)
  // ----------------------------------------------------------------
  useEffect(() => {
    const postsRef = ref(rtdb, 'posts');
    
    // Consulta: Ordene por data e comece a partir do momento atual (+1ms para segurança)
    const realtimeQuery = query(
      postsRef, 
      orderByChild('createdAt'), 
      startAt(mountTimeRef.current + 1)
    );

    const unsubscribe = onChildAdded(realtimeQuery, (snapshot) => {
      const newPostData = snapshot.val();
      const newPostId = snapshot.key;

      if (newPostData) {
        setPosts((prevPosts) => {
          // Evita duplicatas caso o post já tenha sido carregado por algum motivo
          if (prevPosts.some(p => p.id === newPostId)) returnHZprevPosts;
          
          const newPost = { id: newPostId, ...newPostData };
          
          // Adiciona o novo post EXATAMENTE no topo da lista visual
          return [newPost, ...prevPosts];
        });
        
        // Opcional: Adicionar aos metadados para manter consistência interna, 
        // embora visualmente o estado 'posts' seja o que importa.
        setAllPostMetas(prev => [{ id: newPostId, createdAt: newPostData.createdAt }, ...prev]);
      }
    });

    return () => unsubscribe();
  }, []);

  // Função para buscar todos os metadados (IDs e datas) dos posts
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
        // Ordena do mais novo para o mais antigo e salva
        setAllPostMetas(metas.reverse());
      } else {
        setAllPostMetas([]);
        setPosts([]);
        setLoading(false); // Se não tem dados, para o loading aqui
      }
    } catch (error) {
      console.error("Erro ao buscar metadados dos posts:", error);
      setLoading(false);
    }
    // O setLoading(false) final acontece no useEffect que carrega o primeiro batch
  }, []);

  // Busca inicial dos metadados
  useEffect(() => {
    fetchAllPostMetas();
  }, [fetchAllPostMetas]);

  // Função para buscar o conteúdo completo de um lote de posts
  const fetchPostBatch = useCallback(async (page, metasAtual) => {
    // Usamos 'metasAtual' passado como argumento para garantir que estamos lendo o estado mais fresco
    const listaMetas = metasAtual || allPostMetas;
    
    if (listaMetas.length === 0) return [];
    
    const startIndex = page * POSTS_PER_PAGE;
    const endIndex = startIndex + POSTS_PER_PAGE;
    const postIdsToFetch = listaMetas.slice(startIndex, endIndex);

    if (postIdsToFetch.length === 0) {
      return [];
    }

    const postPromises = postIdsToFetch.map(meta => {
      const postRef = ref(rtdb, `posts/${meta.id}`);
      return get(postRef);
    });

    constqnpostSnapshots = await Promise.all(postPromises);
    
    const newPosts = postSnapshots
      .filter(snapshot => snapshot.exists())
      .map(snapshot => ({ id: snapshot.key, ...snapshot.val() }));
    
    return { newPosts, hasMoreCheck: endIndex < listaMetas.length };
  }, [allPostMetas]);

  // Efeito para carregar a primeira página APÓS ter os metadados
  useEffect(() => {
    if (allPostMetas.length > 0 && currentPage === 0) {
      setLoading(true);
      
      // Passamos allPostMetas explicitamente
      fetchPostBatch(0, allPostMetas).then((result) => {
        if (result) {
            const { newPosts, hasMoreCheck } = result;
            
            setPosts(currentPosts => {
                // Mesclagem cuidadosa: mantém o que o realtime já trouxe e adiciona o histórico
                // Filtrando duplicatas pelo ID
                const existingIds = new Set(currentPosts.map(p => p.id));
                const uniqueNewPosts = newPosts.filter(p => !existingIds.has(p.id));
                return [...currentPosts, ...uniqueNewPosts];
            });
            
            setHasMore(hasMoreCheck);
            setCurrentPage(1);
        }
        setLoading(false);
      });
    }
  }, [allPostMetas, fetchPostBatch, currentPage]);

  // Função para carregar mais posts (paginação)
  const loadMorePosts = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    
    const result = await fetchPostBatch(currentPage, allPostMetas);
    
    if (result) {
        const { newPosts, hasMoreCheck } = result;
        
        setPosts(prevPosts => {
            const existingIds = new Set(prevPosts.map(p => p.id));
            const uniqueNewPosts = newPosts.filter(p => !existingIds.has(p.id));
            return [...prevPosts, ...uniqueNewPosts];
        });

        setHasMore(hasMoreCheck);
        setCurrentPage(prevPage => prevPage + 1);
    }
    setLoadingMore(false);
  };
  
  // Função para remover o post da lista visualmente na hora
  const removePostFromFeed = (postIdToDelete) => {
    setPosts(currentPosts => currentPosts.filter(post => post.id !== postIdToDelete));
    setAllPostMetas(currentMetas => currentMetas.filter(meta => meta.id !== postIdToDelete));
  };

  // Funções de Modal
  const handleOpenProfile = (userData) => setSelectedUser(userData);
  const handleCloseProfile = () => setSelectedUser(null);
  
  const handleOpenEditProfile = (profileData) => {
    setSelectedUser(null);
    setEditProfileData(profileData);
  };

  const handleCloseEditProfile = () => setEditProfileData(null);

  // Filtros de exibição
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

      {/* Botão Carregar Mais - Só aparece se não estiver carregando e tiver mais itens */}
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
