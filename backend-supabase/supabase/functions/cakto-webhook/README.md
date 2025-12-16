# Edge Function: cakto-webhook

## Configuração

Esta função precisa ser configurada como **PÚBLICA** para receber webhooks da Cakto sem autenticação.

### Como Configurar:

1. **Via Dashboard:**
   - Acesse Supabase Dashboard
   - Vá em **Edge Functions** > **cakto-webhook**
   - Clique em **Settings**
   - Ative **"Public Access"** ou **"Allow Anonymous Access"**
   - Salve

2. **Via CLI (se disponível):**
   ```bash
   supabase functions update cakto-webhook --public
   ```

### URL do Webhook:

```
https://svbrynrbayqubyryauid.supabase.co/functions/v1/cakto-webhook
```

### Variáveis de Ambiente:

- `SUPABASE_URL` - URL do projeto Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Service Role Key (para acessar banco de dados)
- `CAKTO_WEBHOOK_SECRET` (opcional) - Secret para verificar assinatura do webhook

### Deploy:

```bash
supabase functions deploy cakto-webhook
```




