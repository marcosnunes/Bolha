import React from 'react';
import { Container, Typography, Paper, Box } from '@mui/material';

export default function PrivacyPolicyPage() {
  return (
    <Box sx={{
      minHeight: '100vh',
      backgroundColor: '#f0f2f5',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 3,
    }}>
      <Container maxWidth="md">
        <Paper elevation={3} sx={{ padding: 4, backgroundColor: '#fff' }}>
          <Typography variant="h4" component="h1" gutterBottom sx={{ color: '#333', textAlign: 'center' }}>
            Política de Privacidade do Bolha
          </Typography>
          
          <Typography variant="body1" paragraph>
            Bem-vindo à Política de Privacidade do Bolha. Nosso compromisso é proteger sua privacidade e garantir que suas informações pessoais sejam tratadas com cuidado e respeito. Esta política descreve como coletamos, usamos e protegemos suas informações quando você usa nosso aplicativo.
          </Typography>

          <Typography variant="h6" gutterBottom>1. Informações que Coletamos</Typography>
          <Typography variant="body1" paragraph>
            Coletamos informações que você nos fornece diretamente, como quando você cria sua conta: seu apelido, endereço de e-mail e foto de perfil. Também coletamos o conteúdo que você cria, como posts, imagens e vídeos.
          </Typography>

          <Typography variant="h6" gutterBottom>2. Como Usamos as Informações</Typography>
          <Typography variant="body1" paragraph>
            Usamos as informações que coletamos para operar, manter e fornecer a você os recursos e a funcionalidade do serviço Bolha. Seu apelido e foto de perfil são usados para identificá-lo para outros usuários dentro do seu círculo social. Seu e-mail é usado para autenticação e comunicação relacionada à sua conta.
          </Typography>

          <Typography variant="h6" gutterBottom>3. Compartilhamento de Informações</Typography>
          <Typography variant="body1" paragraph>
            Não compartilhamos suas informações pessoais com empresas, organizações ou indivíduos externos, exceto para o processamento de pagamentos ou para cumprir com a lei. Seu conteúdo (posts, fotos, vídeos) é visível apenas para outros membros do seu grupo que você não tenha bloqueado e que não tenham bloqueado você.
          </t>

          <Typography variant="h6" gutterBottom>4. Exclusão de Dados</Typography>
          <Typography variant="body1" paragraph>
            Você pode, a qualquer momento, solicitar a exclusão completa da sua conta e de todos os dados associados através da opção "Apagar Conta" disponível no menu. Este processo é irreversível.
          </Typography>

          <Typography variant="caption" display="block" mt={4}>
            Esta política é efetiva a partir de 20 de Novembro de 2025.
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
}
