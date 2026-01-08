import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import ForgotPasswordDialog from '../components/ForgotPasswordDialog';

// Componentes e Ícones do MUI
import { 
  Container, Box, Paper, Typography, TextField, Button, 
  CircularProgress, Alert, Avatar, Grid, Link 
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const { login, currentUser } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      await login(email, password);
      navigate('/'); // Redireciona para a home após o login
    } catch (err) {
      console.error(err);
      setError('Falha ao entrar. Verifique seu e-mail e senha.');
    }
    setLoading(false);
  }

  // Redireciona se o usuário já estiver logado
  if (currentUser) {
    navigate('/');
    return null; // Renderiza nada enquanto redireciona
  }

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ padding: 4, width: '100%', mt: 4 }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
              <LockOutlinedIcon />
            </Avatar>
            <Typography component="h1" variant="h5">
              Login
            </Typography>
            <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1, width: '100%' }}>
              {error && <Alert severity="error" sx={{ mt: 2, mb: 1, width: '100%'}}>{error}</Alert>}
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
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Entrar'}
              </Button>
              <Grid container spacing={1}>
                <Grid item xs={12} sm>
                  <Link
                    component="button"
                    type="button"
                    variant="body2"
                    onClick={(e) => {
                      e.preventDefault();
                      setForgotPasswordOpen(true);
                    }}
                  >
                    Esqueci minha senha
                  </Link>
                </Grid>
                <Grid item xs={12} sm textAlign={{ sm: 'right' }}>
                  <Link component={RouterLink} to="/cadastro" variant="body2">
                    Não tem uma conta? Cadastre-se
                  </Link>
                </Grid>
              </Grid>
            </Box>
          </Box>
        </Paper>
      </Box>
      <ForgotPasswordDialog 
        open={forgotPasswordOpen} 
        onClose={() => setForgotPasswordOpen(false)} 
      />
    </Container>
  );
}

export default LoginPage;
