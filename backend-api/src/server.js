/**
 * Servidor Fastify - Backend API
 * Substitui as Edge Functions do Supabase
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import campaignRoutes from './routes/campaigns.js';
import { supabase } from './config/supabase.js';
import redis from './config/redis.js';

// Carregar variáveis de ambiente
dotenv.config();

const PORT = parseInt(process.env.PORT || '3001');
const NODE_ENV = process.env.NODE_ENV || 'development';

// Criar instância do Fastify
const fastify = Fastify({
  logger: {
    level: NODE_ENV === 'production' ? 'info' : 'debug',
    transport: NODE_ENV === 'development' ? {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    } : undefined,
  },
  requestIdLogLabel: 'reqId',
  disableRequestLogging: false,
});

// Registrar CORS
await fastify.register(cors, {
  origin: true,
  credentials: true,
});

// Health check handler
const healthCheck = async (request, reply) => {
  const supabaseHealthy = supabase ? true : false;
  const redisHealthy = redis.status === 'ready';

  return {
    status: supabaseHealthy && redisHealthy ? 'healthy' : 'degraded',
    services: {
      supabase: supabaseHealthy ? 'connected' : 'disconnected',
      redis: redisHealthy ? 'connected' : 'disconnected',
    },
    timestamp: new Date().toISOString(),
  };
};

// Registrar health check em múltiplos caminhos (para funcionar com prefixo do Coolify)
fastify.get('/health', healthCheck);
fastify.get('/app-connect-backend-api/health', healthCheck); // Prefixo do Coolify
fastify.get('/:prefix/health', healthCheck); // Qualquer outro prefixo

// Registrar rotas
await fastify.register(campaignRoutes, { prefix: '/api/campaigns' });

// Rota raiz
fastify.get('/', async (request, reply) => {
  return {
    service: 'App Connect Backend API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      campaigns: '/api/campaigns',
      health: '/health',
    },
  };
});

// Tratamento de erros
fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error);
  reply.status(500).send({
    success: false,
    error: error.message || 'Erro interno do servidor',
  });
});

// Iniciar servidor
const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    fastify.log.info(`🚀 Servidor rodando na porta ${PORT}`);
    fastify.log.info(`📡 Ambiente: ${NODE_ENV}`);
    fastify.log.info(`✅ Supabase: ${process.env.SUPABASE_URL}`);
    fastify.log.info(`✅ Redis: ${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// Graceful shutdown
const shutdown = async (signal) => {
  fastify.log.info(`Recebido ${signal}, encerrando servidor...`);
  try {
    await fastify.close();
    await redis.quit();
    process.exit(0);
  } catch (err) {
    fastify.log.error('Erro ao encerrar:', err);
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start();

