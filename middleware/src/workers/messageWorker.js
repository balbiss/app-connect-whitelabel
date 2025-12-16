/**
 * Worker para processar mensagens da fila
 * Este processo roda separadamente e processa os jobs do BullMQ
 */

import { Worker } from 'bullmq';
import redisConnection from '../config/redis.js';
import supabase from '../config/supabase.js';
import axios from 'axios';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

// Configuração da API WhatsApp
const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || 'https://weeb.inoovaweb.com.br';

const QUEUE_NAME = process.env.QUEUE_NAME || 'whatsapp-messages';
const MAX_CONCURRENT_JOBS = parseInt(process.env.MAX_CONCURRENT_JOBS || '5');
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || '10');
const RATE_LIMIT_DURATION = parseInt(process.env.RATE_LIMIT_DURATION || '1000');

/**
 * Função para enviar mensagem via API Wuazap
 */
const sendWhatsAppMessage = async (messageData) => {
  const {
    phone,
    message,
    mediaUrl,
    mediaType,
    apiToken,
  } = messageData;

  const cleanPhone = phone.replace(/\D/g, '');

  try {
    let response;

    // Enviar mensagem com ou sem mídia
    if (mediaUrl && mediaType) {
      const endpoint = getMediaEndpoint(mediaType);
      response = await axios.post(
        `${WHATSAPP_API_URL}${endpoint}`,
        {
          Phone: cleanPhone,
          [getMediaFieldName(mediaType)]: mediaUrl,
          Caption: message || undefined,
        },
        {
          headers: {
            'token': apiToken,
            'Content-Type': 'application/json',
          },
          timeout: 30000, // 30 segundos de timeout
        }
      );
    } else {
      // Enviar apenas texto
      response = await axios.post(
        `${WHATSAPP_API_URL}/chat/send/text`,
        {
          Phone: cleanPhone,
          Body: message || '',
        },
        {
          headers: {
            'token': apiToken,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );
    }

    return {
      success: response.data?.success || false,
      message: response.data?.message || 'Mensagem enviada',
      data: response.data,
    };
  } catch (error) {
    console.error(`❌ Erro ao enviar mensagem para ${phone}:`, error.message);
    
    // Se for erro de timeout ou conexão, lançar erro para retry
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      throw new Error(`Timeout ao enviar mensagem: ${error.message}`);
    }

    // Se for erro 4xx, não retry (erro do cliente)
    if (error.response?.status >= 400 && error.response?.status < 500) {
      throw new Error(`Erro do cliente: ${error.response?.data?.message || error.message}`);
    }

    // Para outros erros, lançar para retry
    throw error;
  }
};

/**
 * Função auxiliar para obter endpoint de mídia
 */
const getMediaEndpoint = (mediaType) => {
  const endpoints = {
    image: '/chat/send/image',
    video: '/chat/send/video',
    document: '/chat/send/document',
    audio: '/chat/send/audio',
  };
  return endpoints[mediaType] || '/chat/send/text';
};

/**
 * Função auxiliar para obter nome do campo de mídia
 */
const getMediaFieldName = (mediaType) => {
  const fieldNames = {
    image: 'Image',
    video: 'Video',
    document: 'Document',
    audio: 'Audio',
  };
  return fieldNames[mediaType] || 'Body';
};

/**
 * Função para atualizar status no Supabase
 */
const updateMessageStatus = async (recipientId, status, errorMessage = null) => {
  try {
    const updateData = {
      status,
      sent_at: status === 'sent' ? new Date().toISOString() : null,
      error_message: errorMessage,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('disparo_recipients')
      .update(updateData)
      .eq('id', recipientId);

    if (error) {
      console.error(`❌ Erro ao atualizar status do recipient ${recipientId}:`, error);
      throw error;
    }

    console.log(`✅ Status atualizado: recipient ${recipientId} -> ${status}`);
  } catch (error) {
    console.error(`❌ Erro ao atualizar status no Supabase:`, error);
    throw error;
  }
};

/**
 * Função para atualizar contadores do disparo
 */
const updateDisparoCounters = async (disparoId, incrementSent = false, incrementFailed = false) => {
  try {
    // Buscar valores atuais
    const { data: currentDisparo, error: fetchError } = await supabase
      .from('disparos')
      .select('sent_count, failed_count')
      .eq('id', disparoId)
      .single();

    if (fetchError) {
      console.error(`❌ Erro ao buscar disparo ${disparoId}:`, fetchError);
      return;
    }

    const updateData = {};
    if (incrementSent) {
      updateData.sent_count = (currentDisparo?.sent_count || 0) + 1;
    }
    if (incrementFailed) {
      updateData.failed_count = (currentDisparo?.failed_count || 0) + 1;
    }

    if (Object.keys(updateData).length > 0) {
      const { error } = await supabase
        .from('disparos')
        .update(updateData)
        .eq('id', disparoId);

      if (error) {
        console.error(`❌ Erro ao atualizar contadores do disparo ${disparoId}:`, error);
      }
    }
  } catch (error) {
    console.error(`❌ Erro ao atualizar contadores:`, error);
  }
};

/**
 * Processador de jobs
 * Esta função é chamada para cada job na fila
 */
const processMessageJob = async (job) => {
  const {
    disparo_id,
    recipient_id,
    phone,
    message,
    media_url,
    media_type,
    api_token,
  } = job.data;

  console.log(`🔄 Processando job ${job.id} - Recipient: ${recipient_id}, Phone: ${phone}`);

  try {
    // Enviar mensagem via API Wuazap
    const result = await sendWhatsAppMessage({
      phone,
      message,
      mediaUrl: media_url,
      mediaType: media_type,
      apiToken: api_token,
    });

    if (result.success) {
      // Atualizar status para 'sent' no Supabase
      await updateMessageStatus(recipient_id, 'sent');
      
      // Incrementar contador de enviados
      await updateDisparoCounters(disparo_id, true, false);

      console.log(`✅ Mensagem enviada com sucesso: ${phone}`);
      return { success: true, message: 'Mensagem enviada com sucesso' };
    } else {
      // Se a API retornou success: false, marcar como falha
      const errorMsg = result.message || 'Erro ao enviar mensagem';
      await updateMessageStatus(recipient_id, 'failed', errorMsg);
      await updateDisparoCounters(disparo_id, false, true);

      throw new Error(errorMsg);
    }
  } catch (error) {
    // Atualizar status para 'failed' no Supabase
    await updateMessageStatus(recipient_id, 'failed', error.message);
    await updateDisparoCounters(disparo_id, false, true);

    // Lançar erro para o BullMQ tentar novamente (retry)
    throw error;
  }
};

// Criar Worker do BullMQ
const worker = new Worker(
  QUEUE_NAME,
  processMessageJob,
  {
    connection: redisConnection,
    concurrency: MAX_CONCURRENT_JOBS, // Processar 5 jobs simultaneamente
    limiter: {
      max: RATE_LIMIT_MAX, // Máximo de 10 jobs
      duration: RATE_LIMIT_DURATION, // Por segundo (1000ms)
    },
    removeOnComplete: {
      age: 3600, // Remover jobs completos após 1 hora
      count: 1000, // Manter últimos 1000 jobs
    },
    removeOnFail: {
      age: 24 * 3600, // Manter jobs falhos por 24 horas
    },
  }
);

// Event listeners do Worker
worker.on('completed', (job) => {
  console.log(`✅ Job ${job.id} processado com sucesso`);
});

worker.on('failed', (job, err) => {
  console.error(`❌ Job ${job.id} falhou após ${job.attemptsMade} tentativas:`, err.message);
});

worker.on('error', (err) => {
  console.error('❌ Erro no Worker:', err);
});

worker.on('stalled', (jobId) => {
  console.warn(`⚠️  Job ${jobId} travado, será reprocessado`);
});

// Graceful shutdown
const shutdown = async () => {
  console.log('🛑 Encerrando Worker...');
  await worker.close();
  await redisConnection.quit();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

console.log('🚀 Worker iniciado');
console.log(`📊 Configuração: ${MAX_CONCURRENT_JOBS} jobs simultâneos, ${RATE_LIMIT_MAX} jobs/segundo`);

