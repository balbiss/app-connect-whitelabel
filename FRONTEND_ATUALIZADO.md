# ✅ Frontend Atualizado para Backend API

## 🎉 Mudanças Realizadas

O frontend foi **completamente atualizado** para usar a nova **Backend API** em vez das Edge Functions do Supabase.

---

## 📝 O Que Foi Mudado

### 1. **Inserção de Recipients** (`useDisparos.ts`)

**Antes:**
```typescript
fetch(`${supabaseUrl}/functions/v1/insert-campaign-recipients`, {
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
  },
})
```

**Depois:**
```typescript
fetch(`${backendApiUrl}/api/campaigns/recipients`, {
  headers: {
    'Content-Type': 'application/json',
  },
})
```

### 2. **Execução de Campanhas** (`useDisparos.ts`)

**Antes:**
```typescript
fetch(`${supabaseUrl}/functions/v1/execute-scheduled-disparos`, {
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
  },
})
```

**Depois:**
```typescript
fetch(`${backendApiUrl}/api/campaigns/execute`, {
  headers: {
    'Content-Type': 'application/json',
  },
})
```

---

## 🔧 Configuração Necessária

### ⚠️ IMPORTANTE: Adicionar Variável de Ambiente

No **Coolify**, na aplicação do **frontend**:

1. Vá em **"Environment Variables"**
2. Adicione:
   ```
   VITE_BACKEND_API_URL=http://wc8s80c8w8gsoocwocscgck0.72.60.136.16.sslip.io/app-connect-backend-api
   ```
   *(Substitua pela URL real do seu backend no Coolify)*
3. **Salve**
4. **Redeploy** o frontend

---

## ✅ Vantagens da Nova Arquitetura

- ✅ **Sem WORKER_LIMIT**: Pode processar quantos recipients quiser
- ✅ **Mais rápido**: Backend Node.js é mais eficiente que Edge Functions
- ✅ **Sem autenticação**: Backend usa Service Role Key internamente
- ✅ **Melhor escalabilidade**: Pode processar campanhas maiores
- ✅ **Logs mais claros**: Logs centralizados no backend

---

## 📋 Checklist de Deploy

- [x] Código atualizado no repositório
- [ ] Variável `VITE_BACKEND_API_URL` adicionada no Coolify
- [ ] Frontend redeployado
- [ ] Testar criação de campanha
- [ ] Verificar inserção de recipients
- [ ] Verificar execução de campanha

---

## 🚀 Próximos Passos

1. **Adicionar variável** `VITE_BACKEND_API_URL` no Coolify
2. **Redeploy** do frontend
3. **Testar** criação de campanha
4. **Verificar** logs do backend

---

## 📞 Suporte

Se tiver problemas:
1. Verifique os logs do backend no Coolify
2. Verifique os logs do frontend no navegador (F12)
3. Confirme que a variável `VITE_BACKEND_API_URL` está correta

**Tudo pronto! Só falta adicionar a variável e fazer o redeploy!** 🎉

