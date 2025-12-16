# 🔄 Atualizar Frontend - Variáveis de Ambiente

## ✅ Código Atualizado

O frontend foi atualizado para usar a nova Backend API em vez das Edge Functions.

---

## 🔧 Configurar Variável no Frontend

### Opção 1: Arquivo .env (Desenvolvimento)

Crie ou edite `frontend/.env`:

```env
VITE_BACKEND_API_URL=http://localhost:3001
```

**OU** se o backend estiver no Coolify:

```env
VITE_BACKEND_API_URL=http://wc8s80c8w8gsoocwocscgck0.72.60.136.16.sslip.io/app-connect-backend-api
```

### Opção 2: Coolify (Produção)

No Coolify, na aplicação do **frontend**:

1. Vá em **"Environment Variables"**
2. Adicione:
   ```
   VITE_BACKEND_API_URL=http://wc8s80c8w8gsoocwocscgck0.72.60.136.16.sslip.io/app-connect-backend-api
   ```
3. **Salve**
4. **Redeploy** o frontend

---

## 📋 Variáveis Completas do Frontend

```env
VITE_SUPABASE_URL=https://oxpcmdejlcmsopjbqncf.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94cGNtZGVqbGNtc29wamJxbmNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MzY5NjMsImV4cCI6MjA4MTQxMjk2M30.1FBpKmn-I5oJ7OniEqCT4tmutltdzC34CJXcefFuyEg
VITE_WHATSAPP_API_URL=https://weeb.inoovaweb.com.br
VITE_BACKEND_API_URL=http://wc8s80c8w8gsoocwocscgck0.72.60.136.16.sslip.io/app-connect-backend-api
```

---

## 🔄 O Que Foi Mudado

### Antes (Edge Functions):
```typescript
fetch(`${supabaseUrl}/functions/v1/insert-campaign-recipients`, {
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
  },
})
```

### Depois (Backend API):
```typescript
fetch(`${backendApiUrl}/api/campaigns/recipients`, {
  headers: {
    'Content-Type': 'application/json',
  },
})
```

**Vantagens:**
- ✅ Sem WORKER_LIMIT
- ✅ Mais rápido
- ✅ Não precisa de autenticação (backend usa Service Role)
- ✅ Processa quantos recipients quiser

---

## 🚀 Próximos Passos

1. ✅ Adicionar `VITE_BACKEND_API_URL` no frontend
2. ✅ Redeploy do frontend
3. ✅ Testar criação de campanha
4. ✅ Verificar se recipients são inseridos
5. ✅ Verificar se campanha inicia corretamente

---

## ✅ Checklist

- [ ] Variável `VITE_BACKEND_API_URL` adicionada no frontend
- [ ] Frontend redeployado
- [ ] Testar criação de campanha
- [ ] Verificar logs do backend
- [ ] Verificar se campanha inicia

**Adicione a variável e faça o redeploy do frontend!** 🚀

