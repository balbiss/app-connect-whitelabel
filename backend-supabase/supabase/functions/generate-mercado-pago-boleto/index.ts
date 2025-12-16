/**
 * Edge Function para gerar Boleto via Mercado Pago
 * Recebe: { api_key, amount, description, external_reference, due_date }
 * Retorna: { boleto_url, boleto_pdf_url, barcode, payment_id }
 * 
 * Documentação: https://www.mercadopago.com.br/developers/pt/docs/checkout-api/integration-configuration/collection-by-bank-transfer
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const MERCADO_PAGO_API_URL = 'https://api.mercadopago.com';

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
    const { api_key, amount, description, external_reference, due_date } = await req.json();

    if (!api_key || !amount || !description) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'api_key, amount e description são obrigatórios' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log('Gerando Boleto via Mercado Pago...');
    console.log('Valor:', amount);
    console.log('Descrição:', description);
    console.log('Data de vencimento:', due_date);

    // Criar pagamento Boleto no Mercado Pago
    const paymentData: any = {
      transaction_amount: parseFloat(amount),
      description: description,
      payment_method_id: 'bolbradesco', // Boleto Bradesco (pode ser configurado)
      payer: {
        email: 'payer@example.com', // Email não é obrigatório para boleto, mas a API pode exigir
      },
      external_reference: external_reference || `billing_${Date.now()}`,
    };

    // Adicionar data de vencimento se fornecida
    if (due_date) {
      paymentData.date_of_expiration = due_date; // Formato: YYYY-MM-DDTHH:mm:ss.sssZ
    }

    const response = await fetch(`${MERCADO_PAGO_API_URL}/v1/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${api_key}`,
        'X-Idempotency-Key': external_reference || `billing_${Date.now()}`,
      },
      body: JSON.stringify(paymentData),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Erro ao criar boleto no Mercado Pago:', result);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: result.message || 'Erro ao gerar boleto no Mercado Pago',
          details: result 
        }),
        { status: response.status, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Buscar dados do boleto
    const paymentId = result.id;
    
    // Buscar informações adicionais do pagamento
    const paymentInfoResponse = await fetch(`${MERCADO_PAGO_API_URL}/v1/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${api_key}`,
      },
    });

    const paymentInfo = await paymentInfoResponse.json();

    // Extrair dados do boleto
    const boletoData = paymentInfo.transaction_details;
    const boletoUrl = paymentInfo.point_of_interaction?.transaction_data?.ticket_url;
    const barcode = paymentInfo.transaction_details?.external_resource_url;

    return new Response(
      JSON.stringify({
        success: true,
        payment_id: paymentId.toString(),
        boleto_url: boletoUrl,
        boleto_pdf_url: boletoUrl, // URL do PDF do boleto
        barcode: barcode || paymentInfo.transaction_details?.external_resource_url,
        payment_status: paymentInfo.status,
        payment_info: paymentInfo,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (error) {
    console.error('Erro na função:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});
