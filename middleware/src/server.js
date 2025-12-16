/**
 * Servidor Fastify - API para receber requisições e adicionar jobs na fila
 * Este é o Producer (Produtor) da arquitetura
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import messageRoutes from './routes/messages.js';
import redisConnection from './config/redis.js';

// Carregar variáveis de ambiente
dotenv.config();

const PORT = parseInt(process.env.PORT || '3000');
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
  origin: true, // Permitir todas as origens (ajuste conforme necessário)
  credentials: true,
});

// Registrar rotas
await fastify.register(messageRoutes);

// Rota raiz
fastify.get('/', async (request, reply) => {
  return {
    service: 'WhatsApp Disparo Middleware',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
  };
});

// Hook de erro global
fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error);
  reply.code(500).send({
    success: false,
    error: 'Erro interno do servidor',
    message: NODE_ENV === 'development' ? error.message : undefined,
  });
});

// Fastify v4 já faz parsing de JSON automaticamente, não precisa configurar

// Graceful shutdown
const shutdown = async () => {
  fastify.log.info('🛑 Encerrando servidor...');
  try {
    await fastify.close();
    await redisConnection.quit();
    process.exit(0);
  } catch (error) {
    fastify.log.error('Erro ao encerrar servidor:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Iniciar servidor
const start = async () => {
  try {
    // Verificar conexão Redis
    await redisConnection.ping();
    fastify.log.info('✅ Redis conectado');

    // Iniciar servidor
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    fastify.log.info(`🚀 Servidor rodando na porta ${PORT}`);
    fastify.log.info(`📡 Ambiente: ${NODE_ENV}`);
  } catch (error) {
    fastify.log.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
  }
};

start();

