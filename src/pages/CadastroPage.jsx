import { useState, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { rtdb } from '../firebase/config';
import { ref, set, update, serverTimestamp } from 'firebase/database';
import { useNavigate, useParams, Link as RouterLink } from 'react-router-dom';

// Componentes e Ícones do MUI
import { 
  Container, Box, Card, CardContent, CardActions, Typography, 
  TextField, Button, CircularProgress, Alert, Avatar 
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';

function CadastroPage() {
  const { token } = useParams();
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [profilePic, setProfilePic] = useState(null);
  const [profilePicPreview, setProfilePicPreview] = useState('');
  
  const { signup } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePic(file);
      setProfilePicPreview(URL.createObjectURL(file));
    }
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (nickname.trim().length < 3) {
      return setError('O apelido deve ter pelo menos 3 caracteres.');
    }

    try {
      setError('');
      setLoading(true);

      let photoURL = null;
      if (profilePic) {
        const formData = new FormData();
        formData.append('file', profilePic);
        formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);

        // Especificamos o endpoint de upload de imagem
        const response = await fetch(`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Falha no upload da foto de perfil.');
        }
        const data = await response.json();
        photoURL = data.secure_url;
      }
      
      const userCredential = await signup(email, password);
      const user = userCredential.user;

      const profileRef = ref(rtdb, `profiles/${user.uid}`);
      await set(profileRef, {
        nickname: nickname,
        photoURL: photoURL, // Pode ser null se nenhuma foto for escolhida
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
      setError('Falha ao criar a conta. Verifique os dados ou o e-mail pode já estar em uso.');
    }
    setLoading(false);
  }

  return (
    <Container component="main" maxWidth="xs" sx={{ mt: 8, mb: 8 }}>
      <Card>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography component="h1" variant="h5" align="center">
            Crie sua Conta na Bolha
          </Typography>
          
          {error && <Alert severity="error">{error}</Alert>}
          
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <Avatar 
              src={profilePicPreview} 
              sx={{ width: 100, height: 100, cursor: 'pointer', bgcolor: 'grey.300' }} 
              onClick={() => fileInputRef.current.click()}
            />
            <Button component="label" variant="text">
              Escolher Foto
              <input type="file" hidden ref={fileInputRef} onChange={handleFileChange} accept="image/*" />
            </Button>
          </Box>
          
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              margin="normal" required fullWidth id="nickname" label="Apelido" name="nickname"
              autoComplete="nickname" autoFocus value={nickname} onChange={(e) => setNickname(e.target.value)}
            />
            <TextField
              margin="normal" required fullWidth id="email" label="Endereço de E-mail" name="email"
              autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
            />
            <TextField
              margin="normal" required fullWidth name="password" label="Senha (mínimo 6 caracteres)"
              type="password" id="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)}
            />
            <Button
              type="submit" fullWidth variant="contained" disabled={loading}
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