/**
 * Edge Function para ativar assinatura manualmente
 * Use quando o webhook não funcionar ou para testes
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: corsHeaders,
      });
    }

    const { user_id, email, plan = 'pro' } = await req.json();

    if (!user_id && !email) {
      return new Response(
        JSON.stringify({ error: 'user_id ou email é obrigatório' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Buscar perfil
    let profile = null;
    
    if (user_id) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user_id)
        .single();
      
      if (error) {
        return new Response(
          JSON.stringify({ error: 'Usuário não encontrado', details: error.message }),
          { status: 404, headers: corsHeaders }
        );
      }
      profile = data;
    } else if (email) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .single();
      
      if (error) {
        return new Response(
          JSON.stringify({ error: 'Usuário não encontrado', details: error.message }),
          { status: 404, headers: corsHeaders }
        );
      }
      profile = data;
    }

    if (!profile) {
      return new Response(
        JSON.stringify({ error: 'Perfil não encontrado' }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Atualizar perfil
    const maxConnections = plan === 'pro' ? 2 : plan === 'super_pro' ? 4 : 0;
    
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        subscription_status: 'active',
        plan: plan,
        max_connections: maxConnections,
      })
      .eq('id', profile.id);

    if (updateError) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erro ao atualizar perfil', 
          details: updateError.message 
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Registrar pagamento manual (opcional)
    await supabase.from('pagamentos').insert({
      user_id: profile.id,
      cakto_payment_id: `manual_${Date.now()}`,
      cakto_subscription_id: `manual_sub_${Date.now()}`,
      amount: plan === 'pro' ? 64.90 : 99.90,
      plan: plan,
      status: 'paid',
      paid_at: new Date().toISOString(),
    });

    // Enviar email de confirmação
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
      const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-subscription-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''}`,
        },
        body: JSON.stringify({
          user_id: profile.id,
          email: profile.email,
          name: profile.name || 'Usuário',
          plan: plan,
          expires_at: null,
        }),
      });

      if (emailResponse.ok) {
        console.log('✅ Email de confirmação enviado');
      } else {
        console.warn('⚠️ Erro ao enviar email:', await emailResponse.text());
      }
    } catch (emailError) {
      console.error('Erro ao enviar email de confirmação:', emailError);
      // Não falhar a ativação se o email falhar
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Assinatura ativada com sucesso!',
        user: {
          id: profile.id,
          email: profile.email,
          plan: plan,
          subscription_status: 'active',
          max_connections: maxConnections,
        },
      }),
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('Erro na ativação manual:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});

