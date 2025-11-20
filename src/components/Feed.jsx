import { useState, useEffect } from 'react';
import { rtdb } from '../firebase/config';
import { ref, onValue, query, orderByChild } from 'firebase/database';
import Post from './Post.jsx';
import ProfileModal from './ProfileModal.jsx';
import { useAuth } from '../contexts/AuthContext';

function Feed({ filterNSFW }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const { hiddenUsers, hideUser, showUser } = useAuth();

  useEffect(() => {
    const postsRef = ref(rtdb, 'posts');
    const postsQuery = query(postsRef, orderByChild('createdAt'));
    const unsubscribe = onValue(postsQuery, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const postsList = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        setPosts(postsList.reverse());
      } else {
        setPosts([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 3. FUNÇÕES PARA CONTROLAR O MODAL
  const handleOpenProfile = (userData) => {
    setSelectedUser(userData);
  };

  const handleCloseProfile = () => {
    setSelectedUser(null);
  };
    // 1. Aplica o filtro de usuários ocultos
  const filteredByHidden = posts.filter(post => !hiddenUsers.includes(post.authorId));

  // 2. Aplica o filtro NSFW sobre a lista já filtrada
  const finalFilteredPosts = filterNSFW
    ? filteredByHidden.filter(post => !post.isNSFW)
    : filteredByHidden;

  if (loading) return <p>Carregando feed...</p>;

  return (
    <div>
      <ProfileModal 
        userToDisplay={selectedUser} 
        onClose={handleCloseProfile}
        // Passa as informações e funções necessárias para o Modal
        hiddenUsers={hiddenUsers}
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
        <p>Ainda não há posts ou você ocultou todos.</p>
      )}
    </div>
  );
}

export default Feed;