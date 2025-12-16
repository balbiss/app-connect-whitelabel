/**
 * Edge Function para gerar PIX para pagamento antecipado de agendamento
 * Recebe: { booking_id, user_id }
 * Retorna: { qr_code, qr_code_base64, copy_paste, payment_id }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase credentials');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { booking_id, user_id } = await req.json();

    if (!booking_id || !user_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'booking_id e user_id são obrigatórios' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Buscar agendamento
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        services (*)
      `)
      .eq('id', booking_id)
      .eq('user_id', user_id)
      .single();

    if (bookingError || !booking) {
      return new Response(
        JSON.stringify({ success: false, error: 'Agendamento não encontrado' }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Buscar provedor de pagamento padrão do usuário
    const { data: provider, error: providerError } = await supabase
      .from('payment_providers')
      .select('*')
      .eq('user_id', user_id)
      .eq('is_active', true)
      .eq('is_default', true)
      .single();

    if (providerError || !provider) {
      return new Response(
        JSON.stringify({ success: false, error: 'Nenhum provedor de pagamento configurado' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Gerar PIX via provedor
    let functionName: string;
    let requestBody: any;

    if (provider.provider === 'asaas') {
      functionName = 'generate-asaas-payment';
      requestBody = {
        api_key: provider.api_key,
        amount: booking.advance_payment.toString(),
        description: `Agendamento: ${booking.services?.name || 'Serviço'} - ${booking.client_name}`,
        external_reference: `booking_${booking.id}`,
        payment_type: 'pix',
      };
    } else if (provider.provider === 'mercado_pago') {
      functionName = 'generate-mercado-pago-pix';
      requestBody = {
        api_key: provider.api_key,
        amount: booking.advance_payment.toString(),
        description: `Agendamento: ${booking.services?.name || 'Serviço'} - ${booking.client_name}`,
        external_reference: `booking_${booking.id}`,
      };
    } else {
      return new Response(
        JSON.stringify({ success: false, error: 'Provedor de pagamento não suportado' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Chamar função de geração de PIX
    const pixResponse = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!pixResponse.ok) {
      const errorText = await pixResponse.text();
      return new Response(
        JSON.stringify({ success: false, error: `Erro ao gerar PIX: ${errorText}` }),
        { status: pixResponse.status, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const pixResult = await pixResponse.json();

    if (!pixResult.success) {
      return new Response(
        JSON.stringify({ success: false, error: pixResult.error || 'Erro ao gerar PIX' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Atualizar agendamento com dados do PIX
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        advance_payment_provider: provider.provider,
        advance_payment_id: pixResult.payment_id,
        pix_qr_code: pixResult.qr_code_base64 || pixResult.qr_code,
        pix_copy_paste: pixResult.copy_paste,
        updated_at: new Date().toISOString(),
      })
      .eq('id', booking_id);

    if (updateError) {
      console.error('Erro ao atualizar agendamento:', updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        qr_code: pixResult.qr_code_base64 || pixResult.qr_code,
        qr_code_base64: pixResult.qr_code_base64 || pixResult.qr_code,
        copy_paste: pixResult.copy_paste,
        payment_id: pixResult.payment_id,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (error) {
    console.error('Erro na função:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : 'N/A'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});

