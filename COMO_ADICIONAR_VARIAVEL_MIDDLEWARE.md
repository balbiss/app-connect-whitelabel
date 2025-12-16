# 🔧 ADICIONAR VARIÁVEL MIDDLEWARE_URL NO SUPABASE

## 📋 Passo a Passo

### 1. Acessar Configurações do Supabase

1. Acesse: https://supabase.com/dashboard/project/oxpcmdejlcmsopjbqncf/settings/functions
2. Ou vá em: **Project Settings** → **Edge Functions** → **Secrets**

### 2. Adicionar Variável

1. Clique em **"Add new secret"** ou **"New Secret"**
2. Preencha:
   - **Name**: `MIDDLEWARE_URL`
   - **Value**: `http://uc08ws4s80kgk400o44wkss8.72.60.136.16.sslip.io`
3. Clique em **"Save"** ou **"Add"**

### 3. Verificar

A variável deve aparecer na lista de secrets.

---

## ✅ Pronto!

Agora a Edge Function vai usar o middleware automaticamente!

---

## 🚀 Deploy da Edge Function

Depois de adicionar a variável, você precisa fazer deploy da Edge Function atualizada:

1. Acesse: https://supabase.com/dashboard/project/oxpcmdejlcmsopjbqncf/functions
2. Clique em **"execute-scheduled-disparos"**
3. Clique em **"Deploy"** ou **"Redeploy"**
4. Aguarde o deploy completar

---

## 🔍 Verificar se Está Funcionando

1. Crie uma campanha agendada no frontend
2. Aguarde o horário agendado
3. Veja os logs do Worker - deve aparecer:
   - `🔄 Processando job X`
   - `✅ Mensagem enviada com sucesso`

---

## ⚠️ Importante

A URL do middleware está hardcoded no código como fallback, mas é melhor usar a variável de ambiente `MIDDLEWARE_URL` para facilitar mudanças futuras.

