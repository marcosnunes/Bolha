import { useNavigate } from 'react-router-dom';
import { AppBar, Toolbar, IconButton, Typography, Container, Box, Paper } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

function PrivacyPolicyPage() {
  const navigate = useNavigate();

  return (
    <Box sx={{ flexGrow: 1, bgcolor: 'grey.100', minHeight: '100vh' }}>
      <AppBar position="sticky" sx={{ pt: { xs: 'env(safe-area-inset-top)', sm: 0 } }}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => navigate(-1)} aria-label="voltar">
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" component="div">
            Política de Privacidade
          </Typography>
        </Toolbar>
      </AppBar>
      
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Paper sx={{p: 4}}>
          <Typography variant="h4" gutterBottom>Política de Privacidade</Typography>
          <Typography variant="body1" paragraph>
            Sua privacidade é importante para nós. É política do Bolha respeitar a sua privacidade em relação a qualquer informação sua que possamos coletar em nosso aplicativo.
          </Typography>
          <Typography variant="h6" gutterBottom>1. Informações que Coletamos</Typography>
          <Typography variant="body1" paragraph>
            Coletamos as informações que você nos fornece diretamente, como quando você cria sua conta: seu apelido, endereço de e-mail e foto de perfil. Também coletamos o conteúdo que você cria, como posts, imagens e vídeos.
          </Typography>
          <Typography variant="h6" gutterBottom>2. Como Usamos as Informações</Typography>
          <Typography variant="body1" paragraph>
            Usamos as informações que coletamos para operar, manter e fornecer a você os recursos e a funcionalidade do serviço Bolha. Seu apelido e foto de perfil são usados para identificá-lo para outros usuários dentro do seu círculo social. Seu e-mail é usado para autenticação e comunicação relacionada à sua conta.
          </Typography>
          <Typography variant="h6" gutterBottom>3. Compartilhamento de Informações</Typography>
          <Typography variant="body1" paragraph>
            Não compartilhamos suas informações pessoais com empresas, organizações ou indivíduos externos, exceto para o processamento de pagamentos ou para cumprir a lei. Seu conteúdo (posts, fotos, vídeos) é visível apenas para outros membros do seu grupo que você não tenha bloqueado e que não tenham bloqueado você.
          </Typography>
          <Typography variant="h6" gutterBottom>4. Exclusão de Dados</Typography>
          <Typography variant="body1" paragraph>
            Você pode, a qualquer momento, solicitar a exclusão completa da sua conta e de todos os dados associados através da opção "Apagar Conta" disponível no menu. Este processo é irreversível.
          </Typography>
          <Typography variant="caption" display="block" mt={4}>
            Esta política é efetiva a partir de 12 de Junho de 2024.
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
}

export default PrivacyPolicyPage;
