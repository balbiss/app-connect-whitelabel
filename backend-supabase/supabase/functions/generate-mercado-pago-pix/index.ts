/**
 * Edge Function para gerar PIX via Mercado Pago
 * Recebe: { api_key, amount, description, external_reference }
 * Retorna: { qr_code, qr_code_base64, copy_paste, payment_id }
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
    const { api_key, amount, description, external_reference } = await req.json();

    if (!api_key || !amount || !description) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'api_key, amount e description são obrigatórios' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Obter URL do webhook do Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const webhookUrl = supabaseUrl ? `${supabaseUrl}/functions/v1/webhook-mercado-pago` : null;

    // Criar pagamento PIX no Mercado Pago
    const paymentData: any = {
      transaction_amount: parseFloat(amount),
      description: description,
      payment_method_id: 'pix',
      payer: {
        email: 'payer@example.com', // Email não é obrigatório para PIX, mas a API pode exigir
      },
      external_reference: external_reference || `billing_${Date.now()}`,
    };

    // Adicionar webhook URL se disponível
    if (webhookUrl) {
      paymentData.notification_url = webhookUrl;
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
      console.error('Erro ao criar pagamento no Mercado Pago:', result);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: result.message || 'Erro ao gerar PIX no Mercado Pago',
          details: result 
        }),
        { status: response.status, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Buscar dados do PIX (QR Code e chave copia e cola)
    const paymentId = result.id;
    
    // Função para buscar dados do PIX com retry
    const fetchPaymentInfo = async (maxRetries = 5, delay = 2000): Promise<any> => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        console.log(`Tentativa ${attempt}/${maxRetries} de buscar dados do PIX...`);
        
        // Aguardar antes de tentar (exceto na primeira tentativa)
        if (attempt > 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        const paymentInfoResponse = await fetch(`${MERCADO_PAGO_API_URL}/v1/payments/${paymentId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${api_key}`,
          },
        });

        if (!paymentInfoResponse.ok) {
          console.error(`Erro ao buscar pagamento (tentativa ${attempt}):`, paymentInfoResponse.status);
          if (attempt === maxRetries) {
            throw new Error(`Erro ao buscar informações do pagamento: ${paymentInfoResponse.status}`);
          }
          continue;
        }

        const paymentInfo = await paymentInfoResponse.json();
        console.log(`Tentativa ${attempt}: Status do pagamento:`, paymentInfo.status);

        // Verificar se o pagamento tem dados do PIX
        const pointOfInteraction = paymentInfo.point_of_interaction;
        const transactionData = pointOfInteraction?.transaction_data;
        
        // Verificar se temos os dados necessários
        const hasQrCode = transactionData?.qr_code || transactionData?.qr_code_base64;
        const hasCopyPaste = transactionData?.qr_code || transactionData?.ticket_url;
        
        if (hasQrCode || hasCopyPaste) {
          console.log(`✅ Dados do PIX encontrados na tentativa ${attempt}!`);
          return paymentInfo;
        }

        // Se não encontrou e não é a última tentativa, continuar
        if (attempt < maxRetries) {
          console.log(`⚠️ Dados do PIX ainda não disponíveis, tentando novamente...`);
          continue;
        }
        
        // Última tentativa - retornar mesmo sem dados completos
        console.warn('⚠️ Dados do PIX podem estar incompletos na última tentativa');
        return paymentInfo;
      }
      
      throw new Error('Não foi possível obter dados do PIX após múltiplas tentativas');
    };

    // Buscar informações do pagamento com retry
    const paymentInfo = await fetchPaymentInfo();
    console.log('Payment Info completo:', JSON.stringify(paymentInfo, null, 2));

    // Extrair dados do PIX - estrutura pode variar
    const pointOfInteraction = paymentInfo.point_of_interaction;
    const transactionData = pointOfInteraction?.transaction_data;
    
    // Tentar diferentes caminhos para encontrar os dados
    // O QR code pode estar em diferentes lugares na resposta
    let qrCode = transactionData?.qr_code;
    let qrCodeBase64 = transactionData?.qr_code_base64;
    let copyPaste = transactionData?.qr_code || transactionData?.ticket_url;
    
    // Se não encontrou, tentar outros caminhos
    if (!qrCode || !copyPaste) {
      // Tentar acessar diretamente
      qrCode = paymentInfo.point_of_interaction?.transaction_data?.qr_code;
      qrCodeBase64 = paymentInfo.point_of_interaction?.transaction_data?.qr_code_base64;
      copyPaste = paymentInfo.point_of_interaction?.transaction_data?.qr_code || 
                  paymentInfo.point_of_interaction?.transaction_data?.ticket_url;
    }
    
    console.log('Dados extraídos:', {
      qrCode: qrCode ? 'Presente' : 'Ausente',
      qrCodeBase64: qrCodeBase64 ? 'Presente' : 'Ausente',
      copyPaste: copyPaste ? 'Presente' : 'Ausente',
      transactionDataKeys: transactionData ? Object.keys(transactionData) : 'N/A',
      pointOfInteractionKeys: pointOfInteraction ? Object.keys(pointOfInteraction) : 'N/A'
    });
    
    // Se não tiver QR Code base64, tentar gerar a partir do QR Code string ou copy_paste
    let finalQrCodeBase64 = qrCodeBase64;
    
    // Se o qrCodeBase64 já estiver em formato data:image, usar diretamente
    if (finalQrCodeBase64 && !finalQrCodeBase64.startsWith('data:image')) {
      // Se não tiver o prefixo, adicionar
      if (finalQrCodeBase64.length > 100) {
        // Provavelmente é base64 puro
        finalQrCodeBase64 = `data:image/png;base64,${finalQrCodeBase64}`;
      }
    }
    
    // Se ainda não tiver QR code base64, gerar a partir do copy_paste ou qrCode
    if (!finalQrCodeBase64 && (copyPaste || qrCode)) {
      try {
        const pixKey = copyPaste || qrCode;
        // Gerar QR Code a partir da chave PIX usando API pública
        const qrCodeApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pixKey)}`;
        
        // Baixar a imagem e converter para base64
        const qrImageResponse = await fetch(qrCodeApiUrl);
        if (qrImageResponse.ok) {
          const qrImageBlob = await qrImageResponse.blob();
          const qrImageArrayBuffer = await qrImageBlob.arrayBuffer();
          const qrImageBase64 = btoa(String.fromCharCode(...new Uint8Array(qrImageArrayBuffer)));
          finalQrCodeBase64 = `data:image/png;base64,${qrImageBase64}`;
          console.log('QR Code gerado com sucesso a partir da chave PIX');
        } else {
          // Fallback: retornar URL da API
          finalQrCodeBase64 = qrCodeApiUrl;
          console.log('Usando URL do QR Code como fallback');
        }
      } catch (error) {
        console.error('Erro ao gerar QR Code:', error);
        finalQrCodeBase64 = null;
      }
    }
    
    // Garantir que temos o copy_paste (chave PIX)
    if (!copyPaste && qrCode) {
      copyPaste = qrCode;
    }
    
    if (!copyPaste) {
      console.error('ERRO: Não foi possível extrair a chave PIX (copy_paste)');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Não foi possível extrair a chave PIX do pagamento',
          payment_info: paymentInfo
        }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        payment_id: paymentId.toString(),
        qr_code: qrCode || copyPaste,
        qr_code_base64: finalQrCodeBase64,
        copy_paste: copyPaste, // Chave PIX (token) - obrigatório
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

