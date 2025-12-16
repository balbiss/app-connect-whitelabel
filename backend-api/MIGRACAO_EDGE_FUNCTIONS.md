# 🔄 Guia de Migração: Edge Functions → Backend Node.js

## 📋 O Que Foi Migrado

### ✅ Funções Migradas

1. **`execute-scheduled-disparos`** 
   - ✅ Migrado para: `/api/campaigns/execute`
   - ✅ Sem WORKER_LIMIT
   - ✅ Processa quantos recipients quiser

2. **`insert-campaign-recipients`**
   - ✅ Migrado para: `/api/campaigns/recipients`
   - ✅ Batch size maior (50 em vez de 25)
   - ✅ Sem limites de recursos

### ⏳ Próximas Migrações

- `whatsapp-proxy` → `/api/whatsapp/*`
- `generate-mercado-pago-pix` → `/api/payments/mercado-pago/pix`
- `webhook-mercado-pago` → `/api/webhooks/mercado-pago`
- `syncpay-*` → `/api/payments/syncpay/*`

---

## 🚀 Como Deployar

### Opção 1: Coolify (Recomendado)

1. **Criar nova aplicação no Coolify**
   - Nome: `app-connect-backend-api`
   - Tipo: Dockerfile
   - Dockerfile Location: `backend-api/Dockerfile`

2. **Configurar variáveis de ambiente**
   ```
   SUPABASE_URL=https://seu-projeto.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=sua-chave
   REDIS_HOST=redis-host
   REDIS_PORT=6379
   MIDDLEWARE_URL=http://middleware:3000
   PORT=3001
   NODE_ENV=production
   ```

3. **Deploy**
   - Coolify vai fazer build e deploy automaticamente

### Opção 2: Docker Compose

```yaml
version: '3.8'
services:
  backend-api:
    build: ./backend-api
    ports:
      - "3001:3001"
    environment:
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - MIDDLEWARE_URL=http://middleware:3000
    depends_on:
      - redis
    restart: unless-stopped

  backend-cron:
    build: ./backend-api
    command: npm run cron
    environment:
      - BACKEND_API_URL=http://backend-api:3001
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
    depends_on:
      - backend-api
    restart: unless-stopped
```

---

## 🔄 Atualizar Frontend

### 1. Atualizar `useDisparos.ts`

**Antes:**
```typescript
const insertResponse = await fetch(`${supabaseUrl}/functions/v1/insert-campaign-recipients`, {
  // ...
});
```

**Depois:**
```typescript
const BACKEND_API_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:3001';

const insertResponse = await fetch(`${BACKEND_API_URL}/api/campaigns/recipients`, {
  // ...
});
```

### 2. Atualizar `startDisparo`

**Antes:**
```typescript
const response = await fetch(`${supabaseUrl}/functions/v1/execute-scheduled-disparos`, {
  // ...
});
```

**Depois:**
```typescript
const response = await fetch(`${BACKEND_API_URL}/api/campaigns/execute`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ disparo_id: disparoId }),
});
```

---

## ✅ Checklist de Migração

- [ ] Backend API deployado
- [ ] Variáveis de ambiente configuradas
- [ ] Cron jobs rodando
- [ ] Frontend atualizado para usar nova API
- [ ] Testar criação de campanha
- [ ] Testar execução de campanha agendada
- [ ] Remover Edge Functions antigas (opcional)

---

## 🧪 Testar

### 1. Testar Health Check
```bash
curl http://localhost:3001/health
```

### 2. Testar Inserção de Recipients
```bash
curl -X POST http://localhost:3001/api/campaigns/recipients \
  -H "Content-Type: application/json" \
  -d '{
    "disparo_id": "seu-disparo-id",
    "recipients": [...],
    "total_recipients": 10
  }'
```

### 3. Testar Execução de Campanhas
```bash
curl -X POST http://localhost:3001/api/campaigns/execute \
  -H "Content-Type: application/json" \
  -d '{"disparo_id": "seu-disparo-id"}'
```

---

## 🎯 Vantagens da Migração

✅ **Sem WORKER_LIMIT** - Processa quantos recipients quiser
✅ **Performance melhor** - Sem cold start
✅ **Debugging fácil** - Logs completos
✅ **Custo previsível** - Servidor fixo
✅ **Controle total** - Você gerencia recursos

