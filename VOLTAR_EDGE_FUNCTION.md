# ✅ Revertido para Edge Function do Supabase

## 🔄 O Que Foi Feito

Revertemos para usar a **Edge Function do Supabase** que envia **diretamente para a API do WhatsApp**, como funcionava antes.

### ✅ Mudanças Aplicadas

1. **Edge Function `execute-scheduled-disparos`**
   - ✅ Restaurada para enviar **diretamente** para a API WUZAPI
   - ✅ Remove dependência do middleware
   - ✅ Funciona exatamente como antes

2. **Frontend `useDisparos.ts`**
   - ✅ Atualizado para chamar Edge Function diretamente
   - ✅ Usa `insert-campaign-recipients` para inserir recipients
   - ✅ Usa `execute-scheduled-disparos` para executar campanhas

---

## 🚀 Próximos Passos

### 1. Fazer Deploy da Edge Function

**No Supabase Dashboard:**
1. Acesse: https://supabase.com/dashboard/project/[SEU_PROJETO]/functions
2. Clique em **"execute-scheduled-disparos"**
3. Clique em **"Deploy"** ou **"Redeploy"**
4. Aguarde o deploy completar

### 2. Verificar Variável de Ambiente

**No Supabase Dashboard:**
1. Acesse: Settings → Edge Functions → Secrets
2. Verifique se `WHATSAPP_API_URL` está configurada:
   - Valor: `https://weeb.inoovaweb.com.br`
   - **Sem barra no final** (`/`)

### 3. Testar

1. **Crie uma campanha de teste** com 1-2 recipients
2. **Inicie a campanha**
3. **Verifique se as mensagens foram enviadas** no WhatsApp

---

## 📋 Como Funciona Agora

### Fluxo de Envio:

1. **Frontend cria campanha** → Insere `disparo` no banco
2. **Frontend chama `insert-campaign-recipients`** → Insere recipients em background
3. **Frontend chama `execute-scheduled-disparos`** → Inicia envio imediatamente
4. **Edge Function envia diretamente** para API WUZAPI:
   - `/chat/send/text` para texto
   - `/chat/send/image` para imagens
   - `/chat/send/video` para vídeos
   - `/chat/send/document` para documentos
   - `/chat/send/audio` para áudios
5. **Edge Function atualiza status** no banco (sent/failed)

### Cron Job:

- O cron job continua rodando a cada minuto
- Ele chama `execute-scheduled-disparos` automaticamente
- Processa campanhas agendadas que chegaram no horário

---

## ✅ Vantagens

- ✅ **Funciona como antes** (sem middleware)
- ✅ **Sem dependências externas** (Redis, middleware, etc.)
- ✅ **Mais simples** (menos componentes)
- ✅ **Já testado e funcionando**

---

## 🐛 Se Não Funcionar

1. **Verifique logs da Edge Function:**
   - Supabase Dashboard → Edge Functions → Logs
   - Procure por erros ou mensagens de sucesso

2. **Verifique variável `WHATSAPP_API_URL`:**
   - Deve estar configurada no Supabase
   - Valor: `https://weeb.inoovaweb.com.br`

3. **Verifique token da instância:**
   - O token deve estar correto na tabela `connections`
   - Deve ser um token válido da WUZAPI

4. **Envie os logs completos** para análise

---

## 📝 Nota

O middleware e backend API ainda existem no código, mas **não são mais usados** para envio de mensagens. A Edge Function do Supabase faz tudo diretamente, como funcionava antes.

