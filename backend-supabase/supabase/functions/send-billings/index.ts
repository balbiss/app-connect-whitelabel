/**
 * Edge Function para enviar cobranças automaticamente
 * Executada diariamente às 08:00 (horário de Brasília) via pg_cron
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const WHATSAPP_API_URL = Deno.env.get('WHATSAPP_API_URL') || 'https://weeb.inoovaweb.com.br';
const WHATSAPP_API_KEY = Deno.env.get('WHATSAPP_API_KEY') || '';

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

    // Buscar cobranças pendentes com vencimento hoje
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    const { data: billings, error: billingError } = await supabase
      .from('billings')
      .select(`
        *,
        connections!inner (
          id,
          api_instance_token,
          name,
          status
        ),
        profiles!inner (
          id
        )
      `)
      .eq('status', 'pending')
      .eq('due_date', today)
      .or('last_sent_at.is.null,last_sent_at.lt.' + today);

    if (billingError) {
      console.error('Erro ao buscar cobranças:', billingError);
      return new Response(
        JSON.stringify({ success: false, error: billingError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (!billings || billings.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'Nenhuma cobrança para enviar hoje', count: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    let successCount = 0;
    let errorCount = 0;

    // Processar cada cobrança
    for (const billing of billings) {
      try {
        // A conexão pode vir como objeto ou array dependendo da query
        const connection = Array.isArray(billing.connections) 
          ? billing.connections[0] 
          : billing.connections;
          
        if (!connection || !connection.api_instance_token) {
          console.error('Conexão não encontrada ou sem token para cobrança:', billing.id);
          errorCount++;
          continue;
        }

        if (connection.status !== 'online') {
          console.error('Conexão não está online para cobrança:', billing.id);
          errorCount++;
          continue;
        }

        // Formatar data e valor
        const dueDate = new Date(billing.due_date);
        const formattedDate = dueDate.toLocaleDateString('pt-BR');
        const formattedAmount = new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(Number(billing.amount));

        // Buscar provedor de pagamento padrão do usuário
        const profile = Array.isArray(billing.profiles) 
          ? billing.profiles[0] 
          : billing.profiles;
        
        let pixData = null;
        let pixQrCode = null;
        let pixCopyPaste = null;
        let pixId = null;
        let paymentProvider = null;
        let boletoUrl = null;
        let boletoBarcode = null;
        let boletoPdf = null;
        const paymentMethod: string = (billing as any).payment_method || (billing as any).payment_type || 'pix';

        // Buscar provedor padrão do usuário
        const { data: provider, error: providerError } = await supabase
          .from('payment_providers')
          .select('*')
          .eq('user_id', profile.id)
          .eq('is_active', true)
          .eq('is_default', true)
          .single();

        if (providerError && providerError.code !== 'PGRST116') {
          console.error('Erro ao buscar provedor:', providerError);
        }

        // Se o usuário tem provedor configurado, gerar PIX
        if (provider && provider.api_key) {
          try {
            console.log('Gerando PIX para cobrança:', billing.id);
            console.log('Provedor:', provider.provider);
            console.log('Valor:', billing.amount);
            console.log('Descrição:', billing.description || `Cobrança para ${billing.client_name}`);
            
            // Escolher qual função chamar baseado no provedor e tipo de pagamento
            let functionName: string | null = null;
            let pixRequestData: any;

            // Apenas Mercado Pago suportado para cobranças dos usuários
            if (provider.provider !== 'mercado_pago') {
              console.error('Provedor não suportado:', provider.provider);
              continue;
            }
            
            if (paymentMethod === 'boleto') {
              console.error('Boleto não está disponível. Use PIX.');
              continue;
            }
            
            functionName = 'generate-mercado-pago-pix';
            pixRequestData = {
              api_key: provider.api_key,
              amount: billing.amount.toString(),
              description: billing.description || `Cobrança para ${billing.client_name}`,
              external_reference: `billing_${billing.id}`,
            };

            if (!functionName) {
              console.error('Provedor ou tipo de pagamento não suportado:', provider.provider, paymentMethod);
            } else {
              const supabaseUrlForPayment = Deno.env.get('SUPABASE_URL') || '';
              const pixResponse = await fetch(`${supabaseUrlForPayment}/functions/v1/${functionName}`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${supabaseServiceKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(pixRequestData),
              });

              console.log(`Resposta do ${functionName}:`, pixResponse.status, pixResponse.statusText);
              
              const pixResult = await pixResponse.json();
              console.log('Resultado do PIX:', JSON.stringify(pixResult));

              if (pixResult.success) {
                pixData = pixResult;
                paymentProvider = provider.provider;
                
                if (paymentMethod === 'boleto') {
                  boletoBarcode = pixResult.barcode || pixResult.boleto_barcode;
                  boletoUrl = pixResult.boleto_url;
                  boletoPdf = pixResult.pdf_url || pixResult.boleto_pdf;
                  pixId = pixResult.payment_id;
                  console.log('✅ Boleto gerado com sucesso! ID:', pixId);
                  console.log('URL:', boletoUrl);
                  console.log('PDF:', boletoPdf);
                  console.log('Código de barras:', boletoBarcode ? 'Presente' : 'Ausente');
                } else {
                  // Extrair dados do PIX do Mercado Pago
                  pixQrCode = pixResult.qr_code_base64 || pixResult.qr_code;
                  pixCopyPaste = pixResult.copy_paste || pixResult.qr_code;
                  pixId = pixResult.payment_id;
                  
                  console.log('✅ PIX gerado com sucesso! ID:', pixId);
                  console.log('Chave copia e cola:', pixCopyPaste ? `Presente (${pixCopyPaste.substring(0, 50)}...)` : 'Ausente');
                  console.log('QR Code:', pixQrCode ? (pixQrCode.startsWith('data:image') ? 'Presente (base64)' : 'Presente (URL)') : 'Ausente');
                  
                  // Validar se temos os dados necessários
                  if (!pixCopyPaste) {
                    console.error('❌ ERRO: Token PIX (copy_paste) não foi retornado!');
                  }
                  
                  // Se não tiver QR Code base64 mas tiver copy_paste, gerar QR Code
                  if (!pixQrCode && pixCopyPaste) {
                    console.warn('⚠️ AVISO: QR Code não foi retornado, gerando a partir do copy_paste...');
                    pixQrCode = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pixCopyPaste)}`;
                  }
                }
              } else {
                console.error(`Erro ao gerar ${paymentMethod === 'boleto' ? 'Boleto' : 'PIX'}:`, pixResult.error);
                console.error('Detalhes:', pixResult.details);
              }
            }
          } catch (pixError) {
            console.error('Erro ao gerar PIX (catch):', pixError);
            console.error('Stack:', pixError instanceof Error ? pixError.stack : 'N/A');
          }
        } else {
          console.log('PIX não gerado: Nenhum provedor de pagamento configurado para o usuário');
        }

        // Substituir variáveis na mensagem
        let messageText = billing.message_template || 
          `Olá {{nome}}! Você tem uma cobrança pendente de {{valor}} com vencimento em {{data}}. Por favor, entre em contato para quitar.`;
        
        messageText = messageText.replace(/\{\{nome\}\}/g, billing.client_name);
        messageText = messageText.replace(/\{\{valor\}\}/g, formattedAmount);
        messageText = messageText.replace(/\{\{data\}\}/g, formattedDate);
        messageText = messageText.replace(/\{\{descricao\}\}/g, billing.description || '');

        // Adicionar informações do PIX ou Boleto na mensagem se foi gerado
        if (paymentMethod === 'boleto' && boletoBarcode) {
          messageText += `\n\n📄 *Boleto Gerado Automaticamente*\n\n📋 *Código de Barras:*\n\`\`\`${boletoBarcode}\`\`\`\n\n💡 Copie o código acima e pague em qualquer banco ou lotérica.`;
          
          if (boletoUrl) {
            messageText += `\n\n🔗 *Link do boleto será enviado em seguida* - Acesse para visualizar ou imprimir.`;
          }
        } else if (paymentMethod === 'pix' && pixCopyPaste) {
          messageText += `\n\n💳 *PIX Gerado Automaticamente*\n\n📋 *Chave Copia e Cola:*\n\`\`\`${pixCopyPaste}\`\`\`\n\n💡 Copie o código acima e cole no app do seu banco para pagar.`;
          
          // Se tiver QR Code, avisar que será enviado
          if (pixQrCode) {
            messageText += `\n\n📱 *QR Code será enviado em seguida* - Escaneie com o app do seu banco.`;
          }
        }

        // Enviar mensagem via WhatsApp API
        // O número já deve estar no formato correto (com @s.whatsapp.net)
        const phoneNumber = billing.client_phone.includes('@s.whatsapp.net') 
          ? billing.client_phone 
          : `${billing.client_phone}@s.whatsapp.net`;

        // Usar proxy do Supabase para evitar CORS
        const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
        const response = await fetch(`${supabaseUrl}/functions/v1/whatsapp-proxy?path=/chat/send/text`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
            'x-auth-type': 'user',
            'x-instance-token': connection.api_instance_token,
          },
          body: JSON.stringify({
            Phone: phoneNumber,
            Body: messageText,
          }),
        });

        const result = await response.json();

        if (result.success) {
          // Se tiver QR Code PIX, tentar enviar como imagem
          if (paymentMethod === 'pix' && pixQrCode && typeof pixQrCode === 'string') {
            try {
              // Se for base64, enviar diretamente
              if (pixQrCode.startsWith('data:image')) {
                const qrResponse = await fetch(`${supabaseUrl}/functions/v1/whatsapp-proxy?path=/chat/send/image`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${supabaseServiceKey}`,
                    'Content-Type': 'application/json',
                    'x-auth-type': 'user',
                    'x-instance-token': connection.api_instance_token,
                  },
                  body: JSON.stringify({
                    Phone: phoneNumber,
                    Body: pixQrCode,
                    Caption: 'QR Code PIX - Escaneie para pagar',
                  }),
                });

                const qrResult = await qrResponse.json();
                if (!qrResult.success) {
                  console.error('Erro ao enviar QR Code:', qrResult.error);
                }
              } else if (typeof pixQrCode === 'string' && pixQrCode.startsWith('http')) {
                // Se for URL, baixar e enviar
                const qrResponse = await fetch(`${supabaseUrl}/functions/v1/whatsapp-proxy?path=/chat/send/image`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${supabaseServiceKey}`,
                    'Content-Type': 'application/json',
                    'x-auth-type': 'user',
                    'x-instance-token': connection.api_instance_token,
                  },
                  body: JSON.stringify({
                    Phone: phoneNumber,
                    Body: pixQrCode, // URL da imagem
                    Caption: 'QR Code PIX - Escaneie para pagar',
                  }),
                });

                const qrResult = await qrResponse.json();
                if (!qrResult.success) {
                  console.error('Erro ao enviar QR Code:', qrResult.error);
                }
              }
            } catch (qrError) {
              console.error('Erro ao processar QR Code:', qrError);
            }
          }

          // Se tiver link do boleto, enviar como mensagem
          if (paymentMethod === 'boleto' && boletoUrl) {
            try {
              const boletoMessage = `📄 *Boleto Gerado*\n\n🔗 Acesse o link abaixo para visualizar ou imprimir seu boleto:\n\n${boletoUrl}`;
              
              const boletoResponse = await fetch(`${supabaseUrl}/functions/v1/whatsapp-proxy?path=/chat/send/text`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${supabaseServiceKey}`,
                  'Content-Type': 'application/json',
                  'x-auth-type': 'user',
                  'x-instance-token': connection.api_instance_token,
                },
                body: JSON.stringify({
                  Phone: phoneNumber,
                  Body: boletoMessage,
                }),
              });

              const boletoResult = await boletoResponse.json();
              if (!boletoResult.success) {
                console.error('Erro ao enviar link do boleto:', boletoResult.error);
              }
            } catch (boletoError) {
              console.error('Erro ao enviar link do boleto:', boletoError);
            }
          }

          // Atualizar cobrança com dados do PIX ou Boleto
          const updateData: any = {
            last_sent_at: new Date().toISOString(),
            sent_count: (billing.sent_count || 0) + 1,
            status: dueDate < new Date() ? 'overdue' : 'pending',
            updated_at: new Date().toISOString(),
          };

          // Salvar dados do PIX ou Boleto se foi gerado
          if (paymentMethod === 'boleto') {
            if (boletoUrl) updateData.boleto_url = boletoUrl;
            if (boletoPdf) updateData.boleto_pdf = boletoPdf;
            if (boletoBarcode) updateData.boleto_barcode = boletoBarcode;
            if (pixId) updateData.pix_id = pixId; // Reutilizar campo para payment_id
          } else if (paymentMethod === 'pix') {
            if (pixQrCode) updateData.pix_qr_code = pixQrCode;
            if (pixCopyPaste) updateData.pix_copy_paste = pixCopyPaste;
            if (pixId) updateData.pix_id = pixId;
          }

          if (paymentProvider) updateData.payment_provider = paymentProvider;
          if (pixId) updateData.payment_provider_id = pixId;

          await supabase
            .from('billings')
            .update(updateData)
            .eq('id', billing.id);

          successCount++;
        } else {
          console.error('Erro ao enviar cobrança:', result.error);
          errorCount++;
        }

        // Delay entre envios (7 segundos)
        if (billings.indexOf(billing) < billings.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 7000));
        }
      } catch (error) {
        console.error('Erro ao processar cobrança:', error);
        errorCount++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processadas ${billings.length} cobrança(s). ${successCount} enviada(s) com sucesso, ${errorCount} erro(s).`,
        successCount,
        errorCount,
        total: billings.length,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (error) {
    console.error('Erro na função:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});

