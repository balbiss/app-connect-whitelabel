/**
 * Rotas da API para gerenciar mensagens
 */

import { addBulkMessageJobs, getQueueStats } from '../queues/messageQueue.js';

/**
 * Registrar rotas no Fastify
 */
export default async function messageRoutes(fastify) {
  /**
   * POST /api/messages/dispatch
   * Recebe um array de mensagens e adiciona na fila
   * 
   * Body esperado:
   * {
   *   messages: [
   *     {
   *       disparo_id: "uuid",
   *       recipient_id: "uuid",
   *       phone: "5519982724395",
   *       message: "Texto da mensagem",
   *       media_url: "base64...", // opcional
   *       media_type: "image", // opcional: image, video, document, audio
   *       api_token: "token-da-instancia",
   *       priority: 1 // opcional, padrão: 1
   *     }
   *   ]
   * }
   */
  fastify.post('/api/messages/dispatch', async (request, reply) => {
    try {
      const { messages } = request.body;

      // Validação
      if (!messages || !Array.isArray(messages)) {
        return reply.code(400).send({
          success: false,
          error: 'Campo "messages" deve ser um array',
        });
      }

      if (messages.length === 0) {
        return reply.code(400).send({
          success: false,
          error: 'Array de mensagens não pode estar vazio',
        });
      }

      // Validar cada mensagem
      const requiredFields = ['disparo_id', 'recipient_id', 'phone', 'api_token'];
      for (const message of messages) {
        for (const field of requiredFields) {
          if (!message[field]) {
            return reply.code(400).send({
              success: false,
              error: `Campo obrigatório ausente: ${field}`,
            });
          }
        }

        // Validar formato do telefone (deve ter pelo menos 10 dígitos)
        const cleanPhone = message.phone.replace(/\D/g, '');
        if (cleanPhone.length < 10) {
          return reply.code(400).send({
            success: false,
            error: `Telefone inválido: ${message.phone}`,
          });
        }
      }

      // Adicionar jobs na fila
      const jobs = await addBulkMessageJobs(messages);

      return {
        success: true,
        message: `${jobs.length} mensagens adicionadas na fila`,
        jobsAdded: jobs.length,
        jobIds: jobs.map(job => job.id),
      };
    } catch (error) {
      console.error('❌ Erro ao adicionar mensagens na fila:', error);
      return reply.code(500).send({
        success: false,
        error: 'Erro ao processar requisição',
        message: error.message,
      });
    }
  });

  /**
   * GET /api/messages/stats
   * Retorna estatísticas da fila
   */
  fastify.get('/api/messages/stats', async (request, reply) => {
    try {
      const stats = await getQueueStats();
      return {
        success: true,
        stats,
      };
    } catch (error) {
      console.error('❌ Erro ao obter estatísticas:', error);
      return reply.code(500).send({
        success: false,
        error: 'Erro ao obter estatísticas',
        message: error.message,
      });
    }
  });

  /**
   * GET /api/messages/health
   * Health check da API
   */
  fastify.get('/api/messages/health', async (request, reply) => {
    return {
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  });
}

