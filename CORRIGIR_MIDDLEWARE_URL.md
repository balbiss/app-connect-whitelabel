# 🔧 CORRIGIR URL DO MIDDLEWARE

## ❌ Problema

Nos logs aparece erro 404:
```
ERROR - Erro ao enviar para middleware: Error: HTTP 404: Not Found
INFO - Enviando 13 mensagens para o middleware: http://uc08ws4s80kgk400044wkss8.72.60.136.16
```

A URL está **incompleta**! Falta o `.sslip.io` e o caminho `/api/messages/dispatch`.

---

## ✅ Solução

### Passo 1: Adicionar Variável no Supabase

1. Acesse: https://supabase.com/dashboard/project/oxpcmdejlcmsopjbqncf/settings/functions
2. Clique em **"Secrets"** ou **"Environment Variables"**
3. Adicione:
   - **Name**: `MIDDLEWARE_URL`
   - **Value**: `http://uc08ws4s80kgk400o44wkss8.72.60.136.16.sslip.io`
   - **IMPORTANTE**: Sem barra no final!

4. Clique em **"Save"**

### Passo 2: Fazer Redeploy da Edge Function

1. Acesse: https://supabase.com/dashboard/project/oxpcmdejlcmsopjbqncf/functions
2. Clique em **"execute-scheduled-disparos"**
3. Clique em **"Redeploy"** ou **"Deploy"**

---

## 🔍 Verificar URL Correta

A URL correta do seu middleware é:
```
http://uc08ws4s80kgk400o44wkss8.72.60.136.16.sslip.io
```

**Teste no navegador:**
```
http://uc08ws4s80kgk400o44wkss8.72.60.136.16.sslip.io/api/messages/health
```

Deve retornar: `{"success":true,"status":"healthy"}`

---

## ✅ Depois de Configurar

1. Crie uma nova campanha
2. Veja os logs da Edge Function
3. Deve aparecer: `✅ X mensagens adicionadas na fila do middleware`
4. Veja os logs do Worker - deve processar as mensagens

---

## 📋 Resumo

- ✅ Código corrigido (já está no código)
- ⚠️ **FALTA**: Adicionar variável `MIDDLEWARE_URL` no Supabase
- ⚠️ **FALTA**: Fazer redeploy da Edge Function

**Adicione a variável e faça o redeploy!** 🚀

