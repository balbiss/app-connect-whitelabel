# 🔧 Adicionar Variável no Coolify - Passo a Passo

## ✅ URL Confirmada

```
VITE_BACKEND_API_URL=http://wc8s80c8w8gsoocwocscgck0.72.60.136.16.sslip.io/app-connect-backend-api
```

---

## 📋 Passo a Passo no Coolify

### 1. Acessar a Aplicação do Frontend

1. Entre no **Coolify**
2. Encontre a aplicação do **frontend** (provavelmente chamada `app-connect-frontend` ou similar)
3. **Clique** na aplicação

---

### 2. Adicionar Variável de Ambiente

1. Na página da aplicação, procure por **"Environment Variables"** ou **"Variáveis de Ambiente"**
2. **Clique** em **"Add Environment Variable"** ou **"Adicionar Variável"**
3. Preencha:
   - **Key (Chave):** `VITE_BACKEND_API_URL`
   - **Value (Valor):** `http://wc8s80c8w8gsoocwocscgck0.72.60.136.16.sslip.io/app-connect-backend-api`
4. **Salve** a variável

---

### 3. Redeploy do Frontend

1. Após adicionar a variável, procure por **"Redeploy"** ou **"Deploy"**
2. **Clique** em **"Redeploy"** ou **"Deploy Now"**
3. Aguarde o build e deploy completar

---

## ✅ Verificação

Após o redeploy, teste:

1. **Acesse** o frontend no navegador
2. **Abra** o Console do navegador (F12)
3. **Crie** uma campanha de teste
4. **Verifique** os logs no console:
   - Deve aparecer: `📦 Enviando X recipients para inserção em background via Backend API...`
   - Deve aparecer: `📤 Enviando chunk 1/X...`
   - Deve aparecer: `✅ Chunk 1/X processado: X recipients inseridos`

---

## 🐛 Se Não Funcionar

### Verificar Variável

1. Volte em **"Environment Variables"**
2. Confirme que `VITE_BACKEND_API_URL` está lá
3. Confirme que o valor está **exatamente** como acima (sem espaços extras)

### Verificar Logs do Backend

1. No Coolify, abra a aplicação `app-connect-backend-api`
2. Vá em **"Logs"**
3. Verifique se aparecem requisições quando você cria uma campanha

### Verificar Logs do Frontend

1. No navegador, abra o Console (F12)
2. Procure por erros relacionados a `VITE_BACKEND_API_URL` ou `fetch`

---

## 📝 Variáveis Completas do Frontend

Certifique-se de que o frontend tem **todas** estas variáveis:

```env
VITE_SUPABASE_URL=https://oxpcmdejlcmsopjbqncf.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94cGNtZGVqbGNtc29wamJxbmNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MzY5NjMsImV4cCI6MjA4MTQxMjk2M30.1FBpKmn-I5oJ7OniEqCT4tmutltdzC34CJXcefFuyEg
VITE_WHATSAPP_API_URL=https://weeb.inoovaweb.com.br
VITE_BACKEND_API_URL=http://wc8s80c8w8gsoocwocscgck0.72.60.136.16.sslip.io/app-connect-backend-api
```

---

## 🎉 Pronto!

Após adicionar a variável e fazer o redeploy, o frontend estará usando a nova Backend API!

**Tudo funcionando?** Teste criando uma campanha e me avise! 🚀

