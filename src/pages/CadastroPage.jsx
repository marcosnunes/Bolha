import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useParams, Link as RouterLink } from 'react-router-dom';

// Componentes e Ícones do MUI
import { 
  Container, Box, Paper, Typography, TextField, Button, 
  CircularProgress, Alert, Avatar, Grid, Link, Dialog, DialogActions, DialogContent, DialogTitle, Divider
} from '@mui/material';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import GoogleIcon from '@mui/icons-material/Google';

function CadastroPage({ tokenOverride = null, embedded = false }) {
  const { token: routeToken } = useParams();
  const token = tokenOverride || routeToken;
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [profilePic, setProfilePic] = useState(null);
  const [profilePicPreview, setProfilePicPreview] = useState('');
  const [nicknameDialogOpen, setNicknameDialogOpen] = useState(false);
  const [googleNickname, setGoogleNickname] = useState('');
  
  const {
    signupWithProfile,
    signupWithGoogle,
    completePendingGoogleSignup,
    pendingGoogleProfile,
    authFlowError,
    getAuthErrorMessage,
    clearAuthFlowError,
    clearPendingGoogleProfile,
  } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Função para comprimir imagem
  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDimension = 1024;
          let width = img.width;
          let height = img.height;
          
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.floor((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.floor((width * maxDimension) / height);
              height = maxDimension;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Falha ao comprimir imagem'));
                return;
              }
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            },
            'image/jpeg',
            0.9
          );
        };
        
        img.onerror = () => reject(new Error('Falha ao carregar imagem'));
      };
      
      reader.onerror = () => reject(new Error('Falha ao ler arquivo'));
    });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const compressed = await compressImage(file);
        setProfilePic(compressed);
        setProfilePicPreview(URL.createObjectURL(compressed));
        
        if (compressed.size < file.size) {
          console.log(`Foto comprimida: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(compressed.size / 1024 / 1024).toFixed(2)}MB`);
        }
      } catch (err) {
        console.error('Erro ao comprimir imagem:', err);
        // Em caso de erro, usa a imagem original
        setProfilePic(file);
        setProfilePicPreview(URL.createObjectURL(file));
      }
    }
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (nickname.trim().length < 3) {
      return setError('O apelido deve ter pelo menos 3 caracteres.');
    }

    try {
      setError('');
      clearAuthFlowError();
      setLoading(true);

      await signupWithProfile({
        email,
        password,
        nickname,
        profilePictureFile: profilePic,
        inviteToken: token,
      });

      navigate('/verificacao-email');
    } catch (err) {
      console.error(err);
      setError(getAuthErrorMessage(err.code));
    }
    setLoading(false);
  }

  async function executeGoogleSignup(nicknameOverride = null) {
    setError('');
    clearAuthFlowError();
    setGoogleLoading(true);

    try {
      const result = await signupWithGoogle({ inviteToken: token, nicknameOverride });

      if (!result?.redirected) {
        navigate('/');
      }
    } catch (err) {
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/operation-not-supported-in-this-environment') {
        return;
      }

      if (err.code === 'app/nickname-required' || err.code === 'app/nickname-in-use') {
        setGoogleNickname((nicknameOverride || err.suggestedNickname || '').slice(0, 32));
        setNicknameDialogOpen(true);
        return;
      }

      setError(getAuthErrorMessage(err.code));
    } finally {
      setGoogleLoading(false);
    }
  }

  const handleGoogleSignup = () => executeGoogleSignup(null);

  useEffect(() => {
    if (!pendingGoogleProfile) return;

    const initialNickname = (pendingGoogleProfile.suggestedNickname || '').slice(0, 32);
    setGoogleNickname(initialNickname);
    setNicknameDialogOpen(true);
  }, [pendingGoogleProfile]);

  const confirmGoogleNickname = async () => {
    const chosenNickname = googleNickname.trim();
    if (chosenNickname.length < 3) {
      setError('O apelido deve ter pelo menos 3 caracteres.');
      return;
    }

    setError('');
    setNicknameDialogOpen(false);

    if (pendingGoogleProfile) {
      try {
        setGoogleLoading(true);
        await completePendingGoogleSignup({ nickname: chosenNickname });
        navigate('/');
      } catch (err) {
        if (err.code === 'app/nickname-in-use' || err.code === 'app/nickname-required') {
          setGoogleNickname((err.suggestedNickname || chosenNickname).slice(0, 32));
          setNicknameDialogOpen(true);
          return;
        }

        setError(getAuthErrorMessage(err.code));
      } finally {
        setGoogleLoading(false);
      }
      return;
    }

    await executeGoogleSignup(chosenNickname);
  };

  const content = (
    <Paper elevation={embedded ? 0 : 3} sx={{ padding: 4, width: '100%', mt: embedded ? 0 : 4, mb: embedded ? 0 : 4, borderRadius: 3 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
          <PersonAddAlt1Icon />
        </Avatar>
        <Typography component="h1" variant="h5">
          Criar Conta
        </Typography>
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1, width: '100%' }}>
          {authFlowError && <Alert severity="warning" sx={{ mt: 2, mb: 1, width: '100%' }}>{authFlowError}</Alert>}
          {error && <Alert severity="error" sx={{ mt: 2, mb: 1, width: '100%' }}>{error}</Alert>}

          <Button
            fullWidth
            variant="contained"
            onClick={handleGoogleSignup}
            disabled={loading || googleLoading}
            startIcon={googleLoading ? <CircularProgress size={18} color="inherit" /> : <GoogleIcon />}
            sx={{ mt: 1, mb: 2, bgcolor: '#DB4437', '&:hover': { bgcolor: '#C3362B' } }}
          >
            {googleLoading ? 'Conectando...' : 'Cadastrar com Google'}
          </Button>

          <Divider sx={{ my: 2 }}>ou</Divider>

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
              <Link component={RouterLink} to="/auth?mode=login" variant="body2">
                Já tem uma conta? Faça Login
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
          <Box sx={{ marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {content}
          </Box>
        </Container>
      )}

      <Dialog
        open={nicknameDialogOpen}
        onClose={() => {
          setNicknameDialogOpen(false);
          if (pendingGoogleProfile) {
            clearPendingGoogleProfile();
          }
        }}
      >
        <DialogTitle>Escolha um apelido único</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Este apelido já está em uso. Escolha outro para concluir seu cadastro com Google.
          </Typography>
          <TextField
            fullWidth
            autoFocus
            label="Apelido"
            value={googleNickname}
            onChange={(e) => setGoogleNickname(e.target.value)}
            inputProps={{ maxLength: 32 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNicknameDialogOpen(false)}>Cancelar</Button>
          <Button onClick={confirmGoogleNickname} variant="contained">Continuar</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default CadastroPage;
