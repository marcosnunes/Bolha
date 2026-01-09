# Google Perspective API - Setup Guia SIMPLIFICADO

## ⚡ CAMINHO MAIS RÁPIDO (3 minutos)

### Passo 1️⃣: Abra este link direto
```
https://console.cloud.google.com/apis/credentials
```

### Passo 2️⃣: Faça login com sua conta Google
- Use qualquer conta Google (pessoal ou corporativa)

### Passo 3️⃣: Selecione um projeto
Se você não tiver nenhum projeto:
1. No topo da página, clique no dropdown "Select a Project"
2. Clique em **"NEW PROJECT"**
3. Nome: `Bolha-Moderation` (ou o que quiser)
4. Clique **"CREATE"**
5. Aguarde 1-2 minutos para o projeto ser criado
6. O projeto será selecionado automaticamente

### Passo 4️⃣: Criar a API Key
Na página de **Credentials**, clique no botão azul:
```
+ CREATE CREDENTIALS → API Key
```

Uma popup aparecerá com sua chave (ex: AIzaSy...)

**COPIE ESTA CHAVE** - você vai usar agora

### Passo 5️⃣: Ativar a Perspective API
Vá para este link (mude `YOUR_PROJECT_ID` pelo seu):
```
https://console.cloud.google.com/apis/library/commentanalyzer.googleapis.com
```

Ou procure manualmente:
1. No lado esquerdo, clique em **"Library"**
2. Procure por: `Perspective API`
3. Clique na primeira resultado
4. Clique no botão azul **"ENABLE"**

Aguarde 10-15 segundos para ativar

### Passo 6️⃣: Configurar no seu projeto Bolha
Abra o terminal na pasta do Bolha e execute:

```bash
firebase functions:config:set perspective.api_key="COLA_SUA_CHAVE_AQUI"
```

Exemplo real:
```bash
firebase functions:config:set perspective.api_key="AIzaSyDxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

### Passo 7️⃣: Deploy
```bash
firebase deploy --only functions
```

---

## 🔍 Se ainda tiver dúvida, siga EXATAMENTE isto:

### Para Criar/Encontrar a API Key:
1. Vá para: https://console.cloud.google.com/apis/credentials
2. Procure por uma tabela chamada **"API keys"**
3. Se vazio, clique **"+ CREATE CREDENTIALS"** → **"API Key"**
4. Se já existir chave, clique nela e copie

### Screenshots dos passos (se precisar):
```
Google Cloud Console → APIs & Services → Credentials
                     ↓
         [+ CREATE CREDENTIALS] ← clique aqui
                     ↓
           Escolha "API Key"
                     ↓
       [Sua chave aparece] ← copie isto
```

---

## ✅ Como testar se funcionou

Depois que você fizer o deploy, teste criando um post:
- **Texto OK:** "Olá, tudo bem com vocês?"
- **Texto bloqueado:** "você quer transar comigo?" (deve ser rejeitado)

Se o segundo post for bloqueado = API está funcionando ✅

---

## ❓ Problemas comuns

**Erro: "API not enabled"**
→ Você esqueceu de clicar ENABLE na Perspective API (Passo 5)

**Erro: "Invalid API Key"**
→ A chave está errada. Verifique que copiou tudo sem espaços

**Não recusou posts maliciosos**
→ Aguarde 2-3 minutos após fazer deploy. Às vezes leva um tempo

---

## 🆘 Se nada funcionar:

Execute no terminal para diagnosticar:
```bash
firebase functions:config:get
```

Você deve ver algo como:
```
{
  "perspective": {
    "api_key": "AIzaSy..."
  }
}
```

Se não aparecer, a configuração não foi salva. Repita o Passo 6.

