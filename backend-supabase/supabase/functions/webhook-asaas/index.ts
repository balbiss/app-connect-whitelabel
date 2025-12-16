/**
 * Edge Function para receber webhooks do Asaas
 * Notifica quando um pagamento PIX ou Boleto é confirmado
 * 
 * URL do webhook: https://[SEU_PROJETO].supabase.co/functions/v1/webhook-asaas
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

    // Asaas envia dados no body
    const webhookData = await req.json();
    console.log('Webhook Asaas recebido:', JSON.stringify(webhookData));

    // Asaas envia: { event: 'PAYMENT_RECEIVED', payment: { id: '...', status: '...', ... } }
    const event = webhookData.event;
    const payment = webhookData.payment;

    if (!event || !payment) {
      console.log('Webhook sem event ou payment, ignorando...');
      return new Response(
        JSON.stringify({ success: true, message: 'Webhook recebido mas sem dados válidos' }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const paymentId = payment.id;
    const paymentStatus = payment.status; // 'RECEIVED', 'PENDING', 'OVERDUE', etc.

    console.log('Evento:', event);
    console.log('Payment ID:', paymentId);
    console.log('Status:', paymentStatus);

    // Buscar cobrança ou agendamento pelo payment_provider_id
    let billing = null;
    let booking = null;
    
    // Tentar buscar como cobrança
    const { data: billingData, error: billingError } = await supabase
      .from('billings')
      .select(`
        *,
        profiles!inner (
          id,
          email,
          full_name
        )
      `)
      .eq('payment_provider_id', paymentId)
      .eq('payment_provider', 'asaas')
      .single();

    if (!billingError && billingData) {
      billing = billingData;
    } else {
      // Tentar buscar como agendamento
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select(`
          *,
          profiles!inner (
            id,
            email,
            full_name
          )
        `)
        .eq('advance_payment_id', paymentId)
        .eq('advance_payment_provider', 'asaas')
        .single();

      if (!bookingError && bookingData) {
        booking = bookingData;
      }
    }

    if (!billing && !booking) {
      console.log('Cobrança ou agendamento não encontrado para payment_id:', paymentId);
      return new Response(
        JSON.stringify({ success: true, message: 'Registro não encontrado' }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const record = billing || booking;
    const recordType = billing ? 'billing' : 'booking';

    if (!record) {
      return new Response(
        JSON.stringify({ success: true, message: 'Registro não encontrado' }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Processar diferentes eventos do Asaas
    if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
      // Pagamento confirmado
      if (recordType === 'billing') {
        const { error: updateError } = await supabase
          .from('billings')
          .update({
            status: 'paid',
            updated_at: new Date().toISOString(),
          })
          .eq('id', record.id);

        if (updateError) {
          console.error('Erro ao atualizar cobrança:', updateError);
          throw updateError;
        }

        // Criar notificação para o usuário
        const paymentTypeName = (record as any).payment_type === 'boleto' ? 'Boleto' : 'PIX';
        await supabase
          .from('notifications')
          .insert({
            user_id: record.user_id,
            type: 'success',
            title: 'Pagamento Confirmado! 💰',
            message: `A cobrança de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((record as any).amount)} para ${(record as any).client_name} foi confirmada via Asaas (${paymentTypeName}).`,
            reference_type: 'billing',
            reference_id: record.id,
          });

        console.log('✅ Pagamento confirmado e notificação criada para cobrança:', record.id);
      } else if (recordType === 'booking') {
        // Atualizar agendamento
        const { error: updateError } = await supabase
          .from('bookings')
          .update({
            advance_payment_status: 'paid',
            status: 'confirmed',
            confirmed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', record.id);

        if (updateError) {
          console.error('Erro ao atualizar agendamento:', updateError);
          throw updateError;
        }

        // Criar notificação para o usuário
        await supabase
          .from('notifications')
          .insert({
            user_id: record.user_id,
            type: 'success',
            title: 'Agendamento Confirmado! 📅',
            message: `O pagamento antecipado do agendamento de ${(record as any).client_name} foi confirmado via Asaas.`,
            reference_type: 'booking',
            reference_id: record.id,
          });

        console.log('✅ Pagamento confirmado e agendamento atualizado:', record.id);
      }
    } else if (event === 'PAYMENT_OVERDUE') {
      // Pagamento vencido (apenas para cobranças)
      if (recordType === 'billing') {
        await supabase
          .from('billings')
          .update({
            status: 'overdue',
            updated_at: new Date().toISOString(),
          })
          .eq('id', record.id);

        await supabase
          .from('notifications')
          .insert({
            user_id: record.user_id,
            type: 'warning',
            title: 'Cobrança Vencida ⚠️',
            message: `A cobrança de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((record as any).amount)} para ${(record as any).client_name} está vencida.`,
            reference_type: 'billing',
            reference_id: record.id,
          });
      }
    } else if (event === 'PAYMENT_DELETED' || event === 'PAYMENT_REFUNDED') {
      // Pagamento cancelado/reembolsado
      if (recordType === 'billing') {
        await supabase
          .from('billings')
          .update({
            status: 'cancelled',
            updated_at: new Date().toISOString(),
          })
          .eq('id', record.id);
      } else if (recordType === 'booking') {
        await supabase
          .from('bookings')
          .update({
            advance_payment_status: 'refunded',
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', record.id);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook processado com sucesso',
        event: event,
        payment_status: paymentStatus,
        record_type: recordType,
        record_id: record.id
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (error) {
    console.error('Erro ao processar webhook:', error);
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

