/**
 * Edge Function para consultar status de transação Sync Pay
 * Recebe: { access_token, transaction_id }
 * Retorna: { transaction_id, status, amount, description, etc }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SYNC_PAY_API_URL = 'https://api.syncpayments.com.br';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    let access_token: string;
    let transaction_id: string;

    if (req.method === 'GET') {
      const url = new URL(req.url);
      access_token = url.searchParams.get('access_token') || '';
      transaction_id = url.searchParams.get('transaction_id') || '';
    } else {
      const body = await req.json();
      access_token = body.access_token;
      transaction_id = body.transaction_id;
    }

    if (!access_token || !transaction_id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'access_token e transaction_id são obrigatórios' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Consultar transação no Sync Pay
    const response = await fetch(`${SYNC_PAY_API_URL}/api/partner/v1/transactions/${transaction_id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${access_token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Erro ao consultar transação:', errorData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erro ao consultar transação',
          details: errorData
        }),
        { status: response.status, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const transactionData = await response.json();

    // Atualizar transação no banco de dados se existir
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { error: updateError } = await supabaseClient
      .from('syncpay_transactions')
      .update({
        status: transactionData.status || 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('transaction_id', transaction_id);

    if (updateError) {
      console.error('Erro ao atualizar transação no banco:', updateError);
      // Não falhar a requisição se houver erro ao atualizar
    }

    return new Response(
      JSON.stringify({
        success: true,
        ...transactionData,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (error) {
    console.error('Erro ao consultar transação:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Erro interno ao consultar transação',
        details: error.message 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});

