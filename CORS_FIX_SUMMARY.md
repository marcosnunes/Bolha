# Resumo de Alterações - Fix CORS em Cloud Functions

## Problema Original

Ao tentar enviar email de verificação em produção, o navegador bloqueava a requisição com erro CORS:
```
Access to XMLHttpRequest at 'https://us-central1-bolha-app-social-media.cloudfunctions.net/sendVerificationEmail' 
from origin 'https://bolha-social.vercel.app' has been blocked by CORS policy: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

**Causa**: Cloud Functions em padrão `onCall` (Firebase SDK Callable) não expõem headers CORS adequadamente para chamadas cross-origin.

**Solução**: Converter para padrão `onRequest` (HTTP puro) com middleware CORS explícito.

---

## Arquivos Modificados

### 1. `functions/index.js` ✅
**Tipo**: Backend - Cloud Functions

**Mudanças**:
- Adicionado: `const cors = require("cors");`
- Adicionado: `const corsMiddleware = cors({ origin: true });`

**Função `sendVerificationEmail`**:
```javascript
// ANTES (onCall - sem CORS cross-origin)
exports.sendVerificationEmail = onCall({ region: "us-central1" }, async (request) => {
  const { auth } = request;
  ...
  return { success: true };
});

// DEPOIS (onRequest - com CORS)
exports.sendVerificationEmail = onRequest({ region: "us-central1" }, async (req, res) => {
  corsMiddleware(req, res, async () => {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Método não permitido" });
    }
    const authHeader = req.headers.authorization;
    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    ...
    return res.status(200).json({ success: true });
  });
});
```

**Função `verifyEmailToken`**:
- Mesma conversão de `onCall` → `onRequest`
- Parâmetros agora em query string (GET) ou body (POST)
- Respostas como HTTP status codes + JSON

---

### 2. `src/components/VerificationDialog.jsx` ✅
**Tipo**: Frontend - Component React

**Mudanças**:
```javascript
// ANTES
import { httpsCallable } from 'firebase/functions';
const sendVerificationEmail = httpsCallable(functions, 'sendVerificationEmail');
const result = await sendVerificationEmail();

// DEPOIS
import { getAuth } from 'firebase/auth';
const auth = getAuth();
const user = auth.currentUser;
const idToken = await user.getIdToken();

const response = await fetch(
  'https://us-central1-bolha-app-social-media.cloudfunctions.net/sendVerificationEmail',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${idToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  }
);
const result = await response.json();
```

**Benefícios**:
- CORS headers automaticamente inclusos no fetch
- Authorization via Bearer token no header
- Tratamento de erro em resposta HTTP

---

### 3. `src/pages/VerificacaoPage.jsx` ✅
**Tipo**: Frontend - Page React

**Mudanças**:
```javascript
// ANTES
const verifyEmailToken = httpsCallable(functions, 'verifyEmailToken');
const result = await verifyEmailToken({ uid, token });

// DEPOIS
const response = await fetch(
  `https://us-central1-bolha-app-social-media.cloudfunctions.net/verifyEmailToken?uid=${uid}&token=${token}`,
  {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  }
);
const result = await response.json();
```

**Benefícios**:
- Verificação via link de email funciona normalmente
- Sem necessidade de autenticação (token está na URL)
- CORS permite GET requests cross-origin

---

### 4. `src/contexts/AuthContext.jsx` ✅
**Tipo**: Frontend - Context API

**Mudanças**:
```javascript
// REMOVIDO
const sendVerificationEmail = async () => {
  const sendVerificationEmailFunc = httpsCallable(functions, 'sendVerificationEmail');
  ...
};

// Removido do context value
sendVerificationEmail,
```

**Motivo**: Lógica movida para `VerificationDialog.jsx` para melhor separação de concerns

---

## Por que `onRequest` é melhor para CORS

| Aspecto | onCall | onRequest |
|--------|--------|-----------|
| CORS automático | ❌ Limitado | ✅ Controlável |
| Autenticação | SDK Firebase | Headers HTTP |
| Chamada frontend | httpsCallable | fetch() |
| Preflight OPTIONS | Problema | ✅ Suportado |
| Produção cross-origin | ❌ Problemas | ✅ Funciona |

---

## Fluxo de Autenticação Atualizado

### Enviar Email de Verificação (VerificationDialog)

```
1. User clica "Enviar Email"
2. Frontend obtém ID Token: auth.currentUser.getIdToken()
3. Fetch POST para Cloud Function com header Authorization
4. Cloud Function:
   - Middleware CORS adiciona headers necessários
   - Extrai e valida ID Token
   - Gera token de verificação (32 bytes hex)
   - Armazena em /verificationTokens/{uid}
   - Envia email com link: /verificacao/{uid}/{token}
   - Retorna JSON success
5. VerificationDialog mostra confirmação
```

### Verificar Email (VerificacaoPage)

```
1. User clica link no email: /verificacao/{uid}/{token}
2. VerificacaoPage carrega params da URL
3. Fetch GET para Cloud Function com query params
4. Cloud Function:
   - Middleware CORS permite GET cross-origin
   - Busca token em /verificationTokens/{uid}
   - Valida token e expiração
   - Marca user como isVerified: true
   - Remove token antigo
   - Retorna JSON success
5. Page mostra sucesso
6. User redirecionado para home
```

---

## Instruções de Deployment

### 1. Variáveis de Ambiente

```bash
cd functions
firebase functions:config:set email.user="seu-email@gmail.com" email.password="app-password"
```

### 2. Deploy

```bash
firebase deploy --only functions
```

### 3. Testar

1. Ir em https://bolha-social.vercel.app
2. Criar conta (com invite token válido)
3. Adicionar foto de perfil
4. Configurações → "Verificar Conta"
5. Confirmar email recebido
6. Clicar link
7. Validar badge azul aparece

---

## Checklist de Validação

- [x] functions/index.js convertido para onRequest com CORS
- [x] VerificationDialog atualizado para usar fetch() + Authorization header
- [x] VerificacaoPage atualizado para usar fetch() GET
- [x] AuthContext limpo (sendVerificationEmail removido)
- [x] ESLint passou sem erros
- [x] Sem imports não utilizados (httpsCallable removido onde apropriado)
- [x] DEPLOYMENT_INSTRUCTIONS.md criado
- [x] .gitignore atualizado com novo arquivo
- [ ] Deploy realizado com variáveis de ambiente configuradas
- [ ] Teste em produção validando fluxo completo

---

## Logs Esperados (Production)

**Sucesso enviando email**:
```
Email de verificação enviado para o UID: abc123def456
POST 200 https://us-central1-bolha-app-social-media.cloudfunctions.net/sendVerificationEmail
```

**Sucesso verificando**:
```
Usuário abc123def456 verificado com sucesso
GET 200 https://us-central1-bolha-app-social-media.cloudfunctions.net/verifyEmailToken?uid=...&token=...
```

**Erro CORS (não deve mais ocorrer)**:
```
Access to XMLHttpRequest... blocked by CORS policy
```

---

## Referências Técnicas

- [Firebase Functions CORS Documentation](https://firebase.google.com/docs/functions/http-events?hl=pt-br)
- [CORS npm Package](https://www.npmjs.com/package/cors)
- [Fetch API MDN](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
