# 🔧 Erro: Invalid API Key no Cron

## ❌ Problema

O cron está dando erro:
```
Invalid API key
Double check your Supabase `anon` or `service_role` API key.
```

Isso significa que a variável `SUPABASE_SERVICE_ROLE_KEY` não está configurada corretamente no container do cron.

---

## ✅ Solução: Verificar Variáveis no Coolify

### Passo 1: Acessar Configuração

1. No Coolify, vá para a aplicação **`app-connect-backend-cron`**
2. Clique em **"Configuration"** ou **"Settings"** ou **"Environment Variables"**

### Passo 2: Verificar Variáveis

Procure por **`SUPABASE_SERVICE_ROLE_KEY`** e verifique:

**Deve estar:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94cGNtZGVqbGNtc29wamJxbmNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImiYXQiOjE3NjU4MzY5NjMsImV4cCI6MjA4MTQxMjk2M30.J6Xt-8mAdWB4rTJunEK8jPvNFD73MlL5wL9SPXx_vCU
```

**Verifique:**
- ✅ Está preenchida?
- ✅ Não tem espaços no início/fim?
- ✅ Está completa (começa com `eyJ` e termina com caracteres longos)?

### Passo 3: Se Estiver Faltando ou Errada

1. **Adicione ou corrija** a variável:
   - Name: `SUPABASE_SERVICE_ROLE_KEY`
   - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94cGNtZGVqbGNtc29wamJxbmNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImiYXQiOjE3NjU4MzY5NjMsImV4cCI6MjA4MTQxMjk2M30.J6Xt-8mAdWB4rTJunEK8jPvNFD73MlL5wL9SPXx_vCU`

2. **Salve**

3. **Redeploy** a aplicação

---

## ✅ Verificar Todas as Variáveis

Certifique-se que TODAS estas variáveis estão configuradas:

```
SUPABASE_URL=https://oxpcmdejlcmsopjbqncf.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94cGNtZGVqbGNtc29wamJxbmNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImiYXQiOjE3NjU4MzY5NjMsImV4cCI6MjA4MTQxMjk2M30.J6Xt-8mAdWB4rTJunEK8jPvNFD73MlL5wL9SPXx_vCU
REDIS_HOST=redis-16062.crce207.sa-east-1-2.ec2.cloud.redislabs.com
REDIS_PORT=16062
REDIS_PASSWORD=bw70OK3sjdNHu4zj4RtyIHNvKaUp73xh
REDIS_DB=0
WHATSAPP_API_URL=https://weeb.inoovaweb.com.br
MIDDLEWARE_URL=http://uc08ws4s80kgk400o44wkss8.72.60.136.16.sslip.io
NODE_ENV=production
```

**NÃO precisa de `BACKEND_API_URL`** (agora chama função diretamente)

---

## 🔄 Depois de Corrigir

1. **Redeploy** a aplicação
2. Verifique os logs
3. Deve aparecer: `✅ Campanhas processadas: X` (sem erros)

---

## 📝 Resumo

1. Vá em **Environment Variables** do `app-connect-backend-cron`
2. Verifique se `SUPABASE_SERVICE_ROLE_KEY` está configurada
3. Se não estiver, adicione com o valor correto
4. **Salve**
5. **Redeploy**

**Verifique as variáveis de ambiente no Coolify!** 🔧

