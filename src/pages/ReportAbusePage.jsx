import { useNavigate } from 'react-router-dom';
import { AppBar, Toolbar, IconButton, Typography, Container, Box, Paper, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

function ReportAbusePage() {
  const navigate = useNavigate();
  const contactEmail = 'marcos.lindolpho@gmail.com';

  const handleReportClick = () => {
    const mailtoLink = `mailto:${contactEmail}?subject=Denúncia de Abuso - App Bolha`;
    window.open(mailtoLink, '_blank');
  };

  return (
    <Box sx={{ flexGrow: 1, bgcolor: 'grey.100', minHeight: '100vh' }}>
      <AppBar position="sticky" sx={{ pt: { xs: 'env(safe-area-inset-top)', sm: 0 } }}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => navigate(-1)} aria-label="voltar">
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" component="div">
            Segurança e Denúncias
          </Typography>
        </Toolbar>
      </AppBar>
      
      <Container maxWidth="md" sx={{ mt: 4, pb: { xs: 12, sm: 4 }, mb: 'max(env(safe-area-inset-bottom), 0px)' }}>
        <Paper sx={{p: 4}}>
          <Typography variant="h4" gutterBottom>
            Padrões de Segurança e Denúncias de Abuso
          </Typography>
          <Typography variant="body1" paragraph>
            A Bolha tem uma política de tolerância zero contra a exploração e o abuso sexual infantil (CSAE). Todo o conteúdo é monitorado, e qualquer material que viole esta política será removido, e a conta associada será permanentemente banida. As autoridades competentes serão notificadas, conforme exigido por lei.
          </Typography>
          
          <Typography variant="h5" gutterBottom sx={{mt: 3}}>
            Como Denunciar
          </Typography>
          <Typography variant="body1" paragraph>
            Se você encontrar qualquer conteúdo que suspeite ser ilegal ou que viole nossas políticas, denuncie-o imediatamente. Sua ação é crucial para mantermos nossa comunidade segura.
          </Typography>
          
          <Typography variant="body1" paragraph>
            Para fazer uma denúncia, envie um e-mail diretamente para nosso ponto de contato de segurança com o máximo de informações possível (como o apelido do autor do post, a data e, se possível, uma descrição do conteúdo).
          </Typography>
          
          <Box sx={{ my: 3, textAlign: 'center' }}>
            <Typography variant="h6">
              Ponto de Contato para Denúncias:
            </Typography>
            <Typography variant="body1" sx={{fontWeight: 'bold', fontSize: '1.2rem'}}>
              {contactEmail}
            </Typography>
            <Button 
              variant="contained" 
              onClick={handleReportClick}
              sx={{mt: 2}}
            >
              Enviar E-mail de Denúncia
            </Button>
          </Box>
          
          <Typography variant="caption" display="block" mt={4}>
            Levamos todas as denúncias a sério e as investigaremos prontamente. Agradecemos sua colaboração em manter a Bolha um ambiente seguro.
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
}

export default ReportAbusePage;