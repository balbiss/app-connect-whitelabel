/**
 * Edge Function para gerar Boleto via Asaas
 * Recebe: { api_key, amount, description, external_reference, customer_cpf_cnpj (opcional), due_date }
 * Retorna: { boleto_url, boleto_pdf_url, barcode, payment_id }
 * 
 * Documentação: https://docs.asaas.com/docs/cobrancas-via-boleto
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const ASAAS_API_URL = 'https://api.asaas.com/v3';

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
    const { api_key, amount, description, external_reference, customer_cpf_cnpj, customer_name, customer_email, due_date } = await req.json();

    if (!api_key || !amount || !description) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'api_key, amount e description são obrigatórios' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log('Gerando Boleto via Asaas...');
    console.log('Valor:', amount);
    console.log('Descrição:', description);
    console.log('Data de vencimento:', due_date);

    // 1. Criar ou buscar cliente (se tiver CPF/CNPJ)
    let customerId = null;
    
    if (customer_cpf_cnpj && customer_name) {
      try {
        // Buscar cliente existente por CPF/CNPJ
        const searchResponse = await fetch(`${ASAAS_API_URL}/customers?cpfCnpj=${customer_cpf_cnpj}`, {
          method: 'GET',
          headers: {
            'access_token': api_key,
            'Content-Type': 'application/json',
          },
        });

        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          if (searchData.data && searchData.data.length > 0) {
            customerId = searchData.data[0].id;
            console.log('Cliente encontrado:', customerId);
          }
        }

        // Se não encontrou, criar novo cliente
        if (!customerId) {
          const createCustomerResponse = await fetch(`${ASAAS_API_URL}/customers`, {
            method: 'POST',
            headers: {
              'access_token': api_key,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: customer_name,
              cpfCnpj: customer_cpf_cnpj.replace(/\D/g, ''), // Remove formatação
              email: customer_email || undefined,
            }),
          });

          if (createCustomerResponse.ok) {
            const customerData = await createCustomerResponse.json();
            customerId = customerData.id;
            console.log('Cliente criado:', customerId);
          }
        }
      } catch (customerError) {
        console.error('Erro ao criar/buscar cliente:', customerError);
        // Continua sem cliente se der erro
      }
    }

    // 2. Criar cobrança Boleto
    const paymentData: any = {
      billingType: 'BOLETO',
      value: parseFloat(amount).toFixed(2),
      description: description,
      dueDate: due_date || new Date().toISOString().split('T')[0], // Data de vencimento no formato YYYY-MM-DD
    };

    if (external_reference) {
      paymentData.externalReference = external_reference;
    }

    if (customerId) {
      paymentData.customer = customerId;
    }

    console.log('Criando cobrança Boleto:', JSON.stringify(paymentData));

    const paymentResponse = await fetch(`${ASAAS_API_URL}/payments`, {
      method: 'POST',
      headers: {
        'access_token': api_key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentData),
    });

    if (!paymentResponse.ok) {
      const errorData = await paymentResponse.json().catch(() => ({}));
      console.error('Erro ao criar cobrança no Asaas:', errorData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erro ao criar boleto no Asaas',
          details: errorData 
        }),
        { status: paymentResponse.status, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const paymentResult = await paymentResponse.json();
    console.log('Boleto criado:', paymentResult.id);

    // 3. Buscar dados do boleto
    const boletoUrl = paymentResult.bankSlipUrl; // URL do boleto
    const barcode = paymentResult.barCode; // Código de barras
    const paymentId = paymentResult.id;

    return new Response(
      JSON.stringify({
        success: true,
        payment_id: paymentId,
        boleto_url: boletoUrl,
        boleto_pdf_url: boletoUrl, // URL do PDF do boleto
        barcode: barcode, // Código de barras para pagamento
        payment_status: paymentResult.status,
        payment_info: paymentResult,
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
