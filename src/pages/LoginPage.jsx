import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate, Link as RouterLink } from 'react-router-dom';

// Componentes e Ícones do MUI
import { 
  Container, Box, Card, CardContent, CardActions, Typography, 
  TextField, Button, CircularProgress, Alert 
} from '@mui/material';
import LoginIcon from '@mui/icons-material/Login';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, currentUser } = useAuth();
  const navigate = useNavigate();

  // Efeito para redirecionar se o usuário já estiver logado
  useEffect(() => {
    if (currentUser) {
      navigate('/');
    }
  }, [currentUser, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      await login(email, password);
      // A navegação após o login será tratada pelo useEffect acima
      // quando o currentUser for atualizado.
    } catch (err) {
      console.error(err);
      setError('Falha ao entrar. Verifique seu e-mail e senha.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container component="main" maxWidth="xs" sx={{ display: 'flex', alignItems: 'center', height: '100vh' }}>
      <Card sx={{ width: '100%', boxShadow: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 2 }}>
          <LoginIcon color="primary" sx={{ fontSize: 40 }}/>
          <Typography component="h1" variant="h5" sx={{ mt: 1 }}>
            Login
          </Typography>
        </Box>

        <CardContent>
          <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Endereço de E-mail"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Senha"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Entrar'}
            </Button>
          </Box>
        </CardContent>

        <CardActions sx={{ justifyContent: 'center', pb: 2 }}>
          <RouterLink to="/cadastro" style={{ textDecoration: 'none' }}>
              <Button>Não tem uma conta? Cadastre-se</Button>
          </RouterLink>
        </CardActions>
      </Card>
    </Container>
  );
}

export default LoginPage;
