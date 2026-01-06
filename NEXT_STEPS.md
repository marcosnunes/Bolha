# 🎯 Próximos Passos - Completar Configuração

## ⚡ Ação Imediata Necessária

### Passo 1: Obter App Password do Gmail

1. Abra: https://myaccount.google.com/security
2. Clique em **"Verificação em duas etapas"** (se não tiver ativado)
3. Vá para: https://myaccount.google.com/apppasswords
4. Selecione **"Mail"** e **"Windows Computer"**
5. **Copie** a senha de 16 caracteres

### Passo 2: Configurar Email

Execute no terminal (dentro da pasta do projeto):

```bash
firebase functions:config:set email.user="seu-email@gmail.com" email.password="sua-app-password"
```

**Substitua:**
- `seu-email@gmail.com` → Seu email real
- `sua-app-password` → Senha copiada do passo 1

**Exemplo completo:**
```bash
firebase functions:config:set email.user="joao.silva@gmail.com" email.password="abcd efgh ijkl mnop"
```

Aguarde a mensagem:
```
✓ Functions configuration updated successfully
```

### Passo 3: Re-deploy das Funções

```bash
cd functions
firebase deploy --only functions
```

Aguarde até ver:
```
+  Deploy complete!
```

### Passo 4: Testar em Produção

1. Abra: https://bolha-social.vercel.app
2. Faça login (ou crie conta com invite token)
3. Vá para Home → Editar Perfil → **Adicionar foto** → Salvar
4. Menu ⚙️ → **Configurações** → Botão **"Verificar Conta"**
5. Clique **"Enviar Email"**
6. Verifique seu email (~1-2 minutos)
7. Clique no link
8. Badge azul deve aparecer no seu avatar! ✓

---

## 📧 Se Email Não Chegar

**Checklist:**

- [ ] Variáveis de ambiente estão configuradas?
  ```bash
  firebase functions:config:get
  ```
  Deve mostrar seu email e senha

- [ ] Deploy foi bem-sucedido?
  ```bash
  firebase functions:log
  ```
  Procure por: `"Email de verificação enviado para o UID: xxx"`

- [ ] Pasta de spam no Gmail?
  Marque o email como "Não é spam"

- [ ] Gmail bloqueou acesso?
  Verifique: https://myaccount.google.com/security
  Procure por "Atividades não seguras" e permita

---

## 🎉 Quando Funcionar

- ✅ Email chega em ~1-2 minutos
- ✅ Link abre página de verificação
- ✅ Badge azul (✓) aparece no avatar
- ✅ Foto fica bloqueada para remover

---

## 📞 Suporte Rápido

### "Cannot find module 'nodemailer'"
```bash
cd functions
npm install
```

### "CORS Error"
```bash
firebase deploy --only functions
```

### "Email não é válido"
Verifique que o email tem @ e um domínio válido

### "Token expirado"
Normal! Token válido por 24 horas. User pode solicitar novo.

---

## 🚀 Você está a **1 clique** de completar! 

Simplesmente configure o email e está pronto! 🎊
