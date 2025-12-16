/**
 * Edge Function para testar ativação de assinatura sem pagar
 * Use esta função para simular um pagamento e ativar a conta de teste
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    // Verificar método
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { user_id, plan = 'pro' } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id é obrigatório' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Buscar perfil do usuário
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user_id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Usuário não encontrado' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Dados de teste
    const testData = {
      customer_id: `test_customer_${Date.now()}`,
      subscription_id: `test_subscription_${Date.now()}`,
      payment_id: `test_payment_${Date.now()}`,
      amount: plan === 'pro' ? 64.90 : 99.90,
      plan: plan,
    };

    // Registrar pagamento de teste
    const { error: paymentError } = await supabase.from('pagamentos').insert({
      user_id: profile.id,
      cakto_payment_id: testData.payment_id,
      cakto_subscription_id: testData.subscription_id,
      cakto_customer_id: testData.customer_id,
      amount: testData.amount,
      plan: testData.plan,
      status: 'paid',
      paid_at: new Date().toISOString(),
    });

    if (paymentError) {
      console.error('Erro ao registrar pagamento:', paymentError);
    }

    // Atualizar perfil
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        subscription_status: 'active',
        cakto_subscription_id: testData.subscription_id,
        cakto_customer_id: testData.customer_id,
        plan: testData.plan,
        max_connections: plan === 'pro' ? 2 : 4,
      })
      .eq('id', profile.id);

    if (updateError) {
      console.error('Erro ao atualizar perfil:', updateError);
      return new Response(
        JSON.stringify({
          success: false,
          error: updateError.message,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Assinatura de teste ativada com sucesso!',
        data: {
          user_id: profile.id,
          plan: testData.plan,
          subscription_status: 'active',
          test_data: testData,
        },
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Erro na função de teste:', error);
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




