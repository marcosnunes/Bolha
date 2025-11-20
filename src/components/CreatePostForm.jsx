import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { rtdb } from '../firebase/config';
import { ref, push, serverTimestamp } from 'firebase/database';
import useToxicityModel from '../hooks/useToxicityModel';

function CreatePostForm() {
  const [postContent, setPostContent] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { currentUser, userProfile } = useAuth();
  const { loadingModel, classifyText } = useToxicityModel();

  // SUAS FUNÇÕES DE MODERAÇÃO DE TEXTO
  const forbiddenWords = ['buceta', 'caralho', 'puta'];
  const containsLink = (text) => {
    const urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\\/%?=~_|!:,.;]*[-A-Z0-9+&@#\\/%=~_|])|(\bwww\.[-A-Z0-9+&@#\\/%?=~_|!:,.;]*[-A-Z0-9+&@#\\/%=~_|])/ig;
    return urlRegex.test(text);
  };
  const containsForbiddenWord = (text) => {
    const lowerCaseText = text.toLowerCase();
    return forbiddenWords.some(word => lowerCaseText.includes(word));
  };

  // Função para lidar com a seleção de arquivo
  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (containsLink(postContent)) return setError("Posts contendo links não são permitidos.");
    if (!postContent.trim() && !file) return setError("O post precisa ter texto ou uma imagem/vídeo.");
    if (!currentUser || !userProfile) return setError("Você precisa estar logado para postar.");

    setLoading(true);

    try {
      let mediaURL = null;
      let mediaType = null;

      if (file) {
        // 1. Prepara os dados para o Cloudinary
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);

        // 2. Envia para a API do Cloudinary
        const response = await fetch(`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/auto/upload`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) throw new Error('Falha no upload da mídia.');

        const data = await response.json();
        mediaURL = data.secure_url;
        mediaType = data.resource_type; // 'image' ou 'video'
      }

      // 3. Moderação de texto
      const isToxic = await classifyText(postContent);
      const isForbidden = containsForbiddenWord(postContent);

      // 4. Salva tudo no Firebase Realtime Database
      const postsListRef = ref(rtdb, 'posts');
      await push(postsListRef, {
        textContent: postContent,
        authorId: currentUser.uid,
        authorNickname: userProfile.nickname,
        createdAt: serverTimestamp(),
        isNSFW: isToxic || isForbidden,
        mediaURL: mediaURL,
        mediaType: mediaType,
      });

      // 5. Limpa o formulário
      setPostContent('');
      setFile(null);
      if (document.getElementById('file-input')) document.getElementById('file-input').value = "";
      if (document.querySelector('.file-path')) document.querySelector('.file-path').value = "";

    } catch (err) {
      console.error("Erro ao publicar o post:", err);
      setError("Ocorreu um erro ao publicar seu post. Tente novamente.");
    }

    setLoading(false);
  };

  return (
    <div className="card" style={{ marginBottom: '2rem' }}>
      <div className="card-content">
        <span className="card-title">Crie um novo post</span>
        {loadingModel && <p className="grey-text">Carregando modelo de moderação...</p>}
        {error && <p className="red-text">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="input-field">
            <textarea
              id="postContent"
              className="materialize-textarea"
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
            ></textarea>
            <label htmlFor="postContent">No que você está pensando?</label>
          </div>

          <div className="file-field input-field">
            <div className="btn blue darken-4">
              <span><i className="material-icons">attach_file</i></span>
              <input type="file" id="file-input" onChange={handleFileChange} accept="image/*,video/*" />
            </div>
            <div className="file-path-wrapper">
              <input className="file-path validate" type="text" placeholder="Adicionar imagem ou vídeo (opcional)" />
            </div>
          </div>

          <button
            type="submit"
            className="btn waves-effect waves-light blue darken-4"
            disabled={loading || loadingModel}
          >
            {loading ? 'Publicando...' : 'Publicar'}
            <i className="material-icons right">send</i>
          </button>
        </form>
      </div>
    </div>
  );
}

export default CreatePostForm;