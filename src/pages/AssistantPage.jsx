
import { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import ReactMarkdown from 'react-markdown';
import {
  Box, Button, TextField, Typography, Container, Paper, CircularProgress, Alert
} from '@mui/material';
import SparklesIcon from '@mui/icons-material/AutoAwesome'; // Um ícone legal para IA

function AssistantPage() { // CORRIGIDO: O nome do componente agora é AssistantPage
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerateInsights = async () => {
    if (!prompt) {
      setError('Por favor, digite uma pergunta.');
      return;
    }

    setIsLoading(true);
    setError('');
    setResponse('');

    try {
      const functions = getFunctions();
      const generatePersonalInsights = httpsCallable(functions, 'generatePersonalInsights');
      
      const result = await generatePersonalInsights({ prompt });
      
      const data = result.data;

      if (data.success) {
        setResponse(data.text);
      } else {
        setError(data.message || 'Ocorreu um erro desconhecido.');
      }

    } catch (err) {
      console.error("Erro ao chamar a Cloud Function:", err);
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

export default AssistantPage; // CORRIGIDO: A exportação agora corresponde ao nome do componente
