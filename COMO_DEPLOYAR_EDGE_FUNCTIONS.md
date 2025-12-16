# 🚀 COMO DEPLOYAR EDGE FUNCTIONS NO SUPABASE

## 📋 PRÉ-REQUISITOS

- [ ] Supabase CLI instalado
- [ ] Projeto Supabase criado
- [ ] Credenciais do Supabase (URL, Service Role Key)
- [ ] Acesso ao terminal

---

## 🔧 INSTALAÇÃO DO SUPABASE CLI

### Windows (PowerShell):

```powershell
# Instalar via npm (se tiver Node.js)
npm install -g supabase

# Ou via Scoop
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### Linux/Mac:

```bash
# Via npm
npm install -g supabase

# Ou via Homebrew (Mac)
brew install supabase/tap/supabase
```

---

## 🔐 CONFIGURAR SUPABASE CLI

1. **Acesse o painel do Supabase:**
   - https://supabase.com/dashboard
   - Entre no projeto do cliente

2. **Obtenha as credenciais:**
   - **Project URL:** `https://oxpcmdejlcmsopjbqncf.supabase.co`
   - **Service Role Key:** (já temos)

3. **Faça login no CLI:**

```bash
# Login no Supabase
supabase login

# Isso abrirá o navegador para autenticar
```

4. **Link o projeto local ao Supabase:**

```bash
# Navegue até a pasta do backend
cd "C:\Users\inoov\Downloads\APP CONNECT DISPARO\blastwave-ai-10977-main\WHITELABEL APP CONNECT\backend-supabase"

# Link ao projeto
supabase link --project-ref oxpcmdejlcmsopjbqncf
```

Quando pedir:
- **Database Password:** `280896Ab@`
- **Project URL:** `https://oxpcmdejlcmsopjbqncf.supabase.co`

---

## 📦 DEPLOYAR TODAS AS EDGE FUNCTIONS

### Opção 1: Deploy Individual (Recomendado para testar)

```bash
# Navegue até a pasta do backend
cd "C:\Users\inoov\Downloads\APP CONNECT DISPARO\blastwave-ai-10977-main\WHITELABEL APP CONNECT\backend-supabase"

# Deploy de cada função (exemplos)
supabase functions deploy whatsapp-chatbot
supabase functions deploy whatsapp-proxy
supabase functions deploy generate-mercado-pago-pix
supabase functions deploy generate-mercado-pago-boleto
supabase functions deploy generate-asaas-pix
supabase functions deploy generate-asaas-boleto
supabase functions deploy syncpay-create-pix
supabase functions deploy syncpay-check-transaction
supabase functions deploy syncpay-auth-token
supabase functions deploy syncpay-webhook
supabase functions deploy webhook-mercado-pago
supabase functions deploy webhook-asaas
supabase functions deploy send-billings
supabase functions deploy execute-scheduled-disparos
supabase functions deploy send-push-notification
supabase functions deploy send-subscription-email
supabase functions deploy check-expired-subscriptions
supabase functions deploy delete-old-campaigns
supabase functions deploy ativar-assinatura-manual
supabase functions deploy generate-booking-payment
supabase functions deploy cakto-webhook
```

### Opção 2: Deploy em Lote (Script PowerShell)

Crie um arquivo `deploy-all-functions.ps1`:

```powershell
# Navegar para a pasta do backend
cd "C:\Users\inoov\Downloads\APP CONNECT DISPARO\blastwave-ai-10977-main\WHITELABEL APP CONNECT\backend-supabase"

# Lista de todas as funções
$functions = @(
    "whatsapp-chatbot",
    "whatsapp-proxy",
    "generate-mercado-pago-pix",
    "generate-mercado-pago-boleto",
    "generate-asaas-pix",
    "generate-asaas-boleto",
    "syncpay-create-pix",
    "syncpay-check-transaction",
    "syncpay-auth-token",
    "syncpay-webhook",
    "webhook-mercado-pago",
    "webhook-asaas",
    "send-billings",
    "execute-scheduled-disparos",
    "send-push-notification",
    "send-subscription-email",
    "check-expired-subscriptions",
    "delete-old-campaigns",
    "ativar-assinatura-manual",
    "generate-booking-payment",
    "cakto-webhook"
)

# Deploy de cada função
foreach ($func in $functions) {
    Write-Host "Deployando $func..." -ForegroundColor Yellow
    supabase functions deploy $func
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ $func deployado com sucesso!" -ForegroundColor Green
    } else {
        Write-Host "❌ Erro ao deployar $func" -ForegroundColor Red
    }
    Write-Host ""
}

Write-Host "🎉 Deploy de todas as funções concluído!" -ForegroundColor Green
```

Execute:

```powershell
.\deploy-all-functions.ps1
```

---

## 🔑 CONFIGURAR SECRETS (Variáveis de Ambiente)

Algumas Edge Functions precisam de secrets (variáveis de ambiente):

```bash
# Configurar secrets
supabase secrets set WHATSAPP_API_URL=https://weeb.inoovaweb.com.br
supabase secrets set ADMIN_EMAIL=guilhermedigitalworld@gmail.com

# Secrets para Mercado Pago (se tiver)
supabase secrets set MERCADO_PAGO_ACCESS_TOKEN=seu_token_aqui

# Secrets para Asaas (se tiver)
supabase secrets set ASAAS_API_KEY=sua_chave_aqui

# Secrets para SyncPay (se tiver)
supabase secrets set SYNCPAY_CLIENT_ID=seu_client_id
supabase secrets set SYNCPAY_CLIENT_SECRET=seu_client_secret
```

---

## ✅ VERIFICAR FUNÇÕES DEPLOYADAS

1. **No painel do Supabase:**
   - Acesse: https://supabase.com/dashboard/project/oxpcmdejlcmsopjbqncf
   - Vá em **"Edge Functions"** no menu lateral
   - Você verá todas as funções deployadas

2. **Via CLI:**

```bash
supabase functions list
```

---

## 🧪 TESTAR UMA FUNÇÃO

```bash
# Testar a função whatsapp-chatbot
supabase functions invoke whatsapp-chatbot --body '{"test": "data"}'
```

---

## 📝 FUNÇÕES PRINCIPAIS E SUAS FUNÇÕES

| Função | Descrição |
|--------|-----------|
| `whatsapp-chatbot` | Processa mensagens do chatbot |
| `whatsapp-proxy` | Proxy para API do WhatsApp |
| `generate-mercado-pago-pix` | Gera PIX via Mercado Pago |
| `generate-mercado-pago-boleto` | Gera boleto via Mercado Pago |
| `generate-asaas-pix` | Gera PIX via Asaas |
| `generate-asaas-boleto` | Gera boleto via Asaas |
| `syncpay-create-pix` | Gera PIX via SyncPay |
| `syncpay-check-transaction` | Verifica transação SyncPay |
| `syncpay-webhook` | Webhook do SyncPay |
| `webhook-mercado-pago` | Webhook do Mercado Pago |
| `webhook-asaas` | Webhook do Asaas |
| `send-billings` | Envia cobranças automáticas |
| `execute-scheduled-disparos` | Executa disparos agendados |
| `send-push-notification` | Envia notificações push |
| `send-subscription-email` | Envia emails de assinatura |
| `check-expired-subscriptions` | Verifica assinaturas expiradas |
| `delete-old-campaigns` | Deleta campanhas antigas |
| `ativar-assinatura-manual` | Ativa assinatura manualmente |
| `generate-booking-payment` | Gera pagamento de agendamento |
| `cakto-webhook` | Webhook do Cakto |

---

## 🆘 PROBLEMAS COMUNS

### Erro: "Function not found"
→ Verifique se está na pasta correta (`backend-supabase`)
→ Verifique se o link do projeto está correto

### Erro: "Authentication failed"
→ Faça login novamente: `supabase login`
→ Verifique se o projeto está linkado: `supabase link`

### Erro: "Deploy failed"
→ Verifique os logs: `supabase functions logs <nome-da-funcao>`
→ Verifique se todas as dependências estão no `package.json` da função

---

## ✅ CHECKLIST FINAL

- [ ] Supabase CLI instalado
- [ ] Login feito no CLI
- [ ] Projeto linkado
- [ ] Todas as Edge Functions deployadas
- [ ] Secrets configurados
- [ ] Funções testadas
- [ ] Verificado no painel do Supabase

---

## 🎉 PRONTO!

Após fazer o deploy de todas as Edge Functions, o sistema estará completo e funcionando!

