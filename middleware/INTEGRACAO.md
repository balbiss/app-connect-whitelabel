# 🔗 Guia de Integração do Middleware

## Como Integrar com o Sistema Existente

### 1. Modificar a Edge Function `execute-scheduled-disparos`

Ao invés de enviar mensagens diretamente, a Edge Function deve chamar o middleware:

```typescript
// No arquivo: supabase/functions/execute-scheduled-disparos/index.ts

// Substituir o loop de envio por:
const MIDDLEWARE_URL = Deno.env.get('MIDDLEWARE_URL') || 'http://localhost:3000';

// Buscar recipients pendentes
const { data: recipients } = await supabase
  .from('disparo_recipients')
  .select('*')
  .eq('disparo_id', disparo.id)
  .eq('status', 'pending')
  .order('created_at');

if (!recipients || recipients.length === 0) {
  await supabase
    .from('disparos')
    .update({ status: 'completed' })
    .eq('id', disparo.id);
  continue;
}

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

### 2. Configurar Variável de Ambiente no Supabase

No Supabase Dashboard:
1. Vá em **"Project Settings"** → **"Edge Functions"**
2. Adicione a variável:
   - `MIDDLEWARE_URL`: URL do seu middleware (ex: `http://localhost:3000` ou `https://middleware.seudominio.com`)

### 3. Deploy do Middleware

#### Opção 1: Servidor Dedicado

```bash
cd middleware
npm install
npm start  # API
npm run worker  # Worker (em terminal separado)
```

#### Opção 2: Docker Compose

```bash
cd middleware
docker-compose up -d
```

#### Opção 3: Coolify / Railway / Render

1. Conecte o repositório
2. Configure as variáveis de ambiente
3. Deploy automático

### 4. Configurar Redis

O middleware precisa de um Redis. Opções:

- **Redis Cloud** (gratuito até 30MB)
- **Upstash Redis** (gratuito até 10K comandos/dia)
- **Docker local** (desenvolvimento)
- **Redis no mesmo servidor** (produção)

### 5. Monitoramento

Acesse `http://localhost:3000/api/messages/stats` para ver estatísticas da fila.

## ✅ Benefícios

1. **Não trava mais**: Processamento assíncrono
2. **Escalável**: Pode rodar múltiplos workers
3. **Resiliente**: Retry automático em caso de falha
4. **Rate Limited**: Protege contra bloqueio do WhatsApp
5. **Monitorável**: Logs e estatísticas detalhadas

## 🔧 Troubleshooting

### Middleware não está recebendo requisições

1. Verifique se o middleware está rodando
2. Verifique a URL no Supabase (`MIDDLEWARE_URL`)
3. Verifique logs do middleware

### Jobs não estão sendo processados

1. Verifique se o Worker está rodando
2. Verifique conexão com Redis
3. Verifique logs do Worker

### Mensagens não estão sendo enviadas

1. Verifique token da API Wuazap
2. Verifique logs do Worker para erros específicos
3. Verifique se a instância WhatsApp está online

