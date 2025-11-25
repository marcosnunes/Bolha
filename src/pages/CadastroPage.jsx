import { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { rtdb } from '../firebase/config';
import { ref, set, update, serverTimestamp } from 'firebase/database';
import { useNavigate, useParams, Link as RouterLink } from 'react-router-dom';

// Componentes e Ícones do MUI
import { 
  Container, Box, Paper, Typography, TextField, Button, 
  CircularProgress, Alert, Avatar, Grid, Link 
} from '@mui/material';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';

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

        const response = await fetch(`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) throw new Error('Falha no upload da foto de perfil.');
        const data = await response.json();
        photoURL = data.secure_url;
      }
      
      const userCredential = await signup(email, password);
      const user = userCredential.user;

      await set(ref(rtdb, `profiles/${user.uid}`), {
        nickname: nickname,
        photoURL: photoURL,
      });

      if (token) {
        await update(ref(rtdb, `invites/${token}`), {
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
    <Container component="main" maxWidth="xs">
      <Box sx={{ marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Paper elevation={3} sx={{ padding: 4, width: '100%', mt: 4, mb: 4 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
              <PersonAddAlt1Icon />
            </Avatar>
            <Typography component="h1" variant="h5">
              Criar Conta
            </Typography>
            <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1, width: '100%' }}>
              {error && <Alert severity="error" sx={{ mt: 2, mb: 1, width: '100%'}}>{error}</Alert>}
              
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, my: 2 }}>
                <Avatar 
                  src={profilePicPreview} 
                  sx={{ width: 80, height: 80, cursor: 'pointer', bgcolor: 'grey.300' }} 
                  onClick={() => fileInputRef.current.click()}
                />
                <Button component="label" variant="text" size="small">
                  Escolher Foto de Perfil
                  <input type="file" hidden ref={fileInputRef} onChange={handleFileChange} accept="image/*" />
                </Button>
              </Box>

              <TextField margin="normal" required fullWidth id="nickname" label="Apelido" name="nickname" autoComplete="nickname" autoFocus value={nickname} onChange={(e) => setNickname(e.target.value)} />
              <TextField margin="normal" required fullWidth id="email" label="Endereço de E-mail" name="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <TextField margin="normal" required fullWidth name="password" label="Senha (mín. 6 caracteres)" type="password" id="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
              
              <Button type="submit" fullWidth variant="contained" disabled={loading} sx={{ mt: 3, mb: 2 }}>
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Cadastrar'}
              </Button>
              
              <Grid container justifyContent="flex-end">
                <Grid item>
                  <Link component={RouterLink} to="/login" variant="body2">
                    Já tem uma conta? Faça Login
                  </Link>
                </Grid>
              </Grid>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}

export default CadastroPage;
