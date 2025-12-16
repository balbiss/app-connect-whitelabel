# 🚀 INÍCIO RÁPIDO - COOLIFY

## ⚡ Resumo em 3 Passos

### 1️⃣ Criar API (Producer)

**No Coolify:**
- **New Resource** → **GitHub** → `balbiss/app-connect-whitelabel`
- **Name**: `whatsapp-middleware-api`
- **Dockerfile Path**: `middleware/Dockerfile`
- **Build Context**: `middleware/`
- **Port**: `3000`
- **Command**: `npm start`

**Variáveis de Ambiente** (copie todas):
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

### 2️⃣ Criar Worker (Consumer)

**No Coolify:**
- **New Resource** → **GitHub** → `balbiss/app-connect-whitelabel`
- **Name**: `whatsapp-middleware-worker`
- **Dockerfile Path**: `middleware/Dockerfile`
- **Build Context**: `middleware/`
- **Port**: (deixe vazio)
- **Command**: `npm run worker`

**Variáveis de Ambiente**: (MESMAS da API acima)

### 3️⃣ Verificar

1. Aguarde deploy (2-5 min)
2. Verifique logs: deve aparecer "✅ Redis conectado"
3. Teste: `https://sua-api.coolify.app/api/messages/health`

## 📚 Guia Completo

Veja `COOLIFY_PASSO_A_PASSO.txt` para instruções detalhadas.

