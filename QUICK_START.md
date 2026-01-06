# Guia Rápido - Sistema de Verificação de Conta

## 📋 Status Atual

✅ **Desenvolvimento Completo**
✅ **ESLint Validado (0 erros)**
✅ **CORS Fix Implementado**
🔄 **Aguardando Deploy em Produção**

---

## 🚀 Deploy em Produção (Próximo Passo)

### 1. Configurar Variáveis de Ambiente

```bash
cd d:\Projetos_html\Bolha\Projeto\Desenvolvimento\V5\Bolha\functions
firebase functions:config:set email.user="seu-email@gmail.com" email.password="sua-app-password"
```

**Obter App Password do Gmail:**
- Habilite 2FA: https://myaccount.google.com/security
- Gere App Password: https://myaccount.google.com/apppasswords
- Use senha de 16 caracteres

### 2. Fazer Deploy

```bash
firebase deploy --only functions
```

### 3. Testar em Produção

URL: https://bolha-social.vercel.app

**Fluxo:**
1. Criar conta (ou login se já existe)
2. Home → editar perfil → adicionar foto
3. Menu ⚙️ → Configurações → "Verificar Conta"
4. Verificar email recebido em ~1 minuto
5. Clicar link → badge azul aparece no avatar

---

## 🔧 Arquivos Alterados (Summary)

| Arquivo | Mudança | Tipo |
|---------|---------|------|
| `functions/index.js` | onCall → onRequest com CORS | ✅ |
| `src/components/VerificationDialog.jsx` | httpsCallable → fetch() | ✅ |
| `src/pages/VerificacaoPage.jsx` | httpsCallable → fetch() GET | ✅ |
| `src/contexts/AuthContext.jsx` | Removido sendVerificationEmail | ✅ |
| `.gitignore` | Adicionado DEPLOYMENT_INSTRUCTIONS.md | ✅ |

---

## 📚 Documentação Criada

1. **DEPLOYMENT_INSTRUCTIONS.md** (no root)
   - Instruções passo-a-passo para deploy
   - Troubleshooting comum
   - Critérios de sucesso

2. **CORS_FIX_SUMMARY.md** (no root)
   - Explicação técnica do problema
   - Comparação onCall vs onRequest
   - Fluxo de autenticação atualizado

---

## 🔗 URLs Importantes

### Cloud Functions (após deploy)

```
GET  https://us-central1-bolha-app-social-media.cloudfunctions.net/verifyEmailToken?uid=USER_ID&token=TOKEN
POST https://us-central1-bolha-app-social-media.cloudfunctions.net/sendVerificationEmail
```

### Frontend URLs

```
Login/Cadastro      https://bolha-social.vercel.app/cadastro
Verificação Link    https://bolha-social.vercel.app/verificacao/:uid/:token
Configurações       https://bolha-social.vercel.app/configuracoes
Home                https://bolha-social.vercel.app/
```

### Firebase Console

```
Cloud Functions     https://console.firebase.google.com/functions/list?project=bolha-app-social-media
Realtime Database   https://console.firebase.google.com/database/rules?project=bolha-app-social-media
Authentication      https://console.firebase.google.com/authentication/list?project=bolha-app-social-media
```

---

## ✨ Recursos Implementados

### Component: `VerificationBadge.jsx`
- Badge azul (✓) que aparece no canto do avatar
- 3 tamanhos: small, medium, large
- Usado em 5 localizações:
  1. Feed (posts)
  2. ProfileModal
  3. CommentItem
  4. Post likes modal
  5. Comments modal

### Component: `VerificationDialog.jsx`
- Modal para iniciar verificação
- Valida se user tem foto
- Envia email com link
- Mostra confirmação

### Page: `VerificacaoPage.jsx`
- Processa link do email
- Valida token (24h expiração)
- Marca user como isVerified
- Mostra resultado (sucesso/erro)

### Security Features
- Token: 32 bytes crypto.randomBytes (hex)
- Expiração: 24 horas
- Database rules: Tokens não visíveis para cliente
- Photo lock: User não consegue remover foto após verificação

---

## 🧪 Teste Local (Opcional)

Se quiser testar antes de fazer deploy:

```bash
# Terminal 1: Emuladores
firebase emulators:start

# Terminal 2: Vite dev server
npm run dev
```

URL: http://localhost:5173

**Nota**: Emuladores precisam de Java instalado. Se não funcionar, teste direto em produção.

---

## 📊 Checklist de Validação Pós-Deploy

Depois de fazer deploy, validate:

- [ ] POST a sendVerificationEmail funciona (sem CORS erro)
- [ ] Email chega em ~1 minuto
- [ ] Link no email é válido e funciona
- [ ] Página de verificação exibe sucesso
- [ ] Badge aparece imediatamente no feed
- [ ] Badge aparece no ProfileModal
- [ ] Badge aparece em CommentItem
- [ ] Foto fica desabilitada para remover
- [ ] Logout/login mantém verification status
- [ ] Não consegue enviar email 2x (já verificado)

---

## 🚨 Troubleshooting Rápido

### CORS Error
```
Solution: Executou firebase deploy --only functions?
```

### Email não chega
```
Solution: Variáveis de ambiente configuradas?
firebase functions:config:list
```

### Badge não aparece
```
Solution: Recarregue a página (F5)
ou aguarde sincronização real-time (~2s)
```

### Token expirou
```
Solution: Normal. Token válido por 24 horas.
User pode solicitar novo email a qualquer momento.
```

---

## 💡 Notas Técnicas

- **Conversão onCall → onRequest**: Necessária para CORS em produção
- **Middleware CORS**: `cors({ origin: true })` permite qualquer origem
- **Authorization**: Bearer token no header (via `getIdToken()`)
- **Verification**: GET request (sem autenticação, token na URL)
- **Email**: Configurável via Firebase CLI ou .env

---

## 📞 Próximas Ações

1. ✅ Configurar EMAIL_USER e EMAIL_PASSWORD
2. ✅ Executar `firebase deploy --only functions`
3. ✅ Testar fluxo completo em https://bolha-social.vercel.app
4. ✅ Monitorar Cloud Function logs para erros
5. ✅ Validar badge em todos os 5 locais

---

**Última atualização**: $(date)
**Status**: Pronto para produção ✨
