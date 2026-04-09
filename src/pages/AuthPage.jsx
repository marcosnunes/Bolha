import { Box, Button, Chip, Paper, Stack, Typography } from '@mui/material';
import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import LoginPage from './LoginPage.jsx';
import CadastroPage from './CadastroPage.jsx';

function AuthPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const mode = useMemo(() => {
    const incoming = searchParams.get('mode');
    return incoming === 'signup' ? 'signup' : 'login';
  }, [searchParams]);

  const inviteToken = searchParams.get('token');
  const buildModeUrl = (nextMode) => {
    const params = new URLSearchParams({ mode: nextMode });
    if (inviteToken) {
      params.set('token', inviteToken);
    }
    return `/auth?${params.toString()}`;
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'radial-gradient(circle at 20% 20%, rgba(25,118,210,0.20), transparent 42%), radial-gradient(circle at 80% 0%, rgba(194,24,91,0.18), transparent 48%), linear-gradient(160deg, #f8fbff 0%, #eef2f8 48%, #f6f7fb 100%)',
        px: { xs: 2, md: 3 },
        py: { xs: 3, md: 4 },
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1.1fr 1fr' },
        gap: { xs: 2, md: 3 },
        alignItems: 'stretch',
      }}
    >
      <Paper
        elevation={0}
        sx={{
          borderRadius: 5,
          p: { xs: 3, md: 5 },
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(150deg, #0f2f59 0%, #1976d2 44%, #c2185b 100%)',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            width: 260,
            height: 260,
            borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.10)',
            top: -80,
            right: -70,
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            width: 210,
            height: 210,
            borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.08)',
            bottom: -70,
            left: -30,
          }}
        />

        <Stack spacing={2} sx={{ position: 'relative', zIndex: 1 }}>
          <Chip label="Bolha Social" sx={{ width: 'fit-content', bgcolor: 'rgba(255,255,255,0.15)', color: 'white' }} />
          <Typography sx={{ fontSize: { md: 40, lg: 48 }, lineHeight: 1.05, fontWeight: 800, letterSpacing: '-0.03em' }}>
            Sua comunidade privada,
            sem links e sem ruído.
          </Typography>
          <Typography sx={{ maxWidth: 480, color: 'rgba(255,255,255,0.88)' }}>
            Entre na Bolha para compartilhar com pessoas convidadas, controlar quem você vê e manter conversas reais.
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1.2} sx={{ position: 'relative', zIndex: 1, mt: 3, flexWrap: 'wrap' }}>
          <Chip label="Convites" sx={{ bgcolor: 'rgba(255,255,255,0.18)', color: 'white' }} />
          <Chip label="Privacidade" sx={{ bgcolor: 'rgba(255,255,255,0.18)', color: 'white' }} />
          <Chip label="Sem links" sx={{ bgcolor: 'rgba(255,255,255,0.18)', color: 'white' }} />
        </Stack>
      </Paper>

      <Paper
        elevation={0}
        sx={{
          p: { xs: 1.2, md: 1.4 },
          borderRadius: 5,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'rgba(255,255,255,0.84)',
          backdropFilter: 'blur(8px)',
          alignSelf: 'center',
          width: '100%',
          maxWidth: { xs: '100%', md: 620 },
          mx: 'auto',
        }}
      >
        <Paper
          elevation={0}
          sx={{
            width: '100%',
            p: 1,
            borderRadius: 999,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            mb: 2,
          }}
        >
          <Stack direction="row" spacing={1}>
            <Button
              fullWidth
              variant={mode === 'login' ? 'contained' : 'text'}
              onClick={() => navigate(buildModeUrl('login'))}
            >
              Entrar
            </Button>
            <Button
              fullWidth
              variant={mode === 'signup' ? 'contained' : 'text'}
              onClick={() => navigate(buildModeUrl('signup'))}
            >
              Criar conta
            </Button>
          </Stack>
        </Paper>

        {inviteToken && mode === 'signup' && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1, textAlign: 'center' }}>
            Convite detectado. Continue o cadastro para entrar na Bolha.
          </Typography>
        )}

        {mode === 'signup' ? <CadastroPage embedded tokenOverride={inviteToken} /> : <LoginPage embedded />}
      </Paper>
    </Box>
  );
}

export default AuthPage;