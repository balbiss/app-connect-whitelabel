/**
 * Edge Function para criar Pix CashIn (pagamento) via Sync Pay
 * Recebe: { access_token, amount, description, external_reference }
 * Retorna: { transaction_id, qr_code, qr_code_base64, copy_paste, status }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SYNC_PAY_API_URL = 'https://api.syncpayments.com.br';

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
    const { access_token, amount, description, external_reference, user_id, plan_id } = await req.json();

    if (!access_token || !amount || !description) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'access_token, amount e description são obrigatórios' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Obter URL do webhook do Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const webhookUrl = supabaseUrl ? `${supabaseUrl}/functions/v1/syncpay-webhook` : null;

    // Criar Pix CashIn no Sync Pay (estrutura correta conforme documentação)
    const pixData: any = {
      amount: parseFloat(amount),
      description: description || `Assinatura ${plan_id || 'plano'}`,
    };

    // Adicionar webhook URL se disponível
    if (webhookUrl) {
      pixData.webhook_url = webhookUrl;
    }

    // Adicionar external_reference como metadata no webhook (não é campo direto da API)
    // O external_reference será usado apenas para salvar no banco

    console.log('Criando Pix CashIn no Sync Pay:', pixData);
    console.log('URL da API:', `${SYNC_PAY_API_URL}/api/partner/v1/cash-in`);
    console.log('Access Token (primeiros 20 chars):', access_token ? access_token.substring(0, 20) + '...' : 'VAZIO');

    const response = await fetch(`${SYNC_PAY_API_URL}/api/partner/v1/cash-in`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${access_token}`,
      },
      body: JSON.stringify(pixData),
    });

    console.log('Status da resposta:', response.status);
    console.log('Headers da resposta:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Erro ao criar Pix CashIn:', errorData);
      
      // Se retornar HTML, provavelmente é um erro 404 ou URL incorreta
      if (errorData.includes('<!DOCTYPE') || errorData.includes('<html')) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Endpoint do Sync Pay não encontrado. Verifique a URL da API.',
            details: `Status: ${response.status}. A API retornou HTML ao invés de JSON. Verifique se o endpoint está correto.`
          }),
          { status: response.status, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erro ao criar pagamento PIX',
          details: errorData.substring(0, 500) // Limitar tamanho do erro
        }),
        { status: response.status, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const paymentData = await response.json();
    console.log('Pix CashIn criado com sucesso:', paymentData);

    // A API retorna: { message, pix_code, identifier }
    // pix_code é o código PIX completo (serve como copia e cola e QRCode)
    const pixCode = paymentData.pix_code || null;
    const transactionId = paymentData.identifier || null;

    // Gerar QR Code base64 a partir do pix_code
    let qrCodeBase64 = null;
    if (pixCode) {
      try {
        // Usar serviço externo para gerar QR Code
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pixCode)}`;
        const qrResponse = await fetch(qrCodeUrl);
        if (qrResponse.ok) {
          const qrBlob = await qrResponse.blob();
          const qrArrayBuffer = await qrBlob.arrayBuffer();
          const qrBase64 = btoa(String.fromCharCode(...new Uint8Array(qrArrayBuffer)));
          qrCodeBase64 = `data:image/png;base64,${qrBase64}`;
        }
      } catch (qrError) {
        console.error('Erro ao gerar QR Code:', qrError);
      }
    }

    // Salvar transação no banco de dados se user_id foi fornecido
    if (user_id) {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const { error: dbError } = await supabaseClient
        .from('syncpay_transactions')
        .insert({
          user_id: user_id,
          plan_id: plan_id || null,
          transaction_id: transactionId,
          external_reference: external_reference || `subscription_${user_id}_${plan_id}_${Date.now()}`,
          amount: parseFloat(amount),
          description: description,
          status: 'pending', // Status inicial sempre é pending
          qr_code: pixCode,
          qr_code_base64: qrCodeBase64,
          copy_paste: pixCode, // pix_code serve como copy_paste
          raw_response: paymentData,
        });

      if (dbError) {
        console.error('Erro ao salvar transação no banco:', dbError);
        // Não falhar a requisição se houver erro ao salvar no banco
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        transaction_id: transactionId,
        qr_code: pixCode,
        qr_code_base64: qrCodeBase64,
        copy_paste: pixCode,
        status: 'pending',
        payment_data: paymentData,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (error) {
    console.error('Erro ao criar Pix CashIn:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Erro interno ao criar pagamento PIX',
        details: error.message 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});

