import { useAuth } from '../contexts/AuthContext';
import { rtdb } from '../firebase/config';
import { ref, remove } from 'firebase/database';
import { useState, useRef, useEffect } from 'react';

function Post({ postData, onAuthorClick }) {
  const { currentUser } = useAuth();
  const { authorNickname, textContent, createdAt, mediaURL, mediaType, authorId, id } = postData;
  const formattedDate = new Date(createdAt).toLocaleString('pt-BR');
  const isOwner = currentUser && currentUser.uid === authorId;
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  const videoRef = useRef(null);

  // Função para apagar o post (completa e correta)
  const handleDeletePost = async () => {
    if (window.confirm("Tem certeza de que deseja apagar este post? Esta ação não pode ser desfeita.")) {
      try {
        const postRef = ref(rtdb, `posts/${id}`);
        await remove(postRef);
      } catch (error) {
        console.error("Erro ao apagar o post:", error);
        alert("Não foi possível apagar o post. Tente novamente.");
      }
    }
  };
  
  const handleAuthorClick = () => { onAuthorClick({ authorId: authorId, authorNickname: authorNickname }); };
  const getVideoThumbnail = (videoUrl) => { if (!videoUrl) return ''; return videoUrl.replace(/\.\w+$/, '.jpg'); };

  useEffect(() => {
    if (isVideoPlaying && videoRef.current) {
      // Força a repintura. Às vezes, apenas chamar play() novamente é suficiente.
      videoRef.current.play();
    }
  }, [isVideoPlaying]); // Roda sempre que o estado 'isVideoPlaying' muda para true

  return (
    <div className="card" style={{ marginBottom: '20px' }}>
      {mediaURL && (
        <div 
          className="card-image" 
          style={{ 
            position: 'relative', 
            backgroundColor: '#e0e0e0',
            maxHeight: '75vh',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          {mediaType === 'image' ? (
            <img 
              src={mediaURL} 
              alt="Conteúdo do post" 
              style={{ width: '100%', objectFit: 'contain', maxHeight: '75vh' }}
            />
          ) : (
            <>
              {/* A thumbnail sempre define o espaço */}
              <img 
                src={getVideoThumbnail(mediaURL)} 
                alt="Thumbnail do vídeo" 
                style={{ 
                  width: '100%', 
                  objectFit: 'contain', 
                  maxHeight: '75vh',
                  visibility: isVideoPlaying ? 'hidden' : 'visible'
                }} 
              />
              
              {!isVideoPlaying ? (
                // Botão de Play
                <div onClick={() => setIsVideoPlaying(true)} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer' }}>
                   <span className="btn-floating btn-large waves-effect waves-light red pulse">
                    <i className="material-icons">play_arrow</i>
                  </span>
                </div>
              ) : (
                // Player de Vídeo
                <video 
                  ref={videoRef} // Associa a referência ao elemento
                  src={mediaURL} 
                  controls 
                  autoPlay 
                  onEnded={() => setIsVideoPlaying(false)}
                  onPause={(e) => {
                    // Ignora o pause que acontece naturalmente no final do vídeo
                    if (e.target.currentTime < e.target.duration) {
                      setIsVideoPlaying(false);
                    }
                  }}
                  style={{ 
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%', 
                    height: '100%',
                    objectFit: 'contain'
                  }} 
                />
              )}
            </>
          )}
        </div>
      )}
      
      <div className="card-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <span 
            className="card-title activator grey-text text-darken-4" 
            onClick={handleAuthorClick} 
            style={{ cursor: 'pointer', fontSize: '1.2rem' }}
          >
            {authorNickname}
          </span>
          <div style={{display: 'flex', alignItems: 'center'}}>
            <span className="grey-text" style={{ fontSize: '0.9rem', marginRight: '15px' }}>{formattedDate}</span>
            {isOwner && (
              <i className="material-icons" onClick={handleDeletePost} style={{ cursor: 'pointer', color: '#9e9e9e' }}>delete</i>
            )}
          </div>
        </div>
        {textContent && <p>{textContent}</p>}
      </div>
    </div>
  );
}

export default Post;