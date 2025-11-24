import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
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
  const { login, currentUser, useEffect } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      await login(email, password);
      navigate('/');
    } catch (err) {
      console.error(err);
      setError('Falha ao entrar. Verifique seu e-mail e senha.');
    }
    setLoading(false);
  }

  // Redireciona se o usuário já estiver logado
  useEffect(() => {
    if (currentUser) {
      navigate('/');
    }
  }, [currentUser, navigate]);

  return (
    <Container component="main" maxWidth="xs" sx={{ mt: 8 }}>
      <Card>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography component="h1" variant="h5" align="center">
            Login na Bolha
          </Typography>
          
          {error && <Alert severity="error">{error}</Alert>}
          
          <Box component="form" onSubmit={handleSubmit} noValidate>
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
              disabled={loading}
              sx={{ mt: 3, mb: 2 }}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <LoginIcon />}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </Box>
        </CardContent>
        <CardActions sx={{ justifyContent: 'center', bgcolor: 'grey.100' }}>
          <Typography variant="body2">
            Não tem uma conta? <RouterLink to="/cadastro">Cadastre-se</RouterLink>
          </Typography>
        </CardActions>
      </Card>
    </Container>
  );
}

export default LoginPage;