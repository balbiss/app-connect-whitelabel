# 🔧 ATUALIZAR EDGE FUNCTION PARA USAR MIDDLEWARE

## ⚠️ IMPORTANTE

Para o middleware funcionar, você precisa atualizar a Edge Function `execute-scheduled-disparos`.

## 📝 Passo a Passo

### 1. Acessar Edge Function no Supabase

1. Acesse: https://supabase.com/dashboard/project/oxpcmdejlcmsopjbqncf/functions
2. Clique em **"execute-scheduled-disparos"**
3. Clique em **"Edit"** ou **"View Code"**

### 2. Substituir o Código de Envio

**ENCONTRE esta parte do código (linha ~175-403):**

```typescript
// Enviar mensagens
for (let i = 0; i < recipients.length; i++) {
  const recipient = recipients[i];
  // ... código de envio ...
}
```

**SUBSTITUA por:**

```typescript
// Enviar mensagens para o middleware (fila)
const MIDDLEWARE_URL = Deno.env.get('MIDDLEWARE_URL') || 'http://localhost:3000';

// Preparar mensagens para o middleware
const messages = recipients.map(recipient => ({
  disparo_id: disparo.id,
  recipient_id: recipient.id,
  phone: recipient.phone_number,
  message: recipient.personalized_message || '',
  media_url: recipient.media_url || null,
  media_type: recipient.media_type || null,
  api_token: connection.api_instance_token,
  priority: 1,
}));

// Enviar para o middleware
try {
  const response = await fetch(`${MIDDLEWARE_URL}/api/messages/dispatch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages }),
  });

  const result = await response.json();
  
  if (result.success) {
    console.log(`✅ ${result.jobsAdded} mensagens adicionadas na fila`);
    
    // Atualizar status do disparo para in_progress
    await supabase
      .from('disparos')
      .update({
        status: 'in_progress',
        started_at: new Date().toISOString(),
      })
      .eq('id', disparo.id);
  } else {
    throw new Error(result.error || 'Erro ao adicionar mensagens na fila');
  }
} catch (error) {
  console.error('Erro ao enviar para middleware:', error);
  await supabase
    .from('disparos')
    .update({ status: 'failed' })
    .eq('id', disparo.id);
}
```

### 3. Adicionar Variável de Ambiente

1. No Supabase Dashboard, vá em **"Project Settings"** → **"Edge Functions"**
2. Clique em **"Secrets"** ou **"Environment Variables"**
3. Adicione:
   - **Name**: `MIDDLEWARE_URL`
   - **Value**: `http://localhost:3000` (desenvolvimento) ou `https://seu-middleware.com` (produção)

### 4. Deploy da Edge Function

1. Clique em **"Deploy"** ou **"Save"**
2. Aguarde o deploy completar

## ✅ Pronto!

Agora o sistema vai usar o middleware para processar mensagens, e não vai mais travar!

## 🔍 Verificar se Está Funcionando

1. Crie uma campanha no frontend
2. Veja os logs do middleware (terminal do Worker)
3. Deve aparecer: `🔄 Processando job X`

## ⚠️ Se o Middleware Não Estiver Rodando

Se você não atualizar a Edge Function, o sistema continua funcionando como antes (pode travar após 16 envios).

Para usar o middleware e não travar mais, você **DEVE** atualizar a Edge Function.

