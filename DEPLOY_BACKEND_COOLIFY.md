# 🚀 Deploy do Backend no Coolify - Passo a Passo

## 📋 Pré-requisitos

- ✅ Acesso ao Coolify
- ✅ Repositório no GitHub (já está: `balbiss/app-connect-whitelabel`)
- ✅ Credenciais do Supabase
- ✅ Credenciais do Redis

---

## 🎯 PASSO 1: Acessar Coolify

1. Abra seu navegador
2. Acesse o painel do Coolify (seu domínio ou IP)
3. Faça login

---

## 🎯 PASSO 2: Criar Nova Aplicação

### 2.1. Clicar em "New Resource"

- No menu lateral esquerdo, procure por **"New Resource"** ou **"+"** ou **"Add"**
- Ou clique no botão **"New"** no canto superior direito

### 2.2. Selecionar Tipo

- Escolha **"Application"** ou **"Docker"**
- (Não escolha "Service" ou "Database")

---

## 🎯 PASSO 3: Configurar Aplicação

### 3.1. Informações Básicas

**Name:**
```
app-connect-backend-api
```

**Description (opcional):**
```
Backend API Node.js para substituir Edge Functions
```

### 3.2. Source

**Repository:**
```
https://github.com/balbiss/app-connect-whitelabel
```

**Branch:**
```
main
```

**Dockerfile Location:**
```
backend-api/Dockerfile
```

**Docker Build Context:**
```
backend-api
```

**Ou deixe vazio** (Coolify vai detectar automaticamente)

---

## 🎯 PASSO 4: Configurar Build

### 4.1. Build Pack

- Selecione **"Dockerfile"** ou **"Docker"**
- (Não escolha "Nixpacks" ou "Buildpack")

### 4.2. Build Arguments (se necessário)

Deixe vazio por enquanto (não precisa)

---

## 🎯 PASSO 5: Configurar Porta

### 5.1. Ports Mappings

**IMPORTANTE:** Deixe vazio ou configure:

- **Port:** `3001`
- **Protocol:** `HTTP`

**OU** deixe vazio para o Coolify gerenciar automaticamente

---

## 🎯 PASSO 6: Configurar Variáveis de Ambiente

Clique em **"Environment Variables"** ou **"Env"** e adicione:

### 6.1. Supabase

```
SUPABASE_URL=https://oxpcmdejlcmsopjbqncf.supabase.co
```

```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94cGNtZGVqbGNtc29wamJxbmNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImiYXQiOjE3NjU4MzY5NjMsImV4cCI6MjA4MTQxMjk2M30.J6Xt-8mAdWB4rTJunEK8jPvNFD73MlL5wL9SPXx_vCU
```

### 6.2. Redis

```
REDIS_HOST=redis-16062.crce207.sa-east-1-2.ec2.cloud.redislabs.com
```

```
REDIS_PORT=16062
```

```
REDIS_PASSWORD=bw70OK3sjdNHu4zj4RtyIHNvKaUp73xh
```

```
REDIS_DB=0
```

### 6.3. WhatsApp API

```
WHATSAPP_API_URL=https://weeb.inoovaweb.com.br
```

### 6.4. Middleware

```
MIDDLEWARE_URL=http://uc08ws4s80kgk400o44wkss8.72.60.136.16.sslip.io
```

### 6.5. Server

```
PORT=3001
```

```
NODE_ENV=production
```

---

## 🎯 PASSO 7: Configurar Health Check (Opcional)

### 7.1. Health Check

- **Path:** `/health`
- **Port:** `3001`
- **Interval:** `30s`

**OU** deixe desabilitado por enquanto

---

## 🎯 PASSO 8: Salvar e Deploy

### 8.1. Revisar Configurações

Verifique se está tudo certo:
- ✅ Nome: `app-connect-backend-api`
- ✅ Dockerfile: `backend-api/Dockerfile`
- ✅ Variáveis de ambiente configuradas
- ✅ Porta: `3001`

### 8.2. Clicar em "Save" ou "Deploy"

- Clique no botão **"Save"** ou **"Deploy"** ou **"Create"**
- O Coolify vai começar a fazer build

---

## 🎯 PASSO 9: Aguardar Build

### 9.1. Monitorar Logs

- Clique na aplicação criada
- Vá para a aba **"Logs"** ou **"Build Logs"**
- Aguarde o build completar (pode levar 2-5 minutos)

### 9.2. Verificar Status

- Status deve mudar para **"Running"** ou **"Healthy"**
- Se der erro, verifique os logs

---

## 🎯 PASSO 10: Testar API

### 10.1. Acessar Health Check

No navegador ou terminal:

```
http://seu-coolify-domain/app-connect-backend-api/health
```

**OU** se tiver domínio configurado:

```
https://api.seu-dominio.com/health
```

### 10.2. Verificar Resposta

Deve retornar:
```json
{
  "status": "healthy",
  "services": {
    "supabase": "connected",
    "redis": "connected"
  }
}
```

---

## 🎯 PASSO 11: Criar Aplicação do Cron (Separado)

### 11.1. Criar Nova Aplicação

Repita os passos 2-4, mas com:

**Name:**
```
app-connect-backend-cron
```

**Dockerfile Location:**
```
backend-api/Dockerfile
```

### 11.2. Configurar Command

Na seção **"Command"** ou **"Start Command"**, coloque:

```
npm run cron
```

### 11.3. Variáveis de Ambiente

Adicione as mesmas variáveis, mais:

```
BACKEND_API_URL=http://app-connect-backend-api:3001
```

**OU** se estiverem no mesmo servidor:

```
BACKEND_API_URL=http://localhost:3001
```

### 11.4. Porta

**NÃO configure porta** (cron não expõe HTTP)

### 11.5. Deploy

Salve e aguarde o deploy

---

## ✅ Checklist Final

- [ ] Backend API deployado e rodando
- [ ] Health check retorna "healthy"
- [ ] Cron job deployado e rodando
- [ ] Logs sem erros
- [ ] Variáveis de ambiente configuradas

---

## 🐛 Troubleshooting

### Erro: "Dockerfile not found"

**Solução:**
- Verifique se o **Dockerfile Location** está correto: `backend-api/Dockerfile`
- Verifique se o **Build Context** está correto: `backend-api`

### Erro: "Build failed"

**Solução:**
- Verifique os logs de build
- Certifique-se que o repositório está público ou você tem acesso
- Verifique se todas as variáveis de ambiente estão configuradas

### Erro: "Cannot connect to Redis"

**Solução:**
- Verifique se `REDIS_HOST`, `REDIS_PORT` e `REDIS_PASSWORD` estão corretos
- Teste a conexão Redis manualmente

### Erro: "Cannot connect to Supabase"

**Solução:**
- Verifique se `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` estão corretos
- Teste a conexão Supabase manualmente

---

## 📞 Próximos Passos

Depois que o backend estiver rodando:

1. ✅ Atualizar frontend para usar nova API
2. ✅ Testar criação de campanha
3. ✅ Testar execução de campanha agendada
4. ✅ Remover Edge Functions antigas (opcional)

---

## 🎯 Resumo Rápido

1. **Coolify** → **New Resource** → **Application**
2. **Name:** `app-connect-backend-api`
3. **Repository:** `balbiss/app-connect-whitelabel`
4. **Dockerfile:** `backend-api/Dockerfile`
5. **Porta:** `3001`
6. **Variáveis:** Adicionar todas do `.env.example`
7. **Deploy** e aguardar
8. **Testar** `/health`

**Pronto!** 🚀

