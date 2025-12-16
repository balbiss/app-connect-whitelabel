/**
 * Edge Function para receber webhooks do Mercado Pago
 * Notifica quando um pagamento PIX é confirmado
 * 
 * URL do webhook: https://[SEU_PROJETO].supabase.co/functions/v1/webhook-mercado-pago
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

    // Mercado Pago envia dados no body
    const webhookData = await req.json();
    console.log('Webhook Mercado Pago recebido:', JSON.stringify(webhookData));

    // Mercado Pago pode enviar diferentes tipos de notificações
    // Para pagamentos, geralmente vem como { type: 'payment', data: { id: '...' } }
    const paymentId = webhookData.data?.id || webhookData.id;
    const action = webhookData.action || webhookData.type;

    if (!paymentId) {
      console.log('Webhook sem payment_id, ignorando...');
      return new Response(
        JSON.stringify({ success: true, message: 'Webhook recebido mas sem payment_id' }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Buscar cobrança, agendamento ou appointment pelo payment_provider_id
    let billing = null;
    let booking = null;
    let appointment = null;
    
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
      .eq('payment_provider_id', paymentId.toString())
      .eq('payment_provider', 'mercado_pago')
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
        .eq('advance_payment_id', paymentId.toString())
        .eq('advance_payment_provider', 'mercado_pago')
        .single();

      if (!bookingError && bookingData) {
        booking = bookingData;
      } else {
        // Tentar buscar como appointment (novo sistema)
        const { data: appointmentData, error: appointmentError } = await supabase
          .from('appointments')
          .select(`
            *,
            profiles!inner (
              id,
              email,
              full_name
            ),
            professional:professionals(*)
          `)
          .eq('payment_provider_id', paymentId.toString())
          .eq('payment_provider', 'mercado_pago')
          .single();

        if (!appointmentError && appointmentData) {
          appointment = appointmentData;
        }
      }
    }

    if (!billing && !booking && !appointment) {
      console.log('Cobrança, agendamento ou appointment não encontrado para payment_id:', paymentId);
      return new Response(
        JSON.stringify({ success: true, message: 'Registro não encontrado' }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const record = billing || booking || appointment;
    const recordType = billing ? 'billing' : (booking ? 'booking' : 'appointment');

    // Buscar informações atualizadas do pagamento no Mercado Pago
    // Para isso, precisamos da API key do usuário
    const userId = billing?.user_id || booking?.user_id || appointment?.user_id;
    const { data: provider } = await supabase
      .from('payment_providers')
      .select('api_key')
      .eq('user_id', userId)
      .eq('provider', 'mercado_pago')
      .eq('is_active', true)
      .single();

    if (!provider?.api_key) {
      console.error('API key do Mercado Pago não encontrada para o usuário');
      return new Response(
        JSON.stringify({ success: false, error: 'API key não encontrada' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Buscar status atual do pagamento no Mercado Pago
    try {
      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${provider.api_key}`,
        },
      });

      if (!mpResponse.ok) {
        throw new Error(`Mercado Pago API error: ${mpResponse.status}`);
      }

      const paymentInfo = await mpResponse.json();
      const paymentStatus = paymentInfo.status; // 'approved', 'pending', 'rejected', etc.

      console.log('Status do pagamento no Mercado Pago:', paymentStatus);

      // Atualizar status se foi aprovado
      if (paymentStatus === 'approved') {
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
          await supabase
            .from('notifications')
            .insert({
              user_id: record.user_id,
              type: 'success',
              title: 'Pagamento Confirmado! 💰',
              message: `A cobrança de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((record as any).amount)} para ${(record as any).client_name} foi confirmada via Mercado Pago.`,
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
              message: `O pagamento antecipado do agendamento de ${(record as any).client_name} foi confirmado via Mercado Pago.`,
              reference_type: 'booking',
              reference_id: record.id,
            });

          console.log('✅ Pagamento confirmado e agendamento atualizado:', record.id);
        } else if (recordType === 'appointment') {
          // Atualizar appointment
          const { error: updateError } = await supabase
            .from('appointments')
            .update({
              payment_status: 'partial',
              status: 'confirmed',
              confirmed_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', record.id);

          if (updateError) {
            console.error('Erro ao atualizar appointment:', updateError);
            throw updateError;
          }

          // Criar notificação para o usuário
          await supabase
            .from('notifications')
            .insert({
              user_id: record.user_id,
              type: 'success',
              title: 'Agendamento Confirmado! 📅',
              message: `O pagamento da entrada do agendamento de ${(record as any).client_name} foi confirmado via Mercado Pago.`,
              reference_type: 'appointment',
              reference_id: record.id,
            });

          // Notificar profissional via WhatsApp se houver
          if ((record as any).professional_id && (record as any).professional?.phone) {
            try {
              const { data: connections } = await supabase
                .from('connections')
                .select('api_instance_token, status')
                .eq('user_id', record.user_id)
                .eq('status', 'online')
                .limit(1)
                .single();

              if (connections?.api_instance_token) {
                const professionalPhone = (record as any).professional.phone.replace(/\D/g, '');
                const appointmentDateFormatted = new Date((record as any).appointment_date).toLocaleDateString('pt-BR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                });

                const professionalMessage = `💳 *Pagamento Parcial Recebido!*\n\n` +
                  `O cliente ${(record as any).client_name} pagou a entrada do agendamento:\n\n` +
                  `📅 *Data:* ${appointmentDateFormatted}\n` +
                  `🕐 *Horário:* ${(record as any).appointment_time}\n` +
                  `💰 *Valor Recebido:* ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((record as any).advance_payment_amount || 0)}\n\n` +
                  `Aguardando pagamento do restante no dia do atendimento. 🎯`;

                // Usar whatsapp-proxy para enviar mensagem
                const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
                await fetch(`${supabaseUrl}/functions/v1/whatsapp-proxy?path=/chat/send/text`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${supabaseServiceKey}`,
                    'Content-Type': 'application/json',
                    'x-auth-type': 'user',
                    'x-instance-token': connections.api_instance_token,
                  },
                  body: JSON.stringify({
                    Phone: `${professionalPhone}@s.whatsapp.net`,
                    Body: professionalMessage,
                  }),
                });
              }
            } catch (notifyError) {
              console.error('Erro ao notificar profissional:', notifyError);
            }
          }

          console.log('✅ Pagamento confirmado e appointment atualizado:', record.id);
        }
      } else if (paymentStatus === 'rejected' || paymentStatus === 'cancelled') {
        // Marcar como cancelada se foi rejeitado
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
        payment_status: paymentStatus,
        record_type: recordType,
        record_id: record.id
      }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    } catch (mpError) {
      console.error('Erro ao buscar informações do pagamento no Mercado Pago:', mpError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erro ao verificar status do pagamento',
          details: mpError instanceof Error ? mpError.message : 'Erro desconhecido'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
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

