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

### Bloqueio de Links
- **Nenhum link permitido**: Sistema de validação bloqueia qualquer URL postada
- Validação simples mas efetiva
- Foco no conteúdo original, não em redirecionamentos externos

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
# Firebase Configuration
VITE_API_KEY=sua_firebase_api_key
VITE_AUTH_DOMAIN=seu_projeto.firebaseapp.com
VITE_PROJECT_ID=seu_projeto_id
VITE_STORAGE_BUCKET=seu_projeto.appspot.com
VITE_MESSAGING_SENDER_ID=seu_sender_id
VITE_APP_ID=seu_app_id

# Cloudinary (unsigned uploads)
VITE_CLOUDINARY_CLOUD_NAME=seu_cloudinary_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=seu_upload_preset_unsigned
```

**Para Cloud Functions** (`functions/.env`):
```env
EMAIL_USER=seu_email@gmail.com
EMAIL_PASSWORD=sua_app_password
```

> **Dica Vercel**: Use `vercel env pull .env.local` para sincronizar variáveis automaticamente.

5. **Configure o Firebase Realtime Database**

Aplique as regras de segurança:

```powershell
firebase deploy --only database
```

6. **Deploy das Cloud Functions** (opcional em desenvolvimento)

```powershell
cd functions
firebase deploy --only functions
```

### Desenvolvimento Local

**Com emuladores do Firebase** (recomendado):
```powershell
firebase emulators:start
```
Em outro terminal:
```powershell
npm run dev
```

Acesse:
- Frontend: http://localhost:5173
- Firebase Emulator UI: http://localhost:4000

**Sem emuladores** (conecta a Firebase produção):
```powershell
npm run dev
```

### Build de Produção

```powershell
npm run build
```

Os arquivos otimizados estarão em `dist/`:
- ✅ Minificado com Terser
- ✅ Console.logs removidos automaticamente
- ✅ Ready para Vercel ou Firebase Hosting

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
│   │   ├── ProtectedRoute.jsx     # Guard de autenticação
│   │   ├── UploadNotifications.jsx# Notificações de upload em tempo real
│   │   └── VerificationBadge.jsx  # Badge de verificação de usuário
│   ├── contexts/
│   │   ├── AuthContext.jsx        # Context global de autenticação + usuários ocultos
│   │   └── UploadContext.jsx      # Context de rastreamento de uploads
│   ├── firebase/
│   │   └── config.js              # Configuração e exports do Firebase
│   ├── hooks/
│   │   └── useVideoCompressor.jsx # Hook para compressão de vídeos via FFmpeg.wasm
│   ├── pages/
│   │   ├── CadastroPage.jsx       # Página de registro com validação de token
│   │   ├── ConvitePage.jsx        # Criação de conta via link de convite
│   │   ├── HomePage.jsx           # Página principal com feed + geração de convites
│   │   ├── LoginPage.jsx          # Página de login
│   │   ├── PagamentoPage.jsx      # Página de pagamento (Stripe integration)
│   │   ├── PrivacyPolicyPage.jsx  # Política de privacidade
│   │   ├── ReportAbusePage.jsx    # Página de denúncia de abuso de conteúdo
│   │   ├── SettingsPage.jsx       # Configurações, perfil, usuários ocultos, exclusão de conta
│   │   └── VerificacaoPage.jsx    # Página de verificação de email/2FA (opcional)
│   ├── index.css                  # Estilos globais com Tailwind via MUI
│   └── main.jsx                   # Entry point + React Router 7 setup
├── .env.local                     # Variáveis de ambiente (não versionado)
├── .eslintrc.json                 # Configuração do ESLint com React Hooks
├── backup-rules.json              # Backup das regras de RTDB
├── database.rules.json            # Regras de segurança do RTDB (JSON)
├── firebase.json                  # Configuração do Firebase Emulator e deploy
├── firestore.rules                # Regras do Firestore (não usado atualmente)
├── index.html                     # HTML base
├── package.json                   # Dependências e scripts do frontend
├── vercel.json                    # Configuração de deploy Vercel (SPA routing)
└── vite.config.js                 # Configuração do Vite (minificação + Terser)
```

---

## 🔥 Estrutura do Banco de Dados (Firebase RTDB)

```javascript
{
  "rules": {
    "posts": {
      ".read": "auth != null",
      ".indexOn": ["createdAt"], 
      "$postId": {
        ".write": "auth != null && ( (!data.exists() && newData.child('authorId').val() === auth.uid) || (data.exists() && data.child('authorId').val() === auth.uid) )",
        ".validate": "newData.hasChildren(['authorId', 'authorNickname', 'createdAt']) && (!data.exists() || newData.child('authorId').val() === data.child('authorId').val())",
        "likes": {
          "$uid": {
            ".write": "auth != null && auth.uid === $uid"
          }
        },
        "dislikes": {
          "$uid": {
            ".write": "auth != null && auth.uid === $uid"
          }
        },
        "comments": {
          ".read": "auth != null",
          "$commentId": {
            ".write": "auth != null && ( (!data.exists() && newData.child('authorId').val() === auth.uid) || (data.exists() && data.child('authorId').val() === auth.uid) )",
            ".validate": "newData.hasChildren(['authorId', 'authorNickname', 'textContent', 'createdAt'])",
            "likes": {
              "$uid": {
                ".write": "auth != null && auth.uid === $uid"
              }
            }
          }
        }
      }
    },
    "users": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null && auth.uid === $uid"
      }
    },
    "profiles": {
      ".read": "auth != null",
      "$uid": {
        ".write": "auth != null && auth.uid === $uid"
      }
    },
    "invites": {
      ".read": "true",
      ".write": "auth != null"
    },
    "verificationTokens": {
      ".read": false,
      ".write": false
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

### Real-time Subscriptions com `onValue()`

O projeto usa `onValue()` para manter listeners ativos e sincronizados:

```javascript
import { ref, onValue } from 'firebase/database';

useEffect(() => {
  const profileRef = ref(rtdb, `profiles/${userId}`);
  const unsubscribe = onValue(profileRef, (snapshot) => {
    if (snapshot.exists()) {
      setProfile(snapshot.val());
    }
  });
  
  return unsubscribe; // Cleanup essencial
}, [userId]);
```

**Importante**: Sempre fazer unsubscribe no cleanup para evitar memory leaks.

### Server Timestamps

**SEMPRE** use `serverTimestamp()` para campos `createdAt`:

```javascript
import { serverTimestamp } from 'firebase/database';

await set(ref(rtdb, `posts/${postId}`), {
  textContent: "...",
  createdAt: serverTimestamp(),
  authorId: userId
});
```

Isso garante sincronização consistente entre clientes e evita problemas de clock skew.

### Atomic Multi-Path Updates

Para atualizar dados relacionados atomicamente:

```javascript
const updates = {};
updates[`/profiles/${uid}/photoURL`] = newPhotoURL;
updates[`/posts/${postId}/authorPhotoURL`] = newPhotoURL;
await update(ref(rtdb), updates);
```

Essencial para manter sincronização entre posts e perfis.

### Context & Hooks

- **`useAuth()`**: Acesso a `currentUser`, `userProfile`, `hiddenUsers`
- **`useUpload()`**: Rastreamento de uploads com `uploads[]` array
- **`useVideoCompressor()`**: Compressão de vídeos via FFmpeg.wasm

---

## 🧪 Scripts Disponíveis

```powershell
# Desenvolvimento
npm run dev              # Inicia Vite dev server (porta 5173)

# Build
npm run build           # Build otimizado para produção
npm run preview         # Preview do build localmente (porta 4173)

# Qualidade de Código
npm run lint            # ESLint com flat config

# Firebase
firebase emulators:start             # Inicia emuladores locais (Auth, RTDB, Functions)
firebase deploy --only database      # Deploy das regras RTDB
firebase deploy --only functions     # Deploy das Cloud Functions

# Cloud Functions (em functions/)
cd functions
npm run deploy                       # Deploy via Firebase CLI
npm run logs                         # Stream de logs em tempo real
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

### Validações

- Links bloqueados via regex no cliente
- Nenhum URL é permitido em posts ou comentários

---

## 📝 Licença

Este projeto é privado e de propriedade de Marcos Nunes.

---

## 👨‍💻 Autor

**Marcos Nunes**
- GitHub: [@marcosnunes](https://github.com/marcosnunes)

---

## 🤖 Para AI Coding Agents

Este projeto possui documentação detalhada em `.github/copilot-instructions.md`, incluindo:
- ✅ Arquitetura completa e fluxos de dados
- ✅ Padrões específicos do projeto
- ✅ Workflows de desenvolvimento
- ✅ Convenções de state management
- ✅ Integração Firebase RTDB
- ✅ Validações e bloqueio de links
- ✅ Estratégia de upload e compressão de mídia

Use esta documentação para context rápido ao implementar features ou debugar issues.