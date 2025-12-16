/**
 * Rotas para gerenciamento de campanhas
 */

async function campaignRoutes(fastify, options) {
  const { executeScheduledCampaigns, insertCampaignRecipients } = await import('../services/campaigns.js');

  // Executar campanhas agendadas
  fastify.post('/execute', async (request, reply) => {
    try {
      const { disparo_id } = request.body || {};
      
      const result = await executeScheduledCampaigns(disparo_id);
      
      return {
        success: true,
        ...result,
      };
    } catch (error) {
      fastify.log.error('Erro ao executar campanhas:', error);
      reply.code(500);
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // Inserir recipients de campanha
  fastify.post('/recipients', async (request, reply) => {
    try {
      fastify.log.info('📥 Recebida requisição para inserir recipients');
      fastify.log.info(`Body recebido: ${JSON.stringify(request.body)}`);
      
      const { disparo_id, recipients, total_recipients } = request.body || {};
      
      if (!disparo_id || !recipients || !Array.isArray(recipients)) {
        fastify.log.warn('❌ Dados inválidos recebidos');
        reply.code(400);
        return {
          success: false,
          error: 'Dados inválidos: disparo_id e recipients são obrigatórios',
        };
      }

      fastify.log.info(`📦 Processando ${recipients.length} recipients para disparo ${disparo_id}`);
      
      const result = await insertCampaignRecipients(disparo_id, recipients, total_recipients);
      
      fastify.log.info(`✅ Recipients inseridos com sucesso: ${result.inserted || 0}`);
      
      return {
        success: true,
        ...result,
      };
    } catch (error) {
      fastify.log.error('❌ Erro ao inserir recipients:', error);
      fastify.log.error('Stack trace:', error.stack);
      reply.code(500);
      return {
        success: false,
        error: error.message || 'Erro desconhecido',
      };
    }
  });

  // Health check
  fastify.get('/health', async (request, reply) => {
    return {
      status: 'healthy',
      service: 'campaigns',
      timestamp: new Date().toISOString(),
    };
  });
}

export default campaignRoutes;

