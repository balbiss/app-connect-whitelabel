# 🔧 Corrigir ERR_CONNECTION_RESET

## ❌ Problema

O frontend está tentando chamar o Backend API, mas está dando erro:
```
ERR_CONNECTION_RESET
Failed to fetch
```

---

## 🔍 Possíveis Causas

1. **Backend não está rodando** no Coolify
2. **Backend está crashando** ao receber requisições
3. **URL incorreta** ou prefixo do Coolify
4. **Problema de rede** entre frontend e backend

---

## ✅ Soluções

### 1. Verificar se Backend está Rodando

No Coolify:
1. Abra a aplicação `app-connect-backend-api`
2. Vá em **"Logs"**
3. Verifique se aparecem logs como:
   ```
   🚀 Servidor rodando na porta 3001
   ✅ Supabase: https://...
   ✅ Redis: ...
   ```

**Se não aparecer nada:**
- O backend não está rodando
- Clique em **"Redeploy"** ou **"Restart"**

---

### 2. Verificar Health Check

Teste se o backend está respondendo:

1. Abra o navegador
2. Acesse:
   ```
   http://wc8s80c8w8gsoocwocscgck0.72.60.136.16.sslip.io/app-connect-backend-api/health
   ```
3. Deve retornar JSON:
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

### 3. Verificar Variáveis de Ambiente do Backend

No Coolify, na aplicação `app-connect-backend-api`:

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
```

**Se faltar alguma:**
- Adicione e faça **Redeploy**

---

### 4. Verificar Logs do Backend ao Receber Requisição

No Coolify:
1. Abra `app-connect-backend-api`
2. Vá em **"Logs"**
3. Tente criar uma campanha no frontend
4. Veja se aparecem erros nos logs

**Se aparecer erro:**
- Copie o erro e me envie
- Pode ser problema de conexão com Supabase ou Redis

---

### 5. Verificar URL no Frontend

No Coolify, na aplicação do **frontend**:

Confirme que a variável está **exatamente** assim:
```
VITE_BACKEND_API_URL=http://wc8s80c8w8gsoocwocscgck0.72.60.136.16.sslip.io/app-connect-backend-api
```

**Sem barra no final!**

---

### 6. Testar Manualmente

Abra o Console do navegador (F12) e execute:

```javascript
fetch('http://wc8s80c8w8gsoocwocscgck0.72.60.136.16.sslip.io/app-connect-backend-api/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
```

**Se der erro:**
- Backend não está acessível
- Verifique se está rodando no Coolify

---

## 🚀 Próximos Passos

1. ✅ Verificar se backend está rodando
2. ✅ Testar health check no navegador
3. ✅ Verificar variáveis de ambiente
4. ✅ Verificar logs do backend
5. ✅ Testar manualmente no console

---

## 📞 Se Nada Funcionar

Envie:
1. **Logs do backend** (Coolify > app-connect-backend-api > Logs)
2. **Resultado do health check** (URL acima)
3. **Variáveis de ambiente** do backend (sem mostrar valores sensíveis)

**Vamos resolver juntos!** 🔧

