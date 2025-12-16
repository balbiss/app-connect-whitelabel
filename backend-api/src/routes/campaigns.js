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
      const { disparo_id, recipients, total_recipients } = request.body;
      
      if (!disparo_id || !recipients || !Array.isArray(recipients)) {
        reply.code(400);
        return {
          success: false,
          error: 'Dados inválidos: disparo_id e recipients são obrigatórios',
        };
      }

      const result = await insertCampaignRecipients(disparo_id, recipients, total_recipients);
      
      return {
        success: true,
        ...result,
      };
    } catch (error) {
      fastify.log.error('Erro ao inserir recipients:', error);
      reply.code(500);
      return {
        success: false,
        error: error.message,
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

