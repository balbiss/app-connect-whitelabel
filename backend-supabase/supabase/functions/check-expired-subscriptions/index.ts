/**
 * Edge Function para verificar assinaturas expiradas
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

    // Buscar assinaturas expiradas ou com status past_due
    const now = new Date().toISOString();
    
    const { data: expiredProfiles, error } = await supabase
      .from('profiles')
      .select('*')
      .or(`subscription_ends_at.lt.${now},subscription_status.eq.past_due`)
      .eq('subscription_status', 'active');

    if (error) throw error;

    if (!expiredProfiles || expiredProfiles.length === 0) {
      return new Response(JSON.stringify({ message: 'Nenhuma assinatura expirada' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Atualizar status das assinaturas expiradas
    for (const profile of expiredProfiles) {
      // Verificar se realmente expirou
      if (profile.subscription_ends_at && new Date(profile.subscription_ends_at) < new Date()) {
        await supabase
          .from('profiles')
          .update({
            subscription_status: 'canceled',
          })
          .eq('id', profile.id);

        // Opcional: Desconectar instâncias se necessário
        // await supabase
        //   .from('connections')
        //   .update({ status: 'disconnected' })
        //   .eq('user_id', profile.id);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: expiredProfiles.length,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Erro ao verificar assinaturas:', error);
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





