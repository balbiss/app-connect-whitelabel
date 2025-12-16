# 🚀 Como Migrar para o Novo Backend

## 📋 Resumo

Criamos um **backend Node.js completo** que substitui as Edge Functions do Supabase, eliminando o problema de **WORKER_LIMIT** e dando controle total sobre recursos.

---

## ✅ O Que Foi Criado

### Estrutura do Backend

```
backend-api/
├── src/
│   ├── config/
│   │   ├── supabase.js      # Cliente Supabase
│   │   ├── redis.js         # Cliente Redis
│   │   └── whatsapp.js      # Config WhatsApp
│   ├── routes/
│   │   └── campaigns.js     # Rotas de campanhas
│   ├── services/
│   │   └── campaigns.js     # Lógica de negócio
│   ├── cron/
│   │   └── index.js         # Cron jobs
│   └── server.js            # Servidor principal
├── package.json
├── Dockerfile
└── README.md
```

### Funcionalidades Migradas

1. ✅ **`execute-scheduled-disparos`** → `/api/campaigns/execute`
2. ✅ **`insert-campaign-recipients`** → `/api/campaigns/recipients`
3. ✅ **Cron jobs** → `node-cron` (executa a cada minuto)

---

## 🚀 Próximos Passos

### 1. Deploy do Backend

**Opção A: Coolify (Recomendado)**

1. Acesse o Coolify
2. Crie nova aplicação:
   - Nome: `app-connect-backend-api`
   - Tipo: Dockerfile
   - Dockerfile: `backend-api/Dockerfile`
   - Porta: `3001`
3. Configure variáveis de ambiente (veja `.env.example`)
4. Deploy

**Opção B: Docker Compose**

```bash
cd "WHITELABEL APP CONNECT/backend-api"
docker build -t app-connect-backend .
docker run -p 3001:3001 --env-file .env app-connect-backend
```

### 2. Deploy do Cron

**Opção A: Coolify (Separado)**

1. Crie outra aplicação:
   - Nome: `app-connect-backend-cron`
   - Mesmo Dockerfile
   - Command: `npm run cron`
   - Sem porta (não expõe HTTP)

**Opção B: Mesmo Container**

Pode rodar cron no mesmo container usando `supervisord` ou `pm2`.

### 3. Atualizar Frontend

Precisa atualizar `useDisparos.ts` para usar a nova API:

```typescript
// Adicionar no início do arquivo
const BACKEND_API_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:3001';

// Substituir chamadas de Edge Functions
// Antes: `${supabaseUrl}/functions/v1/insert-campaign-recipients`
// Depois: `${BACKEND_API_URL}/api/campaigns/recipients`
```

---

## 📝 Variáveis de Ambiente

Crie `.env` no `backend-api/`:

```env
# Supabase
SUPABASE_URL=https://oxpcmdejlcmsopjbqncf.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role

# Redis
REDIS_HOST=redis-16062.crce207.sa-east-1-2.ec2.cloud.redislabs.com
REDIS_PORT=16062
REDIS_PASSWORD=bw70OK3sjdNHu4zj4RtyIHNvKaUp73xh

# WhatsApp API
WHATSAPP_API_URL=https://weeb.inoovaweb.com.br

# Middleware
MIDDLEWARE_URL=http://uc08ws4s80kgk400o44wkss8.72.60.136.16.sslip.io

# Server
PORT=3001
NODE_ENV=production

# Para cron
BACKEND_API_URL=http://localhost:3001
```

---

## 🧪 Testar

### 1. Health Check
```bash
curl http://localhost:3001/health
```

### 2. Testar API
```bash
curl http://localhost:3001/
```

### 3. Testar Campanhas
```bash
curl -X POST http://localhost:3001/api/campaigns/execute \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

## ✅ Vantagens

| Antes (Edge Functions) | Depois (Backend Node.js) |
|------------------------|--------------------------|
| ❌ WORKER_LIMIT | ✅ Sem limites |
| ❌ Timeout | ✅ Processa tudo |
| ❌ Deno | ✅ Node.js (familiar) |
| ❌ Debug difícil | ✅ Logs completos |
| ❌ Custo imprevisível | ✅ Custo fixo |

---

## 🎯 Próximas Migrações

Depois que essas funções estiverem funcionando, podemos migrar:

- `whatsapp-proxy`
- `generate-mercado-pago-pix`
- `webhook-mercado-pago`
- `syncpay-*`

**Quer que eu continue migrando mais funções?** 🚀

