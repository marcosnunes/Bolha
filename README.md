# Bolha Social

## Visão Geral

Bolha é uma rede social privada e baseada em convites, projetada para criar ambientes sociais íntimos e controlados. O foco é a privacidade, o controle total do usuário sobre quem ele vê e por quem é visto, e a simplicidade na criação de conteúdo, livre de links e distrações externas.

Este projeto foi construído como um Progressive Web App (PWA) moderno, totalmente responsivo para funcionar em desktops e dispositivos móveis.

---

## 🚀 Funcionalidades Principais

-**Sistema de Convite Exclusivo:** Acesso à plataforma apenas através de links de convite únicos gerados por membros existentes.
-**Feed de Mídia:** Compartilhamento de posts com texto, imagens e vídeos.
-**Controle de Visibilidade ("A Mesa"):** Cada usuário pode "ocultar" outros membros para criar um feed personalizado, sem que a outra pessoa seja notificada.
-**Gerenciamento de Perfil:** Os usuários podem definir um apelido e uma foto de perfil, que pode ser alterada a qualquer momento.
-**Moderação de Conteúdo no Cliente:** Uso de TensorFlow.js para análise de texto em tempo real, bloqueando links e marcando conteúdo potencialmente sensível.
-**Privacidade:** Exclusão completa da conta e de todos os dados associados.

---

## 💻 Tecnologias Utilizadas

-**Frontend:**
    -   [React](https://react.dev/) (com Vite)
    -   [Material-UI (MUI)](https://mui.com/) para a biblioteca de componentes e design.
    -   [React Router](https://reactrouter.com/) para o roteamento de páginas.
    -   [TensorFlow.js](https://www.tensorflow.org/js) para moderação de conteúdo no lado do cliente.
-**Backend (BaaS):**
    -   [Firebase Realtime Database](https://firebase.google.com/products/realtime-database) para armazenamento de dados em tempo real.
    -   [Firebase Authentication](https://firebase.google.com/products/auth) para gerenciamento de usuários.
-**Armazenamento de Mídia:**
    -   [Cloudinary](https://cloudinary.com/) para upload, armazenamento e otimização de imagens e vídeos.
-**Deploy:**
    -   [Vercel](https://vercel.com/) para o deploy contínuo do frontend.