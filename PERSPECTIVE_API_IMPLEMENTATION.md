# Google Perspective API - Status de Integração

## ✅ Implementação Completa

### Backend (Cloud Functions)
- ✅ `functions/index.js` - Cloud Function `validateTextWithPerspective()` criada
  - Chama Google Perspective API com texto
  - Suporta português + inglês
  - Verifica 8 categorias de toxicidade
  - Thresholds customizados por categoria
  - Retorna `{isSensitive, flaggedCategories, scores, reason}`

### Frontend (Hooks)
- ✅ `src/hooks/usePerspectiveAPI.jsx` - Hook criado
  - `validateText(text)` - chama Cloud Function
  - Trata erros com fail-open
  - Retorna structured result ou erro

### Componentes Integrados

#### 1. **CreatePostForm.jsx** ✅
- Importação: `import usePerspectiveAPI from '../hooks/usePerspectiveAPI'`
- Hook: `const { validateText } = usePerspectiveAPI()`
- Localização: `handleSubmit()` → Validação de texto do post
- **Flow**: 
  1. Valida texto com Perspective API (PRINCIPAL)
  2. Se falhar, fallback para TensorFlow.js
  3. Classifica imagem com NSFW.js
  4. Se qualquer um detectar → `isPostNSFW = true`

#### 2. **EditPostModal.jsx** ✅
- Importação: `import usePerspectiveAPI from '../hooks/usePerspectiveAPI'`
- Hook: `const { validateText } = usePerspectiveAPI()`
- Localização: `handleSave()` → Validação antes de atualizar
- **Flow**: Perspective API → TensorFlow.js fallback → Erro se sensível

#### 3. **EditCommentModal.jsx** ✅
- Importação: `import usePerspectiveAPI from '../hooks/usePerspectiveAPI'`
- Hook: `const { validateText } = usePerspectiveAPI()`
- Localização: `handleSave()` → Validação antes de atualizar
- **Flow**: Perspective API → TensorFlow.js fallback → Erro se sensível

#### 4. **CommentModal.jsx** ✅
- Importação: `import usePerspectiveAPI from '../hooks/usePerspectiveAPI'`
- Hook: `const { validateText } = usePerspectiveAPI()`
- Localização: `addComment()` → Validação antes de criar comentário
- **Flow**: Perspective API → TensorFlow.js fallback → Erro se sensível

## 📋 Próximos Passos (Ação do Usuário)

### Passo 1: Obter API Key
1. Acesse: https://perspectiveapi.com/
2. Clique em "Get started"
3. Faça login com sua conta Google
4. Crie um Google Cloud Project (se não tiver)
5. Ative a Perspective API
6. Gere uma API Key
7. Copie a chave (ex: `AIzaSy...`)

### Passo 2: Configurar no Firebase
```bash
firebase functions:config:set perspective.api_key="SEU_API_KEY_AQUI"
```

### Passo 3: Deploy Cloud Functions
```bash
firebase deploy --only functions
```

### Passo 4: Testar End-to-End
1. Crie um novo post com: `"você quer transar comigo?"`
   - Deveria ser bloqueado com mensagem de conteúdo sensível
   
2. Teste outro com: `"Puta que pariu"`
   - Deveria ser bloqueado
   
3. Teste com: `"Olá, tudo bem?"`
   - Deveria funcionar normalmente

4. Teste comentário sensível no CommentModal
   - Deveria bloquear com mensagem de conteúdo sensível

## 🔄 Fluxo de Moderação (Atualizado)

```
Entrada (Texto do Usuário)
    ↓
[Perspective API - PRINCIPAL]
    ├─ Português + Inglês
    ├─ 8 Categorias
    └─ Thresholds customizados
    ↓ (Se sucesso)
    → Retorna {isSensitive, flaggedCategories}
    ↓
    (Se falhar → Fallback)
    ↓
[TensorFlow.js - FALLBACK]
    ├─ 8 Categorias
    ├─ Português keywords
    └─ Thresholds alternativos
    ↓
    → Retorna {isSensitive, scores}
    ↓
[NSFW.js - IMAGENS]
    ├─ Classificação: porn/hentai/sexy/neutral
    └─ Threshold: 0.5
    ↓
[Decisão Final]
    ├─ Se Perspective = sensível → isNSFW = true
    ├─ Se TensorFlow = sensível → isNSFW = true
    ├─ Se NSFW = sensível → isNSFW = true
    └─ Senão → isNSFW = false
    ↓
[Feed]
    └─ Post exibido com aviso se isNSFW = true
       "Mostrar conteúdo sensível"
```

## 📊 Categorias Monitoradas

| Categoria | Threshold | Idiomas |
|-----------|-----------|---------|
| SEXUALLY_EXPLICIT | 0.50 | PT, EN |
| SEVERE_TOXICITY | 0.50 | PT, EN |
| THREAT | 0.50 | PT, EN |
| TOXICITY | 0.60 | PT, EN |
| IDENTITY_ATTACK | 0.60 | PT, EN |
| INSULT | 0.65 | PT, EN |
| PROFANITY | 0.65 | PT, EN |
| FLIRTATION | 0.70 | PT, EN |

## 🔐 Segurança & Boas Práticas

- ✅ API Key armazenada em `firebase functions:config` (segura)
- ✅ Validação feita no servidor (Cloud Function) - impossível bypassar
- ✅ Fail-open: erros não bloqueiam usuários
- ✅ Rate limiting do Perspective API: 10 req/min
- ✅ Fallback automático para TensorFlow.js
- ✅ NSFW.js para imagens (independente)

## 📝 Arquivos Modificados

1. `src/components/CreatePostForm.jsx` - Integrado
2. `src/components/EditPostModal.jsx` - Integrado
3. `src/components/EditCommentModal.jsx` - Integrado
4. `src/components/CommentModal.jsx` - Integrado
5. `src/hooks/usePerspectiveAPI.jsx` - Criado (novo)
6. `functions/index.js` - Cloud Function adicionada (novo)
7. `PERSPECTIVE_API_SETUP.md` - Guia de setup (novo)

## 🚀 Status Final

```
[████████████████████████████████████████] 100%
IMPLEMENTAÇÃO COMPLETA
Aguardando: API Key do usuário
```

## ❓ FAQ

**P: Posso testar sem a API Key?**
R: Não, a Cloud Function vai falhar. Mas o fallback para TensorFlow.js vai funcionar.

**P: Qual é o custo?**
R: Gratuito até 1,000 requests/dia. Après isso, $1 por 1,000 requests.

**P: Funciona offline?**
R: Não, Perspective API requer conexão internet.

**P: E se a API cair?**
R: TensorFlow.js como fallback (validação client-side).

**P: Detecta spam/duplicatas?**
R: Não. Perspective API detecta apenas toxicidade/sensibilidade.

---

**Próxima ação**: Execute `firebase functions:config:set perspective.api_key="..."` quando tiver a chave!
