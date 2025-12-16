# 🚀 CRIAR WORKER - PASSO A PASSO DETALHADO

## 📍 ONDE VOCÊ ESTÁ AGORA

Você está no Coolify, vendo a aplicação `whatsapp-middleware-api` funcionando.

---

## 📋 PASSO 1: VOLTAR PARA A LISTA DE APLICAÇÕES

### Onde clicar:

1. **Olhe no topo da tela** (barra superior)
   - Procure pelo **logo do Coolify** (geralmente no canto superior esquerdo)
   - **OU** procure por **"Dashboard"** ou **"Home"** no menu
   - **OU** clique no **nome do projeto** (se aparecer no topo)

2. **Você deve ver uma lista de aplicações:**
   - `whatsapp-middleware-api` (a que você acabou de criar)
   - Outras aplicações (se houver)

---

## 📋 PASSO 2: CRIAR NOVA APLICAÇÃO

### Onde clicar:

1. **Procure por um dos seguintes botões:**
   - **"New Resource"** (geralmente no topo direito)
   - **"+"** (ícone de mais, geralmente no topo)
   - **"Add Application"** ou **"Create New"**
   - **"New"** (no menu lateral)

2. **Clique nele**

---

## 📋 PASSO 3: ESCOLHER FONTE

### O que fazer:

1. **Uma tela vai abrir perguntando a fonte**
2. **Escolha: "GitHub"** ou **"Git Repository"**
3. **Clique em "Continue"** ou **"Next"**

---

## 📋 PASSO 4: CONFIGURAR REPOSITÓRIO

### O que preencher:

1. **Repository URL:**
   ```
   https://github.com/balbiss/app-connect-whitelabel
   ```

2. **Clique em "Check repository"** (ao lado do campo)
   - Deve aparecer um check verde ✅

3. **Branch:**
   ```
   main
   ```

4. **Clique em "Continue"** ou **"Next"**

---

## 📋 PASSO 5: CONFIGURAR BUILD PACK

### O que preencher:

1. **Build Pack:**
   - No dropdown, selecione: **"Dockerfile"**

2. **Base Directory:**
   ```
   middleware/
   ```

3. **Clique em "Continue"** ou **"Next"**

---

## 📋 PASSO 6: CONFIGURAR APLICAÇÃO (TELA "General")

### O que preencher:

1. **Name:**
   ```
   whatsapp-middleware-worker
   ```

2. **Dockerfile Location** (ou "Dockerfile Path"):
   ```
   Dockerfile
   ```
   (ou `middleware/Dockerfile` se não tiver Base Directory)

3. **Ports Exposes:**
   - **DEIXE VAZIO** ou digite `0`

4. **Ports Mappings:**
   - **DEIXE VAZIO**

5. **Command** (ou "Start Command"):
   ```
   npm run worker
   ```

---

## 📋 PASSO 7: ADICIONAR VARIÁVEIS DE AMBIENTE

### Onde ir:

1. **No menu lateral esquerdo**, clique em:
   **"Environment Variables"**

2. **Clique em "Add"** ou **"+"** para cada variável

3. **Adicione estas variáveis** (uma por uma):

   ```
   REDIS_HOST = redis-16062.crce207.sa-east-1-2.ec2.cloud.redislabs.com
   REDIS_PORT = 16062
   REDIS_PASSWORD = bw70OK3sjdNHu4zj4RtyIHNvKaUp73xh
   REDIS_DB = 0
   SUPABASE_URL = https://oxpcmdejlcmsopjbqncf.supabase.co
   SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94cGNtZGVqbGNtc29wamJxbmNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTgzNjk2MywiZXhwIjoyMDgxNDEyOTYzfQ.J6Xt-8mAdWB4rTJunEK8jPvNFD73MlL5wL9SPXx_vCU
   WHATSAPP_API_URL = https://weeb.inoovaweb.com.br
   NODE_ENV = production
   QUEUE_NAME = whatsapp-messages
   MAX_CONCURRENT_JOBS = 5
   RATE_LIMIT_MAX = 10
   RATE_LIMIT_DURATION = 1000
   MAX_RETRIES = 3
   RETRY_DELAY = 5000
   ```

   **NOTA:** Não precisa adicionar `PORT` para o Worker (só para a API)

---

## 📋 PASSO 8: SALVAR E DEPLOYAR

### O que fazer:

1. **Clique em "Save"** (no topo da página)

2. **Clique em "Deploy"** ou **"Save & Deploy"**

3. **Aguarde o build** (2-5 minutos)

---

## 📋 PASSO 9: VERIFICAR SE ESTÁ FUNCIONANDO

### O que verificar:

1. **Vá em "Logs"** (no menu lateral)

2. **Deve aparecer:**
   - ✅ Redis conectado
   - 🚀 Worker iniciado
   - Aguardando jobs...

---

## ✅ PRONTO!

Agora você tem:
- ✅ API rodando (`whatsapp-middleware-api`)
- ✅ Worker rodando (`whatsapp-middleware-worker`)

---

## 💡 DICA

Se não encontrar algum botão ou campo:
- Tire uma foto da tela
- Me envie e eu te ajudo a encontrar!

