import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import ForgotPasswordDialog from '../components/ForgotPasswordDialog';

// Componentes e Ícones do MUI
import { 
  Container, Box, Paper, Typography, TextField, Button,
  CircularProgress, Alert, Avatar, Grid, Link, Divider
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import GoogleIcon from '@mui/icons-material/Google';

function LoginPage({ embedded = false }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const { login, loginWithGoogle, currentUser, authFlowError, getAuthErrorMessage, clearAuthFlowError } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setError('');
      clearAuthFlowError();
      setLoading(true);
      const userCredential = await login(email, password);
      if (userCredential.user.emailVerified) {
        navigate('/');
      } else {
        navigate('/verificacao-email');
      }
    } catch (err) {
      console.error(err);
      setError('Falha ao entrar. Verifique seu e-mail e senha.');
    }
    setLoading(false);
  }

  async function handleGoogleLogin() {
    try {
      setError('');
      clearAuthFlowError();
      setGoogleLoading(true);
      const result = await loginWithGoogle();

      // Em fluxo redirect, a navegação acontece após retornar ao app.
      if (!result?.redirected) {
        navigate('/');
      }
    } catch (err) {
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/operation-not-supported-in-this-environment') {
        return;
      }
      setError(getAuthErrorMessage(err.code));
    } finally {
      setGoogleLoading(false);
    }
  }

  // Redireciona se o usuário já estiver logado
  if (currentUser) {
    if (currentUser.emailVerified) {
      navigate('/');
    } else {
      navigate('/verificacao-email');
    }
    return null; // Renderiza nada enquanto redireciona
  }

  const content = (
    <Paper elevation={embedded ? 0 : 3} sx={{ padding: 4, width: '100%', mt: embedded ? 0 : 4, borderRadius: 3 }}>
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
          {authFlowError && <Alert severity="warning" sx={{ mt: 2, mb: 1, width: '100%' }}>{authFlowError}</Alert>}
          {error && <Alert severity="error" sx={{ mt: 2, mb: 1, width: '100%' }}>{error}</Alert>}

          <Button
            fullWidth
            variant="contained"
            onClick={handleGoogleLogin}
            disabled={loading || googleLoading}
            startIcon={googleLoading ? <CircularProgress size={18} color="inherit" /> : <GoogleIcon />}
            sx={{ mt: 1, mb: 2, bgcolor: '#DB4437', '&:hover': { bgcolor: '#C3362B' }, display: { xs: 'none', sm: 'inline-flex' } }}
          >
            {googleLoading ? 'Conectando...' : 'Entrar com Google'}
          </Button>

          <Divider sx={{ my: 2, display: { xs: 'none', sm: 'block' } }}>ou</Divider>

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
              <Link component={RouterLink} to="/auth?mode=signup" variant="body2">
                Não tem uma conta? Cadastre-se
              </Link>
            </Grid>
          </Grid>
        </Box>
      </Box>
    </Paper>
  );

  return (
    <>
      {embedded ? (
        content
      ) : (
        <Container component="main" maxWidth="xs">
          <Box
            sx={{
              marginTop: 8,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            {content}
          </Box>
        </Container>
      )}
      <ForgotPasswordDialog
        open={forgotPasswordOpen}
        onClose={() => setForgotPasswordOpen(false)}
      />
    </>
  );
}

export default LoginPage;
