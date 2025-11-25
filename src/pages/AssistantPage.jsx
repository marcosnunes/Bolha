import { useState, useEffect } from 'react';
import { getDatabase, ref, query, orderByChild, equalTo, get } from "firebase/database";
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import {
  Box, Button, TextField, Typography, Container, Paper, CircularProgress, Alert, AppBar, Toolbar, IconButton
} from '@mui/material';
import SparklesIcon from '@mui/icons-material/AutoAwesome';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

function AssistantPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [userPosts, setUserPosts] = useState([]);

  // Efeito para buscar os posts do usuário
  useEffect(() => {
    if (currentUser) {
      const fetchUserPosts = async () => {
        const rtdb = getDatabase();
        const postsRef = ref(rtdb, 'posts');
        
        // Calcula o timestamp do dia 1º de Janeiro do ano atual
        const currentYear = new Date().getFullYear();
        const startOfYear = new Date(currentYear, 0, 1).getTime();

        // Busca TODOS os posts do usuário
        const userPostsQuery = query(postsRef, orderByChild('authorId'), equalTo(currentUser.uid));
        
        try {
          const snapshot = await get(userPostsQuery);
          if (snapshot.exists()) {
            const postsData = snapshot.val();
            
            // Processa e Filtra
            const postsArray = Object.keys(postsData)
                .map(key => ({
                  id: key,
                  textContent: postsData[key].textContent,
                  createdAt: postsData[key].createdAt
                }))
                .filter(p => {
                    // Mantém apenas se tiver texto E for deste ano
                    return p.textContent && p.createdAt >= startOfYear;
                });

            // Opcional: Ordenar por data (mais antigo para mais novo para o contexto da IA)
            postsArray.sort((a, b) => a.createdAt - b.createdAt);
            
            setUserPosts(postsArray);
          }
        } catch (error) {
          console.error("Erro ao buscar os posts:", error);
          setError("Não foi possível carregar o histórico de posts para contexto.");
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

    setIsLoading(true);
    setError('');
    setResponse('');

    try {
      // Nota: Esta chamada só funciona em produção (Vercel) ou usando 'vercel dev' localmente.
      const apiResponse = await fetch('/api/generateInsights', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prompt, userPosts }),
      });

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json().catch(() => ({}));
        throw new Error(errorData.message || `Erro na API: ${apiResponse.status}`);
      }

      const data = await apiResponse.json();
      setResponse(data.text);

    } catch (err) {
      console.error("Erro na requisição:", err);
      setError('Falha ao conectar com o assistente. Se estiver testando localmente, lembre-se que a API serverless requer o ambiente da Vercel.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ flexGrow: 1, bgcolor: 'grey.100', minHeight: '100vh' }}>
      {/* Barra de Navegação */}
      <AppBar position="sticky" sx={{ pt: { xs: 'env(safe-area-inset-top)', sm: 0 } }}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => navigate('/')} aria-label="voltar">
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, ml: 2 }}>
            Assistente IA
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ mt: 4, pb: 4 }}>
        <Paper sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <SparklesIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          <Typography variant="h5" component="h1" gutterBottom sx={{ mt: 2, textAlign: 'center' }}>
            Insights da sua Bolha
          </Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mb: 4 }}>
            Pergunte sobre seus posts! Ex: "Qual o sentimento geral das minhas postagens?" ou "Me dê ideias baseadas no que já escrevi."
            <br/>
            {/* Mostra dinamicamente quantos posts estão sendo enviados */}
            <small>(Lendo {userPosts.length} posts de {new Date().getFullYear()})</small>
          </Typography>

          <Box sx={{ width: '100%', display: 'flex', gap: 2, mb: 3, flexDirection: { xs: 'column', sm: 'row' } }}>
            <TextField
              fullWidth
              label="Pergunte ao assistente..."
              variant="outlined"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isLoading}
            />
            <Button
              variant="contained"
              onClick={handleGenerateInsights}
              disabled={isLoading}
              sx={{ height: { sm: '56px' }, whiteSpace: 'nowrap' }}
            >
              {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Perguntar'}
            </Button>
          </Box>

          {error && <Alert severity="error" sx={{ width: '100%', mb: 3 }}>{error}</Alert>}

          {response && (
            <Paper elevation={0} sx={{ width: '100%', p: 3, bgcolor: 'grey.50', borderRadius: 2, border: '1px solid', borderColor: 'grey.200' }}>
               <Typography component="div" sx={{ '& p': { mb: 1 } }}>
                 <ReactMarkdown>{response}</ReactMarkdown>
               </Typography>
            </Paper>
          )}
        </Paper>
      </Container>
    </Box>
  );
}

export default AssistantPage;