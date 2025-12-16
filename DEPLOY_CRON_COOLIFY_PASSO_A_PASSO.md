# 🕐 Deploy do Cron Job no Coolify - Passo a Passo

## 📋 O Que É o Cron Job?

O cron job executa campanhas agendadas **automaticamente a cada minuto**. Ele chama a API do backend para processar campanhas que estão agendadas.

---

## 🎯 PASSO 1: Acessar Coolify

1. Abra seu navegador
2. Acesse o painel do Coolify
3. Faça login

---

## 🎯 PASSO 2: Criar Nova Aplicação

### 2.1. Clicar em "New Resource"

- No menu lateral esquerdo, procure por:
  - **"New Resource"** ou
  - Botão **"+"** ou
  - **"Add"** ou
  - **"New Application"**

### 2.2. Selecionar Tipo

- Escolha **"Application"** ou **"Docker"**

---

## 🎯 PASSO 3: Configurar Repository

### 3.1. Repository URL

**Preencha:**
```
https://github.com/balbiss/app-connect-whitelabel
```

### 3.2. Branch

**Preencha:**
```
main
```

### 3.3. Build Pack

**Selecione:**
```
Dockerfile
```

### 3.4. Base Directory

**Preencha:**
```
backend-api
```

### 3.5. Clique em "Continue"

---

## 🎯 PASSO 4: Configurações Gerais

### 4.1. Name

**Preencha:**
```
app-connect-backend-cron
```

### 4.2. Description (Opcional)

```
Cron job para executar campanhas agendadas automaticamente
```

### 4.3. Build Pack

**Deve estar:** `Dockerfile` (já selecionado)

### 4.4. Base Directory

**Deve estar:** `backend-api` (já preenchido)

### 4.5. Dockerfile Location

**Preencha:**
```
Dockerfile
```

---

## 🎯 PASSO 5: Configurar Command (IMPORTANTE!)

### 5.1. Procurar Campo "Command" ou "Start Command"

- Procure na tela por:
  - **"Command"** ou
  - **"Start Command"** ou
  - **"Docker Command"** ou
  - **"CMD"**

### 5.2. Preencher Command

**Digite:**
```
npm run cron
```

**IMPORTANTE:** Isso faz o container rodar o cron job em vez do servidor API.

---

## 🎯 PASSO 6: Configurar Porta

### 6.1. Ports Exposes

**Deixe VAZIO** ou coloque `3001` (não importa, não vai usar)

### 6.2. Ports Mappings

**Deixe VAZIO** ou remova qualquer mapeamento

**IMPORTANTE:** O cron job **NÃO expõe HTTP**, então não precisa de porta.

---

## 🎯 PASSO 7: Variáveis de Ambiente

Clique em **"Environment Variables"** ou **"Env"** e adicione:

### 7.1. Supabase

```
SUPABASE_URL=https://oxpcmdejlcmsopjbqncf.supabase.co
```

```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94cGNtZGVqbGNtc29wamJxbmNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImiYXQiOjE3NjU4MzY5NjMsImV4cCI6MjA4MTQxMjk2M30.J6Xt-8mAdWB4rTJunEK8jPvNFD73MlL5wL9SPXx_vCU
```

### 7.2. Redis

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

### 7.3. WhatsApp API

```
WHATSAPP_API_URL=https://weeb.inoovaweb.com.br
```

### 7.4. Middleware

```
MIDDLEWARE_URL=http://uc08ws4s80kgk400o44wkss8.72.60.136.16.sslip.io
```

### 7.5. Backend API URL (IMPORTANTE!)

```
BACKEND_API_URL=http://app-connect-backend-api:3001
```

**OU** se estiverem no mesmo servidor:

```
BACKEND_API_URL=http://localhost:3001
```

**OU** se souber o IP interno:

```
BACKEND_API_URL=http://172.x.x.x:3001
```

### 7.6. Server

```
NODE_ENV=production
```

**NÃO precisa de `PORT`** (cron não usa porta)

---

## 🎯 PASSO 8: Desabilitar Health Check

### 8.1. Procurar "Health Check"

- Procure na tela por:
  - **"Health Check"** ou
  - **"Healthcheck"**

### 8.2. Desabilitar

- **Desmarque** ou **desabilite** o health check

**IMPORTANTE:** O cron job não expõe HTTP, então health check não funciona.

---

## 🎯 PASSO 9: Salvar e Deploy

### 9.1. Revisar Configurações

Verifique:
- ✅ Name: `app-connect-backend-cron`
- ✅ Command: `npm run cron`
- ✅ Dockerfile: `backend-api/Dockerfile`
- ✅ Variáveis de ambiente configuradas
- ✅ Health check desabilitado
- ✅ Porta vazia ou removida

### 9.2. Clicar em "Save" ou "Deploy"

- Clique no botão **"Save"** ou **"Deploy"** ou **"Create"**
- O Coolify vai começar a fazer build

---

## 🎯 PASSO 10: Aguardar Build

### 10.1. Monitorar Logs

- Clique na aplicação criada
- Vá para a aba **"Logs"** ou **"Build Logs"**
- Aguarde o build completar (pode levar 2-5 minutos)

### 10.2. Verificar Logs do Container

Depois do build, vá em **"Logs"** do container rodando.

**Deve aparecer:**
```
🕐 Iniciando cron jobs...
✅ Cron jobs iniciados:
   - Executar campanhas agendadas: a cada minuto
```

---

## ✅ Verificar se Está Funcionando

### 1. Ver Logs

Nos logs do container, a cada minuto deve aparecer:
```
[2025-12-16T23:XX:XX.XXXZ] Executando campanhas agendadas...
✅ Campanhas processadas: X
```

### 2. Testar Criando Campanha Agendada

1. Crie uma campanha agendada para 1-2 minutos no futuro
2. Aguarde o horário
3. Verifique se a campanha foi executada

---

## 🐛 Troubleshooting

### Erro: "Cannot connect to backend API"

**Solução:**
- Verifique se `BACKEND_API_URL` está correto
- Se estiverem no mesmo servidor, use `http://localhost:3001`
- Se estiverem em containers diferentes, use o nome do serviço: `http://app-connect-backend-api:3001`

### Erro: "Command not found: npm"

**Solução:**
- Verifique se o Dockerfile está correto
- Verifique se o Base Directory está como `backend-api`

### Cron não executa

**Solução:**
- Verifique os logs do container
- Certifique-se que o container está rodando
- Verifique se todas as variáveis de ambiente estão configuradas

---

## ✅ Checklist Final

- [ ] Aplicação `app-connect-backend-cron` criada
- [ ] Command: `npm run cron` configurado
- [ ] Variáveis de ambiente adicionadas
- [ ] `BACKEND_API_URL` configurado corretamente
- [ ] Health check desabilitado
- [ ] Build completado com sucesso
- [ ] Logs mostrando "Cron jobs iniciados"
- [ ] Logs mostrando execução a cada minuto

---

## 🎯 Próximo Passo

Depois que o cron estiver funcionando:

1. ✅ Atualizar frontend para usar nova API
2. ✅ Testar criação de campanha
3. ✅ Testar campanha agendada

**Vamos continuar?** 🚀

