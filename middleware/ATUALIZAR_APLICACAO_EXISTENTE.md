# 🔄 ATUALIZAR APLICAÇÃO EXISTENTE NO COOLIFY

## ✅ Você NÃO precisa deletar!

Você pode atualizar a aplicação que já está rodando e criar uma nova para o Worker.

---

## 📋 OPÇÃO 1: Atualizar a Existente para API + Criar Worker

### 1️⃣ Atualizar Aplicação Existente (será a API)

1. **Na tela de Configuration que você está vendo:**

2. **Verifique/Atualize:**
   - **Build Pack**: `Dockerfile` ✅ (já está correto)
   - **Dockerfile Path**: `middleware/Dockerfile`
   - **Build Context**: `middleware/`
   - **Port**: `3000`
   - **Command**: `npm start`

3. **Vá em "Environment Variables"** (no menu lateral):
   - Adicione TODAS estas variáveis (se não existirem):
   ```
   REDIS_HOST=redis-16062.crce207.sa-east-1-2.ec2.cloud.redislabs.com
   REDIS_PORT=16062
   REDIS_PASSWORD=bw70OK3sjdNHu4zj4RtyIHNvKaUp73xh
   REDIS_DB=0
   SUPABASE_URL=https://oxpcmdejlcmsopjbqncf.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94cGNtZGVqbGNtc29wamJxbmNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTgzNjk2MywiZXhwIjoyMDgxNDEyOTYzfQ.J6Xt-8mAdWB4rTJunEK8jPvNFD73MlL5wL9SPXx_vCU
   WHATSAPP_API_URL=https://weeb.inoovaweb.com.br
   NODE_ENV=production
   PORT=3000
   QUEUE_NAME=whatsapp-messages
   MAX_CONCURRENT_JOBS=5
   RATE_LIMIT_MAX=10
   RATE_LIMIT_DURATION=1000
   MAX_RETRIES=3
   RETRY_DELAY=5000
   ```

4. **Clique em "Save"** (no topo da página)

5. **Clique em "Redeploy"** (botão laranja no topo)

---

### 2️⃣ Criar Nova Aplicação (será o Worker)

1. **No Coolify, clique em "New Resource"** (ou botão "+" no topo)

2. **Escolha "GitHub"** como fonte

3. **Selecione**: `balbiss/app-connect-whitelabel`
   - Branch: `main`

4. **Configurações:**
   - **Name**: `whatsapp-middleware-worker` (ou qualquer nome que você quiser)
   - **Build Pack**: `Dockerfile`
   - **Dockerfile Path**: `middleware/Dockerfile`
   - **Build Context**: `middleware/`
   - **Port**: (deixe vazio ou 0)
   - **Command**: `npm run worker`

5. **Vá em "Environment Variables":**
   - Adicione as MESMAS variáveis da API (copie todas)

6. **Clique em "Save & Deploy"**

---

## 📋 OPÇÃO 2: Renomear e Duplicar

Se preferir, você pode:

1. **Renomear a atual** para `whatsapp-middleware-api`
2. **Duplicar** ela (se o Coolify tiver essa opção)
3. **Renomear a duplicada** para `whatsapp-middleware-worker`
4. **Atualizar o Command** da duplicada para `npm run worker`

---

## ✅ Depois de Atualizar

1. **Aguarde o deploy** (2-5 minutos)

2. **Verifique os Logs:**
   - API: deve aparecer "✅ Redis conectado" e "🚀 Servidor rodando"
   - Worker: deve aparecer "✅ Redis conectado" e "🚀 Worker iniciado"

3. **Teste a API:**
   - Acesse: `http://connect.visitaia.com.br/api/messages/health`
   - Ou: `https://sua-url-do-coolify/api/messages/health`
   - Deve retornar: `{"success":true,"status":"healthy"}`

---

## 💡 Dica

Se a aplicação atual já está funcionando, você só precisa:
1. Adicionar as variáveis de ambiente
2. Verificar se o Command está como `npm start`
3. Fazer Redeploy
4. Criar uma nova aplicação para o Worker

**Não precisa deletar nada!** 🎉

