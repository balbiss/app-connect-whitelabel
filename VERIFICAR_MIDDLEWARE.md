# 🔍 Verificar Por Que Não Está Disparando Mensagens

## ❌ Problema

As campanhas são criadas, mas nenhuma mensagem é enviada no WhatsApp e não está usando a API do cliente.

---

## 🔍 Diagnóstico Passo a Passo

### 1. Verificar se o Middleware está Rodando

**No Coolify:**
1. Procure pela aplicação do **middleware** (API)
2. Verifique se está **"Running"** (verde)
3. Se não estiver, clique em **"Start"** ou **"Redeploy"**

**Verificar logs:**
- Clique em **"Logs"** da aplicação middleware
- Deve aparecer: `🚀 Servidor rodando na porta 3000`
- Deve aparecer: `✅ Redis conectado`

---

### 2. Verificar se o Worker está Rodando

**No Coolify:**
1. Procure pela aplicação do **middleware Worker**
2. Verifique se está **"Running"** (verde)
3. Se não estiver, clique em **"Start"** ou **"Redeploy"**

**Verificar logs:**
- Clique em **"Logs"** da aplicação worker
- Deve aparecer: `✅ Worker iniciado`
- Deve aparecer: `✅ Redis conectado`
- Deve aparecer: `👂 Aguardando jobs...`

---

### 3. Verificar Variáveis de Ambiente do Backend

**No Coolify, aplicação `app-connect-backend-api`:**

Verifique se está configurado:
- `MIDDLEWARE_URL` - **DEVE SER a URL do middleware no Coolify**
  - Exemplo: `http://wc8s80c8w8gsoocwocscgck0.72.60.136.16.sslip.io` (URL do middleware)
  - **⚠️ NÃO pode ser `localhost` ou `http://middleware:3000`** (só funciona em Docker Compose)

**Como encontrar a URL do middleware:**
1. No Coolify, abra a aplicação do **middleware (API)**
2. Vá em **"Domains"** ou **"URLs"**
3. Copie a URL (exemplo: `http://wc8s80c8w8gsoocwocscgck0.72.60.136.16.sslip.io`)
4. Cole em `MIDDLEWARE_URL` no backend

---

### 4. Verificar Variáveis de Ambiente do Middleware

**No Coolify, aplicação do middleware (API e Worker):**

Verifique se está configurado:
- `WHATSAPP_API_URL` - **DEVE SER a URL da API do WhatsApp do cliente**
  - Exemplo: `https://weeb.inoovaweb.com.br` (sua API)
  - **⚠️ Esta é a API que será usada para enviar mensagens**

- `REDIS_HOST` - Host do Redis
- `REDIS_PORT` - Porta do Redis (geralmente 6379)
- `REDIS_PASSWORD` - Senha do Redis (se houver)
- `SUPABASE_URL` - URL do Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Service Role Key do Supabase

---

### 5. Verificar Logs do Backend ao Criar Campanha

**No Coolify, aplicação `app-connect-backend-api`:**

Ao criar uma campanha, você deve ver nos logs:
```
📤 Enviando X mensagens para middleware: [URL]
📥 Resposta do middleware: status 200
✅ X mensagens adicionadas na fila do middleware
```

**Se aparecer erro:**
- `❌ Erro ao enviar para middleware:` - Middleware não está acessível
- `HTTP 404` - URL do middleware está incorreta
- `HTTP 500` - Middleware está com erro

---

### 6. Verificar Logs do Middleware (API)

**No Coolify, aplicação do middleware (API):**

Ao criar uma campanha, você deve ver nos logs:
```
📥 Recebida requisição para dispatch
📦 Processando X mensagens
✅ X jobs adicionados na fila
```

**Se não aparecer nada:**
- Backend não está conseguindo acessar o middleware
- Verifique `MIDDLEWARE_URL` no backend

---

### 7. Verificar Logs do Worker

**No Coolify, aplicação do middleware Worker:**

Ao criar uma campanha, você deve ver nos logs:
```
📨 Processando job: [job-id]
📤 Enviando mensagem para [telefone] via API: [URL]
✅ Mensagem enviada com sucesso
```

**Se aparecer erro:**
- `❌ Erro ao enviar mensagem:` - Problema com a API do WhatsApp
- `Invalid API key` - Token da instância está incorreto
- `Connection refused` - API do WhatsApp não está acessível

---

## ✅ Checklist de Verificação

- [ ] Middleware (API) está rodando no Coolify
- [ ] Middleware Worker está rodando no Coolify
- [ ] `MIDDLEWARE_URL` configurado no backend (URL correta do Coolify)
- [ ] `WHATSAPP_API_URL` configurado no middleware (sua API)
- [ ] Redis configurado e acessível
- [ ] Logs do backend mostram envio para middleware
- [ ] Logs do middleware (API) mostram recebimento
- [ ] Logs do worker mostram processamento
- [ ] Logs do worker mostram envio para API do WhatsApp

---

## 🔧 Correções Comuns

### Problema 1: `MIDDLEWARE_URL` está como `localhost` ou `http://middleware:3000`

**Solução:**
1. No Coolify, encontre a URL do middleware
2. Atualize `MIDDLEWARE_URL` no backend com a URL correta
3. Faça redeploy do backend

### Problema 2: Worker não está rodando

**Solução:**
1. No Coolify, verifique se há uma aplicação separada para o Worker
2. Se não houver, crie uma nova aplicação:
   - Tipo: Dockerfile
   - Dockerfile: `middleware/Dockerfile.worker`
   - Command: `npm run worker`
   - Variáveis de ambiente: mesmas do middleware API

### Problema 3: `WHATSAPP_API_URL` não está configurado

**Solução:**
1. No Coolify, aplicação do middleware
2. Adicione variável: `WHATSAPP_API_URL=https://weeb.inoovaweb.com.br`
3. Faça redeploy

### Problema 4: Redis não está acessível

**Solução:**
1. Verifique se o Redis está rodando
2. Verifique `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
3. Teste conexão do middleware com Redis

---

## 📤 Enviar Informações para Debug

Se ainda não funcionar, envie:

1. **Logs do backend** ao criar uma campanha
2. **Logs do middleware (API)** ao criar uma campanha
3. **Logs do worker** (se houver)
4. **Variáveis de ambiente** (sem valores sensíveis):
   - `MIDDLEWARE_URL` (backend)
   - `WHATSAPP_API_URL` (middleware)
   - `REDIS_HOST` (middleware)

---

## 🎯 Próximos Passos

Após verificar tudo acima:
1. Crie uma campanha de teste
2. Observe os logs de cada componente
3. Identifique onde está falhando
4. Corrija o problema específico

