/**
 * Edge Function para deletar campanhas antigas (mais de 5 dias)
 * Executada diariamente via cron job
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Calcular data de 5 dias atrás
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    const fiveDaysAgoISO = fiveDaysAgo.toISOString();

    // Buscar campanhas com mais de 5 dias (apenas campanhas concluídas ou canceladas)
    const { data: oldCampaigns, error: fetchError } = await supabase
      .from('disparos')
      .select('id, campaign_name, user_id, created_at')
      .lt('created_at', fiveDaysAgoISO)
      .in('status', ['completed', 'cancelled', 'failed'])
      .limit(1000); // Limitar para não sobrecarregar

    if (fetchError) throw fetchError;

    if (!oldCampaigns || oldCampaigns.length === 0) {
      return new Response(JSON.stringify({ 
        message: 'Nenhuma campanha antiga encontrada',
        deleted: 0 
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let deletedCount = 0;
    let errorCount = 0;

    // Deletar campanhas em lotes
    for (const campaign of oldCampaigns) {
      try {
        // Deletar recipients primeiro (cascade)
        const { error: recipientsError } = await supabase
          .from('disparo_recipients')
          .delete()
          .eq('disparo_id', campaign.id);

        if (recipientsError) {
          console.error(`Erro ao deletar recipients da campanha ${campaign.id}:`, recipientsError);
          errorCount++;
          continue;
        }

        // Deletar campanha
        const { error: campaignError } = await supabase
          .from('disparos')
          .delete()
          .eq('id', campaign.id);

        if (campaignError) {
          console.error(`Erro ao deletar campanha ${campaign.id}:`, campaignError);
          errorCount++;
          continue;
        }

        deletedCount++;
      } catch (error) {
        console.error(`Erro ao processar campanha ${campaign.id}:`, error);
        errorCount++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        deleted: deletedCount,
        errors: errorCount,
        total: oldCampaigns.length,
        message: `Deletadas ${deletedCount} campanhas antigas (${errorCount} erros)`,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Erro ao deletar campanhas antigas:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});



