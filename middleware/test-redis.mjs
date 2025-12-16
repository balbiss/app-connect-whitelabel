/**
 * Script para testar conexão com Redis
 */

import Redis from 'ioredis';
import dotenv from 'dotenv';

// Carregar .env
dotenv.config();

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  retryStrategy: (times) => {
    if (times > 3) {
      return null; // Parar após 3 tentativas
    }
    return Math.min(times * 50, 2000);
  },
  maxRetriesPerRequest: 3,
});

console.log('🔍 Testando conexão com Redis...');
console.log(`   Host: ${process.env.REDIS_HOST}`);
console.log(`   Port: ${process.env.REDIS_PORT}`);
console.log(`   Password: ${process.env.REDIS_PASSWORD ? '***' : 'não configurada'}`);
console.log('');

redis.on('connect', () => {
  console.log('✅ Redis conectado!');
});

redis.on('error', (err) => {
  console.error('❌ Erro:', err.message);
  process.exit(1);
});

try {
  const result = await redis.ping();
  console.log('✅ PING resposta:', result);
  console.log('✅ Conexão funcionando perfeitamente!');
  await redis.quit();
  process.exit(0);
} catch (err) {
  console.error('❌ Erro ao fazer PING:', err.message);
  await redis.quit();
  process.exit(1);
}

