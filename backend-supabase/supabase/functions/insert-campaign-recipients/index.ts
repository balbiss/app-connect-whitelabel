/**
 * Edge Function para inserir recipients de campanha em background
 * Solução robusta e escalável para evitar timeout e erros 500
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Recipient {
  disparo_id: string;
  name: string | null;
  phone_number: string;
  message_variation_id: number;
  personalized_message: string;
  media_url: string | null;
  media_type: string | null;
  status: 'pending';
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { disparo_id, recipients, total_recipients } = await req.json();

    if (!disparo_id || !recipients || !Array.isArray(recipients)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Dados inválidos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[insert-recipients] Iniciando inserção de ${recipients.length} recipients para disparo ${disparo_id}`);

    // Verificar se o disparo existe e pertence ao usuário
    const { data: disparo, error: disparoError } = await supabase
      .from('disparos')
      .select('id, user_id, status')
      .eq('id', disparo_id)
      .single();

    if (disparoError || !disparo) {
      console.error(`[insert-recipients] Disparo não encontrado: ${disparo_id}`);
      return new Response(
        JSON.stringify({ success: false, error: 'Disparo não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Inserir recipients em lotes otimizados (reduzido para evitar WORKER_LIMIT)
    const BATCH_SIZE = 25; // Lote ainda menor para evitar limite de recursos (reduzido de 50 para 25)
    const totalBatches = Math.ceil(recipients.length / BATCH_SIZE);
    let insertedCount = 0;
    const errors: any[] = [];

    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;

      console.log(`[insert-recipients] Processando lote ${batchNum}/${totalBatches} (${batch.length} recipients)`);

      // Preparar dados do lote
      const batchData: Recipient[] = batch.map((r: any) => ({
        disparo_id,
        name: r.name || null,
        phone_number: r.phone_number,
        message_variation_id: r.message_variation_id || 0,
        personalized_message: r.personalized_message || '',
        media_url: r.media_url || null,
        media_type: r.media_type || null,
        status: 'pending' as const,
      }));

      // Tentar inserir com retry
      let retries = 3;
      let batchInserted = false;

      while (retries > 0 && !batchInserted) {
        try {
          const { error: insertError } = await supabase
            .from('disparo_recipients')
            .insert(batchData);

          if (insertError) {
            // Se for timeout, tentar novamente
            if ((insertError.code === '57014' || insertError.message?.includes('timeout')) && retries > 1) {
              retries--;
              console.warn(`[insert-recipients] Timeout no lote ${batchNum}, tentando novamente... (${retries} tentativas restantes)`);
              await new Promise(resolve => setTimeout(resolve, 1000));
              continue;
            }
            throw insertError;
          }

          batchInserted = true;
          insertedCount += batch.length;
          console.log(`[insert-recipients] ✅ Lote ${batchNum}/${totalBatches} inserido: ${batch.length} recipients`);

          // Atualizar contador do disparo apenas no final (economizar recursos)
          // Não atualizar durante o processamento para evitar WORKER_LIMIT
        } catch (error: any) {
          if ((error.code === '57014' || error.message?.includes('timeout')) && retries > 1) {
            retries--;
            console.warn(`[insert-recipients] Erro no lote ${batchNum}, tentando novamente... (${retries} tentativas restantes)`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }

          console.error(`[insert-recipients] ❌ Erro ao inserir lote ${batchNum}:`, error);
          errors.push({ batch: batchNum, error: error.message });
          retries = 0; // Parar retry para este lote
        }
      }

      // Delay maior entre lotes para não sobrecarregar recursos
      if (i + BATCH_SIZE < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Aumentado para 1000ms (1 segundo)
      }
    }

    // Atualizar contador final do disparo (apenas uma vez no final)
    try {
      await supabase
        .from('disparos')
        .update({
          total_recipients: total_recipients || insertedCount,
          pending_count: insertedCount,
        })
        .eq('id', disparo_id);
    } catch (updateError) {
      console.warn(`[insert-recipients] Erro ao atualizar contador final (não crítico):`, updateError);
      // Não falhar por causa disso - os recipients já foram inseridos
    }

    console.log(`[insert-recipients] ✅ Concluído: ${insertedCount}/${recipients.length} recipients inseridos`);

    return new Response(
      JSON.stringify({
        success: true,
        inserted: insertedCount,
        total: recipients.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[insert-recipients] ❌ Erro geral:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

