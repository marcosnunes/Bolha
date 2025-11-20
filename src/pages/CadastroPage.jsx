import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { rtdb } from '../firebase/config';
import { ref, set, update, serverTimestamp } from 'firebase/database';
import { useNavigate, useParams, Link as RouterLink } from 'react-router-dom';

// Componentes e Ícones do MUI
import { 
  Container, Box, Card, CardContent, CardActions, Typography, 
  TextField, Button, CircularProgress, Alert 
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';

function CadastroPage() {
  const { token } = useParams();
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    if (nickname.trim().length < 3) {
      return setError('O apelido deve ter pelo menos 3 caracteres.');
    }

    try {
      setError('');
      setLoading(true);
      const userCredential = await signup(email, password);
      const user = userCredential.user;

      const profileRef = ref(rtdb, `profiles/${user.uid}`);
      await set(profileRef, {
        nickname: nickname,
      });

      if (token) {
        const inviteRef = ref(rtdb, `invites/${token}`);
        await update(inviteRef, {
          status: 'completed',
          usedBy: user.uid,
          usedAt: serverTimestamp(),
        });
      }

      navigate('/');
    } catch (err) {
      console.error(err);
      setError('Falha ao criar a conta. O e-mail já pode estar em uso.');
    }
    setLoading(false);
  }

  return (
    <Container component="main" maxWidth="xs" sx={{ mt: 8 }}>
      <Card>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography component="h1" variant="h5" align="center">
            Crie sua Conta na Bolha
          </Typography>
          
          {error && <Alert severity="error">{error}</Alert>}
          
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              margin="normal"
              required
              fullWidth
              id="nickname"
              label="Apelido"
              name="nickname"
              autoComplete="nickname"
              autoFocus
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Endereço de E-mail"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Senha (mínimo 6 caracteres)"
              type="password"
              id="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{ mt: 3, mb: 2 }}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <PersonAddIcon />}
            >
              {loading ? 'Criando conta...' : 'Cadastrar'}
            </Button>
          </Box>
        </CardContent>
        <CardActions sx={{ justifyContent: 'center', bgcolor: 'grey.100' }}>
          <Typography variant="body2">
            Já tem uma conta? <RouterLink to="/login">Faça Login</RouterLink>
          </Typography>
        </CardActions>
      </Card>
    </Container>
  );
}

export default CadastroPage;