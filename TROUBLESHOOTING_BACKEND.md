# 🔧 Troubleshooting - Backend API não Responde

## ❌ Erro: `ERR_CONNECTION_RESET`

O frontend está tentando chamar o backend, mas a conexão está sendo resetada.

---

## 🔍 Checklist de Verificação

### 1. ✅ Backend está Rodando?

**No Coolify:**
1. Abra a aplicação `app-connect-backend-api`
2. Vá em **"Logs"**
3. Procure por:
   ```
   🚀 Servidor rodando na porta 3001
   ✅ Supabase: https://...
   ✅ Redis: ...
   ```

**Se não aparecer:**
- Backend não está rodando
- Clique em **"Redeploy"** ou **"Restart"**

---

### 2. ✅ Health Check Funciona?

**Teste no navegador:**
```
http://wc8s80c8w8gsoocwocscgck0.72.60.136.16.sslip.io/app-connect-backend-api/health
```

**Deve retornar:**
```json
{
  "status": "healthy",
  "services": {
    "supabase": "connected",
    "redis": "connected"
  }
}
```

**Se não funcionar:**
- Backend não está acessível
- Verifique se está rodando no Coolify

---

### 3. ✅ Variáveis de Ambiente do Backend

**No Coolify, na aplicação `app-connect-backend-api`:**

Verifique se tem **todas** estas variáveis:

```env
PORT=3001
NODE_ENV=production
SUPABASE_URL=https://oxpcmdejlcmsopjbqncf.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
REDIS_HOST=redis-16062.crce207.sa-east-1-2.ec2.cloud.redislabs.com
REDIS_PORT=16062
REDIS_PASSWORD=bw70OK3sjdNHu4zj4RtyIHNvKaUp73xh
REDIS_DB=0
MIDDLEWARE_URL=http://uc08ws4s80kgk400o44wkss8.72.60.136.16.sslip.io
```

**Se faltar alguma:**
- Adicione e faça **Redeploy**

---

### 4. ✅ Logs do Backend ao Receber Requisição

**No Coolify:**
1. Abra `app-connect-backend-api`
2. Vá em **"Logs"**
3. Tente criar uma campanha no frontend
4. Veja se aparecem erros nos logs

**Se aparecer erro:**
- Copie o erro completo
- Pode ser problema de conexão com Supabase ou Redis

---

### 5. ✅ Testar Manualmente no Console

**Abra o Console do navegador (F12) e execute:**

```javascript
// Testar health check
fetch('http://wc8s80c8w8gsoocwocscgck0.72.60.136.16.sslip.io/app-connect-backend-api/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);

// Testar inserção de recipients
fetch('http://wc8s80c8w8gsoocwocscgck0.72.60.136.16.sslip.io/app-connect-backend-api/api/campaigns/recipients', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    disparo_id: 'test-id',
    recipients: [],
    total_recipients: 0
  })
})
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
```

**Se der erro:**
- Backend não está acessível
- Verifique se está rodando no Coolify

---

## 🚀 Soluções Rápidas

### Solução 1: Redeploy do Backend

1. No Coolify, abra `app-connect-backend-api`
2. Clique em **"Redeploy"**
3. Aguarde o build completar
4. Teste novamente

---

### Solução 2: Verificar Porta

**No Coolify, na aplicação `app-connect-backend-api`:**

1. Vá em **"Configuration"**
2. Verifique se a porta está configurada como **3001**
3. Se não estiver, configure e faça **Redeploy**

---

### Solução 3: Verificar Base Directory

**No Coolify, na aplicação `app-connect-backend-api`:**

1. Vá em **"Configuration"**
2. Verifique se **"Base Directory"** está como `backend-api`
3. Se não estiver, configure e faça **Redeploy**

---

## 📞 Informações para Debug

Se nada funcionar, envie:

1. **Logs do backend** (Coolify > app-connect-backend-api > Logs)
2. **Resultado do health check** (URL acima)
3. **Variáveis de ambiente** do backend (sem mostrar valores sensíveis)
4. **Erro completo** do console do navegador

---

## ✅ Próximos Passos

1. ✅ Verificar se backend está rodando
2. ✅ Testar health check no navegador
3. ✅ Verificar variáveis de ambiente
4. ✅ Verificar logs do backend
5. ✅ Testar manualmente no console
6. ✅ Redeploy se necessário

**Vamos resolver juntos!** 🔧

