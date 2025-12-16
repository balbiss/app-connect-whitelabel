# 🎯 PASSO A PASSO VISUAL - COOLIFY

## 📍 ONDE ESTÁ VOCÊ AGORA

Você está na tela de **Configuration** da aplicação existente (frontend).

**NÃO mexa nessa aplicação!** Vamos criar uma NOVA.

---

## 🆕 PASSO 1: CRIAR NOVA APLICAÇÃO

### Onde encontrar o botão:

1. **Olhe no topo da tela** (barra superior)
   - Procure por: **"New Resource"** ou **"+"** ou **"Add"**
   
2. **OU olhe no menu lateral esquerdo**
   - Pode ter um botão **"+"** ou **"New"**

3. **OU olhe na lista de aplicações** (se houver)
   - Pode ter um botão **"Create New"** ou **"New Application"**

### Depois de clicar:

1. Escolha: **"GitHub"** ou **"Git Repository"**
2. Selecione: `balbiss/app-connect-whitelabel`
3. Branch: `main`
4. Clique em **"Continue"** ou **"Next"**

---

## ⚙️ PASSO 2: CONFIGURAR (na tela que abrir)

### Na seção "General" ou "Configuration":

#### 1. **Name:**
```
whatsapp-middleware-api
```

#### 2. **Build Pack:**
- No dropdown, selecione: **"Dockerfile"**

#### 3. **Base Directory:**
```
middleware/
```

#### 4. **Dockerfile Location:**
```
Dockerfile
```
(ou `middleware/Dockerfile` se não tiver Base Directory)

#### 5. **Ports Exposes:**
```
3000
```

#### 6. **Ports Mappings:**
```
3000:3000
```

#### 7. **Command** (procure por "Start Command" ou "Command"):
```
npm start
```

---

## 🔐 PASSO 3: VARIÁVEIS DE AMBIENTE

### No menu lateral esquerdo:

1. Clique em: **"Environment Variables"**

2. Clique em **"Add"** ou **"+"** para cada variável:

```
REDIS_HOST = redis-16062.crce207.sa-east-1-2.ec2.cloud.redislabs.com
REDIS_PORT = 16062
REDIS_PASSWORD = bw70OK3sjdNHu4zj4RtyIHNvKaUp73xh
REDIS_DB = 0
SUPABASE_URL = https://oxpcmdejlcmsopjbqncf.supabase.co
SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94cGNtZGVqbGNtc29wamJxbmNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTgzNjk2MywiZXhwIjoyMDgxNDEyOTYzfQ.J6Xt-8mAdWB4rTJunEK8jPvNFD73MlL5wL9SPXx_vCU
WHATSAPP_API_URL = https://weeb.inoovaweb.com.br
NODE_ENV = production
PORT = 3000
QUEUE_NAME = whatsapp-messages
MAX_CONCURRENT_JOBS = 5
RATE_LIMIT_MAX = 10
RATE_LIMIT_DURATION = 1000
MAX_RETRIES = 3
RETRY_DELAY = 5000
```

---

## 💾 PASSO 4: SALVAR

1. Clique em **"Save"** (geralmente no topo direito)
2. Clique em **"Deploy"** ou **"Save & Deploy"**
3. Aguarde o build (2-5 minutos)

---

## 🔄 PASSO 5: CRIAR WORKER (REPITA TUDO)

Crie OUTRA aplicação nova com:

- **Name:** `whatsapp-middleware-worker`
- **Base Directory:** `middleware/`
- **Dockerfile Location:** `Dockerfile`
- **Ports Exposes:** (deixe vazio)
- **Ports Mappings:** (deixe vazio)
- **Command:** `npm run worker`
- **Variáveis:** (MESMAS da API)

---

## ❓ NÃO ENCONTROU O BOTÃO?

**Me diga:**
- O que você vê no topo da tela?
- Tem algum menu lateral?
- Tem uma lista de aplicações?

**Ou tire uma foto da tela principal do Coolify** (não da configuração, mas da tela inicial com a lista de aplicações).

