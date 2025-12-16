/**
 * Configuração da Fila BullMQ para processamento de mensagens
 * BullMQ gerencia a fila de jobs no Redis
 */

import { Queue } from 'bullmq';
import redisConnection from '../config/redis.js';

const QUEUE_NAME = process.env.QUEUE_NAME || 'whatsapp-messages';

// Criar instância da fila
const messageQueue = new Queue(QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    // Configurações padrão para todos os jobs
    attempts: parseInt(process.env.MAX_RETRIES || '3'),
    backoff: {
      type: 'exponential',
      delay: parseInt(process.env.RETRY_DELAY || '5000'),
    },
    removeOnComplete: {
      age: 3600, // Manter jobs completos por 1 hora
      count: 1000, // Manter últimos 1000 jobs
    },
    removeOnFail: {
      age: 24 * 3600, // Manter jobs falhos por 24 horas
    },
  },
});

// Event listeners para monitoramento
messageQueue.on('error', (error) => {
  console.error('❌ Erro na fila:', error);
});

messageQueue.on('waiting', (job) => {
  console.log(`⏳ Job ${job.id} aguardando processamento`);
});

messageQueue.on('active', (job) => {
  console.log(`🔄 Job ${job.id} iniciado`);
});

messageQueue.on('completed', (job) => {
  console.log(`✅ Job ${job.id} completado`);
});

messageQueue.on('failed', (job, err) => {
  console.error(`❌ Job ${job.id} falhou:`, err.message);
});

// Função para adicionar jobs na fila
export const addMessageJob = async (messageData) => {
  try {
    const job = await messageQueue.add('send-message', messageData, {
      // Prioridade: maior número = maior prioridade
      priority: messageData.priority || 1,
      // Job ID único baseado no disparo_id e recipient_id
      jobId: `${messageData.disparo_id}-${messageData.recipient_id}`,
    });

    console.log(`📨 Job adicionado na fila: ${job.id}`);
    return job;
  } catch (error) {
    console.error('❌ Erro ao adicionar job na fila:', error);
    throw error;
  }
};

// Função para adicionar múltiplos jobs
export const addBulkMessageJobs = async (messagesData) => {
  try {
    const jobs = messagesData.map((messageData) => ({
      name: 'send-message',
      data: messageData,
      opts: {
        priority: messageData.priority || 1,
        jobId: `${messageData.disparo_id}-${messageData.recipient_id}`,
      },
    }));

    const addedJobs = await messageQueue.addBulk(jobs);
    console.log(`📨 ${addedJobs.length} jobs adicionados na fila`);
    return addedJobs;
  } catch (error) {
    console.error('❌ Erro ao adicionar jobs em lote:', error);
    throw error;
  }
};

// Função para obter estatísticas da fila
export const getQueueStats = async () => {
  try {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      messageQueue.getWaitingCount(),
      messageQueue.getActiveCount(),
      messageQueue.getCompletedCount(),
      messageQueue.getFailedCount(),
      messageQueue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    };
  } catch (error) {
    console.error('❌ Erro ao obter estatísticas da fila:', error);
    throw error;
  }
};

// Função para limpar a fila (útil para manutenção)
export const cleanQueue = async () => {
  try {
    await messageQueue.obliterate({ force: true });
    console.log('🧹 Fila limpa com sucesso');
  } catch (error) {
    console.error('❌ Erro ao limpar fila:', error);
    throw error;
  }
};

export default messageQueue;

