# 🚀 Backend API - App Connect

Backend Node.js que substitui as Edge Functions do Supabase.

## 📋 Funcionalidades

- ✅ Execução de campanhas agendadas
- ✅ Inserção de recipients em background
- ✅ Cron jobs para tarefas agendadas
- ✅ API REST com Fastify
- ✅ Integração com Supabase e Redis

## 🏃 Como Executar

### Desenvolvimento

```bash
# Instalar dependências
npm install

# Configurar .env
cp .env.example .env
# Editar .env com suas credenciais

# Executar servidor
npm run dev

# Executar cron jobs (em outro terminal)
npm run dev:cron
```

### Produção

```bash
# Executar servidor
npm start

# Executar cron jobs (em outro processo/container)
npm run cron
```

## 🔧 Variáveis de Ambiente

Veja `.env.example` para todas as variáveis necessárias.

## 📡 Endpoints

- `GET /` - Informações do serviço
- `GET /health` - Health check
- `POST /api/campaigns/execute` - Executar campanhas agendadas
- `POST /api/campaigns/recipients` - Inserir recipients
- `GET /api/campaigns/health` - Health check de campanhas

## 🐳 Docker

```bash
docker build -t app-connect-backend .
docker run -p 3001:3001 --env-file .env app-connect-backend
```

## 📝 Migração das Edge Functions

Este backend substitui:
- `execute-scheduled-disparos` → `/api/campaigns/execute`
- `insert-campaign-recipients` → `/api/campaigns/recipients`

