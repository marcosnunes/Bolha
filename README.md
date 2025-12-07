# Bolha Social

<div align="center">
  <h3>Uma rede social privada, baseada em convites e focada em privacidade</h3>
  <p>
    <a href="#visão-geral">Visão Geral</a> •
    <a href="#funcionalidades">Funcionalidades</a> •
    <a href="#tecnologias">Tecnologias</a> •
    <a href="#começando">Começando</a> •
    <a href="#estrutura">Estrutura</a> •
    <a href="#deploy">Deploy</a>
  </p>
</div>

---

## 📖 Visão Geral

**Bolha** é uma rede social privada e baseada em convites, projetada para criar ambientes sociais íntimos e controlados. O foco é a **privacidade**, o **controle total do usuário** sobre quem ele vê e por quem é visto, e a **simplicidade na criação de conteúdo**, livre de links e distrações externas.

Este projeto foi construído como um **Progressive Web App (PWA)** moderno, totalmente responsivo para funcionar em desktops e dispositivos móveis.

### Diferenciais

- 🔐 **100% Privado**: Acesso exclusivo por convite
- 👁️ **Controle de Visibilidade**: Sistema "A Mesa" - oculte usuários silenciosamente
- 🚫 **Livre de Links**: Conteúdo focado, sem distrações externas
- 🤖 **Moderação Inteligente**: TensorFlow.js para análise de toxicidade em tempo real
- 🗑️ **Privacidade Total**: Exclusão completa de conta e todos os dados
- 💬 **Comentários Aninhados**: Sistema completo de comentários com curtidas
- ⚡ **Tempo Real**: Sincronização instantânea de posts, likes e comentários

---

## 🚀 Funcionalidades Principais

### Sistema de Convites
- Acesso à plataforma **apenas através de links de convite únicos** gerados por membros existentes
- Cada convite possui um token único e pode ser usado uma única vez
- Validação de token antes do cadastro

### Feed de Mídia
- Compartilhamento de posts com **texto, imagens e vídeos**
- **Compressão automática inteligente**:
  - Imagens: Canvas API (client-side)
  - Vídeos: FFmpeg.wasm (client-side) - comprime vídeos > 100MB automaticamente
- Otimização via Cloudinary
- Paginação eficiente (5 posts por página)
- Atualização em tempo real de novos posts

### Controle de Visibilidade ("A Mesa")
- Cada usuário pode **"ocultar" outros membros** para criar um feed personalizado
- **Bloqueio silencioso**: a outra pessoa nunca é notificada
- Gerenciamento completo na página de configurações
- Filtragem em tempo real no feed

### Sistema de Comentários
- Comentários aninhados em posts
- Curtidas em comentários
- Sincronização em tempo real
- Apenas o autor pode deletar seus próprios comentários

### Moderação de Conteúdo
- **Análise de toxicidade** via TensorFlow.js (threshold: 0.85)
- **Lista de palavras proibidas** em português
- **Bloqueio de links**: nenhum link pode ser postado
- Marcação automática de conteúdo NSFW
- Política fail-open: em caso de erro na IA, o post é permitido

### Gerenciamento de Perfil
- Definir **apelido** e **foto de perfil**
- Alteração de senha
- Foto de perfil sincronizada em todos os posts
- Atualização em tempo real

### Privacidade e Segurança
- Autenticação via Firebase Authentication
- **Exclusão completa da conta** via Cloud Function
- Remoção de perfil, posts, comentários e relações
- Ação irreversível e permanente

---

## 💻 Tecnologias Utilizadas

### Frontend
- **[React 19](https://react.dev/)** - Biblioteca UI com Vite
- **[Material-UI (MUI) 7](https://mui.com/)** - Biblioteca de componentes e design system
- **[React Router 7](https://reactrouter.com/)** - Roteamento de páginas
- **[TensorFlow.js](https://www.tensorflow.org/js)** - Moderação de conteúdo no cliente
- **[React Markdown](https://github.com/remarkjs/react-markdown)** - Renderização de markdown

### Backend (BaaS)
- **[Firebase Realtime Database](https://firebase.google.com/products/realtime-database)** - Armazenamento de dados em tempo real
- **[Firebase Authentication](https://firebase.google.com/products/auth)** - Gerenciamento de usuários
- **[Firebase Cloud Functions v2](https://firebase.google.com/products/functions)** - Função serverless para exclusão de conta

### Armazenamento de Mídia
- **[Cloudinary](https://cloudinary.com/)** - Upload, armazenamento e otimização de imagens e vídeos

### Deploy & CI/CD
- **[Vercel](https://vercel.com/)** - Deploy contínuo do frontend
- **[Firebase Hosting](https://firebase.google.com/products/hosting)** - Backend e funções (região: us-central1)

### Build & Dev Tools
- **[Vite 7](https://vitejs.dev/)** - Build tool e dev server
- **[ESLint](https://eslint.org/)** - Linting e qualidade de código
- **[Terser](https://terser.org/)** - Minificação e remoção de console.logs em produção

---

## 🏁 Começando

### Pré-requisitos

- Node.js 18+ e npm
- Conta Firebase (Realtime Database + Authentication + Functions habilitados)
- Conta Cloudinary com upload preset unsigned
- Firebase CLI instalado globalmente: `npm install -g firebase-tools`

### Instalação

1. **Clone o repositório**
```powershell
git clone https://github.com/marcosnunes/Bolha.git
cd Bolha
```

2. **Instale as dependências do frontend**
```powershell
npm install
```

3. **Instale as dependências do backend (Cloud Functions)**
```powershell
cd functions
npm install
cd ..
```

4. **Configure as variáveis de ambiente**

Crie um arquivo `.env.local` na raiz do projeto:

```env
VITE_API_KEY=sua_firebase_api_key
VITE_AUTH_DOMAIN=seu_projeto.firebaseapp.com
VITE_PROJECT_ID=seu_projeto_id
VITE_STORAGE_BUCKET=seu_projeto.appspot.com
VITE_MESSAGING_SENDER_ID=seu_sender_id
VITE_APP_ID=seu_app_id

VITE_CLOUDINARY_CLOUD_NAME=seu_cloudinary_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=seu_upload_preset
```

> **Dica**: Se estiver usando Vercel, use `vercel env pull .env.local` para baixar as variáveis automaticamente.

5. **Configure o Firebase Realtime Database**

Aplique as regras de segurança do banco de dados:

```powershell
firebase deploy --only database
```

6. **Deploy das Cloud Functions**

```powershell
cd functions
npm run deploy
```

### Desenvolvimento Local

```powershell
npm run dev
```

Acesse: http://localhost:5173

### Build de Produção

```powershell
npm run build
```

Os arquivos otimizados estarão em `dist/` (console.logs removidos automaticamente).

---

## 📁 Estrutura do Projeto

```
bolha/
├── .github/
│   └── copilot-instructions.md    # Instruções para AI coding agents
├── functions/
│   ├── index.js                   # Cloud Function: deleteUserAccount
│   └── package.json               # Dependências do backend
├── public/
│   └── favicon.ico
├── src/
│   ├── assets/                    # Imagens e recursos estáticos
│   ├── components/
│   │   ├── CommentItem.jsx        # Item individual de comentário
│   │   ├── CommentModal.jsx       # Modal de comentários
│   │   ├── ConfirmDialog.jsx      # Dialog de confirmação reutilizável
│   │   ├── CreatePostForm.jsx     # Formulário de criação de post
│   │   ├── EditProfileModal.jsx   # Modal de edição de perfil
│   │   ├── Feed.jsx               # Feed paginado com real-time
│   │   ├── HiddenUserItem.jsx     # Item de usuário oculto
│   │   ├── HiddenUsersManager.jsx # Gerenciador de usuários ocultos
│   │   ├── Post.jsx               # Card de post individual
│   │   ├── ProfileModal.jsx       # Modal de perfil de usuário
│   │   └── ProtectedRoute.jsx     # Guard de autenticação
│   ├── contexts/
│   │   └── AuthContext.jsx        # Context global de autenticação
│   ├── firebase/
│   │   └── config.js              # Configuração e exports do Firebase
│   ├── hooks/
│   │   └── useToxicityModel.jsx   # Hook para modelo TensorFlow.js
│   ├── pages/
│   │   ├── CadastroPage.jsx       # Página de registro
│   │   ├── ConvitePage.jsx        # Validação de token de convite
│   │   ├── HomePage.jsx           # Página principal com feed
│   │   ├── LoginPage.jsx          # Página de login
│   │   ├── PagamentoPage.jsx      # Página de pagamento (futura)
│   │   ├── PrivacyPolicyPage.jsx  # Política de privacidade
│   │   ├── ReportAbusePage.jsx    # Página de denúncia de abuso
│   │   └── SettingsPage.jsx       # Configurações e conta
│   ├── index.css                  # Estilos globais
│   └── main.jsx                   # Entry point + React Router
├── .env.local                     # Variáveis de ambiente (não versionado)
├── database.rules.json            # Regras de segurança do RTDB
├── firebase.json                  # Configuração do Firebase
├── index.html                     # HTML base
├── package.json                   # Dependências e scripts
├── vercel.json                    # Configuração de deploy Vercel
└── vite.config.js                 # Configuração do Vite
```

---

## 🔥 Estrutura do Banco de Dados (Firebase RTDB)

```javascript
{
  "posts": {
    "{postId}": {
      "authorId": "uid",
      "authorNickname": "string",
      "authorPhotoURL": "url",
      "textContent": "string",
      "mediaURL": "url | null",
      "mediaType": "image | video | null",
      "isNSFW": "boolean",
      "createdAt": "timestamp",
      "likes": {
        "{uid}": true
      },
      "dislikes": {
        "{uid}": true
      },
      "comments": {
        "{commentId}": {
          "authorId": "uid",
          "authorNickname": "string",
          "authorPhotoURL": "url",
          "textContent": "string",
          "createdAt": "timestamp",
          "likes": {
            "{uid}": true
          }
        }
      }
    }
  },
  "profiles": {
    "{uid}": {
      "nickname": "string",
      "photoURL": "url | null"
    }
  },
  "users": {
    "{uid}": {
      "hiddenUsers": {
        "{targetUid}": true
      }
    }
  },
  "invites": {
    "{token}": {
      "invitedBy": "uid",
      "status": "pending | completed",
      "usedBy": "uid | null",
      "usedAt": "timestamp | null"
    }
  }
}
```

### Índices Configurados

- `/posts` ordenado por `createdAt` (essencial para paginação)

---

## 🚀 Deploy

### Frontend (Vercel)

O projeto está configurado para deploy automático no Vercel:

1. Conecte o repositório ao Vercel
2. Configure as variáveis de ambiente no painel da Vercel
3. Cada push na branch `main` dispara um novo deploy

**Configuração**: `vercel.json` redireciona todas as rotas para `/index.html` (SPA)

### Backend (Firebase)

**Cloud Functions:**
```powershell
cd functions
npm run deploy
```

**Database Rules:**
```powershell
firebase deploy --only database
```

**Região**: us-central1 (definido em `src/firebase/config.js`)

---

## 🎯 Padrões e Convenções

### Real-time Sync Pattern

O projeto usa um padrão consistente para sincronização em tempo real:

1. **Carregamento inicial**: `get()` com query apropriada
2. **Novos items**: `onChildAdded` com `startAt(mountTime + 1)`
3. **Updates**: `onChildChanged`
4. **Deletions**: `onChildRemoved`

**Exemplo** (`Feed.jsx`):
```javascript
// Busca inicial
const snapshot = await get(query(postsRef, orderByChild('createdAt'), limitToLast(5)));

// Listener para novos posts
const mountTimeRef = useRef(Date.now());
onChildAdded(
  query(postsRef, orderByChild('createdAt'), startAt(mountTimeRef.current + 1)),
  (snapshot) => { /* adiciona ao estado */ }
);
```

### Server Timestamps

**SEMPRE** use `serverTimestamp()` para campos `createdAt`:

```javascript
import { serverTimestamp } from 'firebase/database';

await update(ref(rtdb, `posts/${postId}`), {
  textContent: "...",
  createdAt: serverTimestamp()
});
```

Isso evita problemas de clock skew em paginação.

### Atomic Updates

Prefira `update()` em vez de `set()` para atualizações atômicas:

```javascript
const updates = {};
updates[`/posts/${postId}/authorPhotoURL`] = newPhotoURL;
updates[`/profiles/${uid}/photoURL`] = newPhotoURL;
await update(ref(rtdb), updates);
```

---

## 🧪 Scripts Disponíveis

```powershell
# Desenvolvimento
npm run dev              # Inicia servidor de desenvolvimento (porta 5173)

# Build
npm run build           # Build de produção (minificado, sem console.logs)
npm run preview         # Preview do build de produção

# Qualidade de Código
npm run lint            # Executa ESLint

# Firebase Functions
cd functions
npm run deploy          # Deploy das Cloud Functions
npm run logs            # Stream de logs das functions
npm run serve           # Emulador local de functions
```

---

## 🔒 Segurança

### Regras do Realtime Database

As regras em `database.rules.json` garantem:

- ✅ Apenas usuários autenticados podem ler/escrever
- ✅ Usuários só podem criar posts com seu próprio `authorId`
- ✅ Usuários só podem deletar seus próprios posts
- ✅ Usuários só podem gerenciar seus próprios likes
- ✅ Cada usuário só pode modificar seus próprios dados ocultos
- ✅ Perfis só podem ser editados pelo próprio usuário

### Moderação

- Links bloqueados via regex no cliente
- Lista de palavras proibidas em português
- TensorFlow.js toxicity model (threshold: 0.85)
- Conteúdo tóxico marcado como NSFW

---

## 📝 Licença

Este projeto é privado e de propriedade de Marcos Nunes.

---

## 👨‍💻 Autor

**Marcos Nunes**
- GitHub: [@marcosnunes](https://github.com/marcosnunes)

---

## 🤖 Para AI Coding Agents

Este projeto possui documentação detalhada para agentes de IA em `.github/copilot-instructions.md`, incluindo:
- Arquitetura completa e fluxos de dados
- Padrões específicos do projeto
- Workflows de desenvolvimento
- Convenções e melhores práticas

Consulte este arquivo para entender os padrões de código, arquitetura de tempo real e decisões de design do projeto.