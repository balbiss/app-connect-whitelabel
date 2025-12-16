# WhatsApp Disparo Middleware

Microsserviço middleware para processamento de disparos em massa no WhatsApp usando arquitetura de fila (Queue) com BullMQ.

## 🏗️ Arquitetura

O sistema é dividido em duas partes:

1. **API (Producer)**: Recebe requisições HTTP e adiciona jobs na fila do Redis
2. **Worker (Consumer)**: Processa os jobs da fila, envia mensagens via API Wuazap e atualiza status no Supabase

## 📋 Requisitos

- Node.js 18+
- Redis 6+
- Supabase (banco de dados)
- API Wuazap (WhatsApp)

## 🚀 Instalação

1. **Instalar dependências:**
```bash
npm install
```

2. **Configurar variáveis de ambiente:**
```bash
cp .env.example .env
# Edite o arquivo .env com suas credenciais
```

3. **Iniciar Redis:**
```bash
# Docker
docker run -d -p 6379:6379 redis:7-alpine

# Ou use um serviço Redis gerenciado (Redis Cloud, etc)
```

## 🎯 Uso

### Iniciar a API (Producer)

```bash
# Produção
npm start

# Desenvolvimento (com watch)
npm run dev
```

A API estará disponível em `http://localhost:3000`

### Iniciar o Worker (Consumer)

Em um terminal separado:

```bash
# Produção
npm run worker

# Desenvolvimento (com watch)
npm run dev:worker
```

## 📡 Endpoints da API

### POST /api/messages/dispatch

Adiciona mensagens na fila para processamento.

**Request:**
```json
{
  "messages": [
    {
      "disparo_id": "uuid-do-disparo",
      "recipient_id": "uuid-do-recipient",
      "phone": "5519982724395",
      "message": "Texto da mensagem",
      "media_url": "data:image/png;base64,...", // opcional
      "media_type": "image", // opcional: image, video, document, audio
      "api_token": "token-da-instancia-wuazap",
      "priority": 1 // opcional, padrão: 1
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "10 mensagens adicionadas na fila",
  "jobsAdded": 10,
  "jobIds": ["job-1", "job-2", ...]
}
```

### GET /api/messages/stats

Retorna estatísticas da fila.

**Response:**
```json
{
  "success": true,
  "stats": {
    "waiting": 50,
    "active": 5,
    "completed": 1000,
    "failed": 2,
    "delayed": 0,
    "total": 1057
  }
}
```

### GET /api/messages/health

Health check da API.

**Response:**
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2025-12-16T12:00:00.000Z"
}
```

## ⚙️ Configurações

### Rate Limiting

O Worker processa no máximo **10 mensagens por segundo** para evitar bloqueio do WhatsApp.

Configurável via `.env`:
- `RATE_LIMIT_MAX=10` (mensagens por período)
- `RATE_LIMIT_DURATION=1000` (período em milissegundos)

### Concorrência

O Worker processa **5 jobs simultaneamente**.

Configurável via `.env`:
- `MAX_CONCURRENT_JOBS=5`

### Retry

Jobs falhos são tentados novamente automaticamente:
- Máximo de tentativas: `MAX_RETRIES=3`
- Delay entre tentativas: `RETRY_DELAY=5000` (5 segundos, exponencial)

## 📊 Monitoramento

### Logs

O sistema gera logs detalhados:
- ✅ Jobs completados
- ❌ Jobs falhos
- ⏳ Jobs aguardando
- 🔄 Jobs em processamento

### Redis CLI

Você pode monitorar a fila diretamente no Redis:

```bash
redis-cli

# Ver tamanho da fila
LLEN bull:whatsapp-messages:wait

# Ver jobs ativos
LLEN bull:whatsapp-messages:active

# Ver jobs completos
LLEN bull:whatsapp-messages:completed
```

## 🔧 Troubleshooting

### Worker não está processando

1. Verifique se o Redis está rodando
2. Verifique os logs do Worker
3. Verifique se há jobs na fila: `GET /api/messages/stats`

### Mensagens não estão sendo enviadas

1. Verifique o token da API Wuazap
2. Verifique os logs do Worker para erros específicos
3. Verifique se a instância WhatsApp está online

### Performance

Se precisar processar mais mensagens:
1. Aumente `MAX_CONCURRENT_JOBS` (cuidado com rate limiting)
2. Execute múltiplos Workers em paralelo
3. Use Redis Cluster para alta disponibilidade

## 🐳 Docker

```dockerfile
# Dockerfile exemplo
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

## 📝 Notas

- O sistema atualiza automaticamente o status no Supabase (`disparo_recipients`)
- Jobs duplicados são evitados usando `jobId` único
- Jobs completos são mantidos por 1 hora para auditoria
- Jobs falhos são mantidos por 24 horas para análise

## 🔒 Segurança

- Use HTTPS em produção
- Proteja o endpoint `/api/messages/dispatch` com autenticação
- Não exponha o Redis publicamente
- Use variáveis de ambiente para credenciais

## 📄 Licença

ISC

