
import { useState, useEffect } from 'react';
import { getDatabase, ref, query, orderByChild, equalTo, get } from "firebase/database";
import { useAuth } from '../hooks/useAuth';
import ReactMarkdown from 'react-markdown';
import {
  Box, Button, TextField, Typography, Container, Paper, CircularProgress, Alert
} from '@mui/material';
import SparklesIcon from '@mui/icons-material/AutoAwesome';

function AssistantPage() {
  const { currentUser } = useAuth(); // Hook para pegar o usuário logado
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [userPosts, setUserPosts] = useState([]);

  // Efeito para buscar os posts do usuário quando o componente for montado
  useEffect(() => {
    if (currentUser) {
      const fetchUserPosts = async () => {
        const rtdb = getDatabase();
        const postsRef = ref(rtdb, 'posts');
        const userPostsQuery = query(postsRef, orderByChild('authorId'), equalTo(currentUser.uid));
        
        try {
          const snapshot = await get(userPostsQuery);
          if (snapshot.exists()) {
            const postsData = snapshot.val();
            const postsArray = Object.keys(postsData).map(key => ({
              id: key,
              ...postsData[key]
            }));
            setUserPosts(postsArray);
          } else {
            console.log("Nenhum post encontrado para o usuário.");
          }
        } catch (error) {
          console.error("Erro ao buscar os posts:", error);
          setError("Não foi possível carregar o histórico de posts.");
        }
      };

      fetchUserPosts();
    }
  }, [currentUser]);

  const handleGenerateInsights = async () => {
    if (!prompt) {
      setError('Por favor, digite uma pergunta.');
      return;
    }

    if (!currentUser) {
        setError("Você precisa estar logado para usar o assistente.");
        return;
    }

    setIsLoading(true);
    setError('');
    setResponse('');

    try {
      const apiResponse = await fetch('/api/generateInsights', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prompt, userPosts }),
      });

      const data = await apiResponse.json();

      if (apiResponse.ok) {
        setResponse(data.text);
      } else {
        setError(data.message || 'Ocorreu um erro desconhecido.');
      }

    } catch (err) {
      console.error("Erro ao chamar a API da Vercel:", err);
      setError(err.message || 'Falha ao conectar com o serviço de insights. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Paper sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <SparklesIcon sx={{ fontSize: 40, color: 'primary.main' }} />
        <Typography variant="h4" component="h1" gutterBottom sx={{ mt: 2 }}>
          Seu Assistente de Insights
        </Typography>
        <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ mb: 4 }}>
          Pergunte sobre sua atividade na Bolha! Por exemplo: "Quais foram os temas que eu mais postei este mês?" ou "Faça um resumo dos posts que eu curti na última semana."
        </Typography>

        <Box sx={{ width: '100%', display: 'flex', gap: 2, mb: 3 }}>
          <TextField
            fullWidth
            label="Sua pergunta para o assistente..."
            variant="outlined"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleGenerateInsights()}
            disabled={isLoading}
          />
          <Button
            variant="contained"
            onClick={handleGenerateInsights}
            disabled={isLoading}
            sx={{ height: '56px', whiteSpace: 'nowrap' }}
          >
            {isLoading ? <CircularProgress size={24} /> : 'Perguntar'}
          </Button>
        </Box>

        {error && <Alert severity="error" sx={{ width: '100%', mb: 3 }}>{error}</Alert>}

        {response && (
          <Box sx={{ width: '100%', p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, background: '#f9f9f9', mt: 3, "& p": { margin: 0 } }}>
             <ReactMarkdown>
                {response}
             </ReactMarkdown>
          </Box>
        )}
      </Paper>
    </Container>
  );
}

export default AssistantPage;
