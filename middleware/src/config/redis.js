/**
 * Configuração do Redis para BullMQ
 * Redis é usado como banco em memória para a fila de jobs
 */

import Redis from 'ioredis';

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0'),
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  reconnectOnError: (err) => {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      return true;
    }
    return false;
  },
};

// Criar conexão Redis
const redisConnection = new Redis(redisConfig);

// Event listeners para monitoramento
redisConnection.on('connect', () => {
  console.log('✅ Redis conectado com sucesso');
});

redisConnection.on('error', (err) => {
  console.error('❌ Erro no Redis:', err);
});

redisConnection.on('close', () => {
  console.log('⚠️  Conexão Redis fechada');
});

export default redisConnection;

