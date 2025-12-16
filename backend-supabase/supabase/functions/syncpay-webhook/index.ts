/**
 * Edge Function para receber webhooks do Sync Pay
 * Processa eventos de CashIn (onCreate, onUpdate)
 * Atualiza status de transação e ativa assinatura quando pago
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const webhookData = await req.json();
    console.log('Webhook Sync Pay recebido:', JSON.stringify(webhookData, null, 2));

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Identificar tipo de evento
    const eventType = webhookData.type || webhookData.event || 'unknown';
    const transactionData = webhookData.data || webhookData;

    const transactionId = transactionData.transaction_id || transactionData.id;
    const status = transactionData.status;
    const externalReference = transactionData.external_reference;
    const metadata = transactionData.metadata || {};

    if (!transactionId) {
      console.error('Transaction ID não encontrado no webhook');
      return new Response(
        JSON.stringify({ success: false, error: 'Transaction ID não encontrado' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Atualizar transação no banco
    const { data: transaction, error: updateError } = await supabaseClient
      .from('syncpay_transactions')
      .update({
        status: status,
        updated_at: new Date().toISOString(),
        raw_webhook: webhookData,
      })
      .eq('transaction_id', transactionId)
      .select()
      .single();

    if (updateError && updateError.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Erro ao atualizar transação:', updateError);
    }

    // Se o pagamento foi aprovado, ativar assinatura
    if (status === 'paid' || status === 'approved' || status === 'completed') {
      const userId = metadata.user_id || transaction?.user_id;
      const planId = metadata.plan_id || transaction?.plan_id;

      if (userId && planId) {
        console.log(`Ativando assinatura para usuário ${userId}, plano ${planId}`);

        // Buscar informações do plano
        const { data: plan, error: planError } = await supabaseClient
          .from('plans_config')
          .select('*')
          .eq('id', planId)
          .single();

        if (planError || !plan) {
          console.error('Erro ao buscar plano:', planError);
        } else {
          // Calcular data de expiração (30 dias a partir de agora)
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 30);

          // Atualizar perfil do usuário
          const { error: profileError } = await supabaseClient
            .from('profiles')
            .update({
              plan: planId,
              subscription_status: 'active',
              subscription_expires_at: expiresAt.toISOString(),
              max_connections: plan.max_connections,
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId);

          if (profileError) {
            console.error('Erro ao atualizar perfil:', profileError);
          } else {
            console.log(`✅ Assinatura ativada com sucesso para usuário ${userId}`);

            // Criar notificação para o usuário
            await supabaseClient
              .from('notifications')
              .insert({
                user_id: userId,
                type: 'subscription_activated',
                title: 'Assinatura Ativada',
                message: `Sua assinatura do plano ${plan.name} foi ativada com sucesso!`,
                read: false,
              });
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook processado com sucesso',
        event_type: eventType,
        transaction_id: transactionId,
        status: status
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (error) {
    console.error('Erro ao processar webhook Sync Pay:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Erro interno ao processar webhook',
        details: error.message 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});




