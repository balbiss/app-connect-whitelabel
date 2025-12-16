# 🚀 DEPLOY DO MIDDLEWARE NO COOLIFY

## Passo a Passo Completo

### 1. Preparar o Repositório

1. **Certifique-se que o código está no GitHub:**
   - O repositório já está: `https://github.com/balbiss/app-connect-whitelabel`
   - Certifique-se que a pasta `middleware/` está commitada

### 2. Criar Aplicação no Coolify

1. **Acesse o Coolify:**
   - Entre no painel do Coolify

2. **Criar Nova Aplicação:**
   - Clique em **"New Resource"** ou **"New Application"**
   - Escolha **"GitHub"** como fonte
   - Selecione o repositório: `balbiss/app-connect-whitelabel`
   - Escolha a branch: `main`

3. **Configurar Build:**
   - **Build Pack**: `Dockerfile`
   - **Dockerfile Path**: `middleware/Dockerfile`
   - **Build Context**: `middleware/`
   - **Port**: `3000`

### 3. Configurar Variáveis de Ambiente

No Coolify, adicione estas variáveis de ambiente:

```
REDIS_HOST=redis-16062.crce207.sa-east-1-2.ec2.cloud.redislabs.com
REDIS_PORT=16062
REDIS_PASSWORD=bw70OK3sjdNHu4zj4RtyIHNvKaUp73xh
REDIS_DB=0

SUPABASE_URL=https://oxpcmdejlcmsopjbqncf.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94cGNtZGVqbGNtc29wamJxbmNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTgzNjk2MywiZXhwIjoyMDgxNDEyOTYzfQ.J6Xt-8mAdWB4rTJunEK8jPvNFD73MlL5wL9SPXx_vCU

WHATSAPP_API_URL=https://weeb.inoovaweb.com.br
WHATSAPP_API_TOKEN=

NODE_ENV=production
PORT=3000

QUEUE_NAME=whatsapp-messages
MAX_CONCURRENT_JOBS=5
RATE_LIMIT_MAX=10
RATE_LIMIT_DURATION=1000

MAX_RETRIES=3
RETRY_DELAY=5000
```

### 4. Criar Dois Serviços Separados

Você precisa criar **2 aplicações** no Coolify:

#### Aplicação 1: API (Producer)

- **Nome**: `whatsapp-middleware-api`
- **Dockerfile**: `middleware/Dockerfile`
- **Build Context**: `middleware/`
- **Command**: `npm start`
- **Port**: `3000`

#### Aplicação 2: Worker (Consumer)

- **Nome**: `whatsapp-middleware-worker`
- **Dockerfile**: `middleware/Dockerfile`
- **Build Context**: `middleware/`
- **Command**: `npm run worker`
- **Port**: Não precisa (não expõe porta)

### 5. Configurar Domínio (Opcional)

Se quiser um domínio para a API:

1. No Coolify, vá em **"Domains"**
2. Adicione: `middleware.seudominio.com`
3. Configure SSL automático

### 6. Deploy

1. Clique em **"Deploy"** ou **"Save & Deploy"**
2. Aguarde o build e deploy
3. Verifique os logs para confirmar que iniciou

### 7. Verificar se Está Funcionando

1. **API Health Check:**
   ```
   https://seu-dominio.com/api/messages/health
   ```
   Deve retornar: `{"success":true,"status":"healthy"}`

2. **Ver Logs:**
   - No Coolify, clique em **"Logs"**
   - Deve aparecer: `✅ Redis conectado com sucesso`
   - Deve aparecer: `🚀 Servidor rodando na porta 3000` (API)
   - Deve aparecer: `🚀 Worker iniciado` (Worker)

### 8. Configurar Edge Function do Supabase

Após o deploy, você precisa:

1. **Obter a URL do middleware:**
   - Se configurou domínio: `https://middleware.seudominio.com`
   - Ou use a URL do Coolify: `https://seu-app.coolify.app`

2. **Adicionar variável no Supabase:**
   - Acesse: https://supabase.com/dashboard/project/oxpcmdejlcmsopjbqncf/settings/functions
   - Adicione: `MIDDLEWARE_URL=https://sua-url-do-coolify`

3. **Atualizar Edge Function:**
   - Veja o arquivo `ATUALIZAR_EDGE_FUNCTION.md`

## ✅ Pronto!

Agora o middleware está rodando em produção no Coolify!

