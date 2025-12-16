# 🔴 CONFIGURAR REDIS PARA PRODUÇÃO

## ⚠️ IMPORTANTE

O Redis configurado como `localhost` só funciona em desenvolvimento. Para produção, você precisa de um Redis acessível pela internet.

## 🎯 Opções para Produção

### Opção 1: Redis Cloud (Recomendado - Gratuito)

**Melhor opção para começar:**
- ✅ Gratuito até 30MB
- ✅ Gerenciado (sem manutenção)
- ✅ Alta disponibilidade
- ✅ Backup automático

#### Passo a Passo:

1. **Criar conta:**
   - Acesse: https://redis.com/try-free/
   - Crie uma conta gratuita

2. **Criar banco:**
   - Clique em "Create database"
   - Escolha "Free" (30MB)
   - Escolha região (ex: AWS us-east-1)
   - Clique em "Activate"

3. **Obter credenciais:**
   - Após criar, você verá:
     - **Public endpoint**: `redis-xxxxx.redis.cloud:12345`
     - **Password**: `sua-senha-aqui`

4. **Configurar no .env:**
   ```env
   REDIS_HOST=redis-xxxxx.redis.cloud
   REDIS_PORT=12345
   REDIS_PASSWORD=sua-senha-aqui
   REDIS_DB=0
   ```

---

### Opção 2: Upstash Redis (Gratuito)

**Boa opção alternativa:**
- ✅ Gratuito até 10K comandos/dia
- ✅ Serverless (paga por uso)
- ✅ Sem servidor para gerenciar

#### Passo a Passo:

1. **Criar conta:**
   - Acesse: https://upstash.com/
   - Crie uma conta gratuita

2. **Criar banco:**
   - Clique em "Create Database"
   - Escolha região
   - Clique em "Create"

3. **Obter credenciais:**
   - Você verá:
     - **Endpoint**: `xxxxx.upstash.io`
     - **Port**: `6379`
     - **Password**: `sua-senha-aqui`

4. **Configurar no .env:**
   ```env
   REDIS_HOST=xxxxx.upstash.io
   REDIS_PORT=6379
   REDIS_PASSWORD=sua-senha-aqui
   REDIS_DB=0
   ```

---

### Opção 3: Redis no Mesmo Servidor (Produção Dedicada)

**Se você tem um servidor próprio:**

#### Passo a Passo:

1. **Instalar Redis no servidor:**
   ```bash
   # Ubuntu/Debian
   sudo apt update
   sudo apt install redis-server

   # Ou usar Docker
   docker run -d \
     --name redis \
     -p 6379:6379 \
     --restart unless-stopped \
     redis:7-alpine redis-server --requirepass sua-senha-forte
   ```

2. **Configurar firewall:**
   - Abra porta 6379 apenas para IPs do middleware
   - Ou use VPN/túnel SSH

3. **Configurar no .env:**
   ```env
   REDIS_HOST=seu-servidor.com
   REDIS_PORT=6379
   REDIS_PASSWORD=sua-senha-forte
   REDIS_DB=0
   ```

---

### Opção 4: Redis no Coolify (Se usar Coolify)

**Se você já usa Coolify:**

1. **Criar serviço Redis:**
   - No Coolify, clique em "New Resource"
   - Escolha "Redis"
   - Configure e crie

2. **Obter credenciais:**
   - Coolify fornece automaticamente
   - Use o nome do serviço como host

3. **Configurar no .env:**
   ```env
   REDIS_HOST=redis (nome do serviço no Coolify)
   REDIS_PORT=6379
   REDIS_PASSWORD=senha-do-coolify
   REDIS_DB=0
   ```

---

## 🔧 Configurar Variáveis de Ambiente

### Para Desenvolvimento Local:

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

### Para Produção (Redis Cloud):

```env
REDIS_HOST=redis-xxxxx.redis.cloud
REDIS_PORT=12345
REDIS_PASSWORD=sua-senha-aqui
REDIS_DB=0
```

### Para Produção (Upstash):

```env
REDIS_HOST=xxxxx.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=sua-senha-aqui
REDIS_DB=0
```

---

## ✅ Testar Conexão

Após configurar, teste a conexão:

```bash
# No terminal do middleware
node -e "
import Redis from 'ioredis';
const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
});
redis.ping().then(r => console.log('✅ Redis conectado:', r));
"
```

Ou simplesmente inicie o middleware e veja os logs:
- ✅ Se aparecer "Redis conectado com sucesso" = funcionando
- ❌ Se aparecer erro = verifique credenciais

---

## 🚀 Deploy em Produção

### Se usar Coolify/Railway/Render:

1. **Adicione as variáveis de ambiente:**
   - No painel do serviço
   - Vá em "Environment Variables"
   - Adicione:
     - `REDIS_HOST`
     - `REDIS_PORT`
     - `REDIS_PASSWORD`
     - `REDIS_DB`

2. **Redeploy:**
   - O serviço vai usar as novas variáveis automaticamente

### Se usar servidor próprio:

1. **Edite o .env:**
   ```bash
   nano .env
   # Ou use seu editor preferido
   ```

2. **Reinicie o middleware:**
   ```bash
   # Parar processos
   pkill -f "npm start"
   pkill -f "npm run worker"
   
   # Iniciar novamente
   npm start  # Terminal 1
   npm run worker  # Terminal 2
   ```

---

## 📊 Comparação de Opções

| Opção | Custo | Facilidade | Performance | Recomendado |
|-------|-------|------------|-------------|-------------|
| Redis Cloud | Gratuito (30MB) | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ✅ Sim |
| Upstash | Gratuito (10K/dia) | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ✅ Sim |
| Servidor Próprio | Servidor | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⚠️ Avançado |
| Coolify | Incluído | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ✅ Se usar Coolify |

---

## 🎯 Recomendação

**Para começar:** Use **Redis Cloud** (gratuito, fácil, confiável)

**Para escala:** Use **Upstash** ou **Redis Cloud** pago

**Para controle total:** Use servidor próprio com Docker

---

## ✅ PRONTO!

Após configurar o Redis em produção, seu middleware estará pronto para processar milhares de mensagens sem travar!

