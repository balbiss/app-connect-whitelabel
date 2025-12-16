/**
 * Edge Function para executar disparos agendados
 * Executada via cron job a cada minuto
 * Também pode ser chamada manualmente com disparo_id específico
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const WHATSAPP_API_URL = Deno.env.get('WHATSAPP_API_URL') || 'https://weeb.inoovaweb.com.br';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = new Date().toISOString();
  console.log(`[${startTime}] Edge Function execute-scheduled-disparos iniciada`);
  
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verificar se foi passado um disparo_id específico (chamada manual)
    let disparo_id: string | undefined;
    try {
      const body = await req.json();
      disparo_id = (body as any)?.disparo_id;
    } catch {
      // Se não tiver body, continua normalmente (chamada do cron)
    }

    let disparos: any[] = [];
    const now = new Date().toISOString();
    console.log(`[${startTime}] Horário atual (UTC): ${now}`);

    if (disparo_id) {
      // Se foi passado um disparo_id, processar apenas esse disparo
      console.log(`[${startTime}] Processando disparo específico: ${disparo_id}`);
      const { data: disparo, error: disparoError } = await supabase
        .from('disparos')
        .select('*')
        .eq('id', disparo_id)
        .in('status', ['scheduled', 'in_progress', 'paused'])
        .single();

      if (disparoError || !disparo) {
        console.error(`[${startTime}] Disparo não encontrado ou inválido: ${disparo_id}`);
      return new Response(JSON.stringify({ 
        message: 'Disparo não encontrado',
        timestamp: now 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
      }

      // Verificar se é agendado e se já passou o horário
      // Comparar UTC com UTC (scheduled_at já está em UTC)
      if (disparo.status === 'scheduled' && disparo.scheduled_at) {
        const scheduledTime = new Date(disparo.scheduled_at);
        const currentTime = new Date();
        
        // Adicionar um pequeno buffer de 1 minuto para evitar problemas de timing
        if (scheduledTime > currentTime) {
          const minutesUntil = Math.ceil((scheduledTime.getTime() - currentTime.getTime()) / 60000);
          console.log(`[${startTime}] Disparo agendado ainda não chegou no horário. Faltam ${minutesUntil} minutos.`);
          return new Response(JSON.stringify({ 
            message: `Disparo ainda não chegou no horário agendado. Faltam ${minutesUntil} minutos.`,
            scheduled_at: disparo.scheduled_at,
            current_time: currentTime.toISOString(),
            timestamp: now
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      disparos = [disparo];
    } else {
      // Buscar disparos agendados que devem ser executados agora
      console.log(`[${startTime}] Buscando disparos agendados...`);
      
      // Buscar TODOS os disparos agendados primeiro para debug
      const { data: allScheduled, error: allError } = await supabase
        .from('disparos')
        .select('id, campaign_name, status, scheduled_at')
        .eq('status', 'scheduled');
      
      if (allError) {
        console.error(`[${startTime}] Erro ao buscar todos os disparos agendados:`, allError);
      } else {
        console.log(`[${startTime}] Total de disparos agendados encontrados: ${allScheduled?.length || 0}`);
        if (allScheduled && allScheduled.length > 0) {
          console.log(`[${startTime}] Disparos agendados:`, allScheduled.map(d => ({
            id: d.id,
            name: d.campaign_name,
            scheduled_at: d.scheduled_at,
            scheduled_time: d.scheduled_at ? new Date(d.scheduled_at).toISOString() : null,
            now: new Date().toISOString(),
            should_run: d.scheduled_at ? new Date(d.scheduled_at) <= new Date() : false
          })));
        }
      }
      
      // Buscar disparos agendados que já passaram do horário (com buffer de 1 minuto)
      const nowWithBuffer = new Date(Date.now() - 60000); // 1 minuto atrás para garantir que processa
      console.log(`[${startTime}] Buscando disparos com scheduled_at <= ${nowWithBuffer.toISOString()}`);
      
      const { data: disparosAgendados, error: disparosError } = await supabase
        .from('disparos')
        .select('*')
        .eq('status', 'scheduled')
        .lte('scheduled_at', nowWithBuffer.toISOString());

      if (disparosError) {
        console.error(`[${startTime}] Erro ao buscar disparos:`, disparosError);
        throw disparosError;
      }

      console.log(`[${startTime}] Disparos encontrados para processar: ${disparosAgendados?.length || 0}`);
      disparos = disparosAgendados || [];
    }

    console.log(`[${startTime}] Encontrados ${disparos?.length || 0} disparos para processar`);

    if (!disparos || disparos.length === 0) {
      console.log(`[${startTime}] Nenhum disparo para executar`);
      return new Response(JSON.stringify({ 
        message: 'Nenhum disparo para executar',
        timestamp: now 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Processar cada disparo
    for (const disparo of disparos) {
      console.log(`[${startTime}] Processando disparo ${disparo.id} - ${disparo.campaign_name}`);
      if (disparo.scheduled_at) {
        console.log(`[${startTime}] Agendado para: ${disparo.scheduled_at}`);
      }
      try {
        // Buscar conexão
        const { data: connection, error: connError } = await supabase
          .from('connections')
          .select('*')
          .eq('id', disparo.connection_id)
          .single();

        if (connError || !connection) {
          console.error(`Conexão não encontrada para disparo ${disparo.id}`);
          await supabase
            .from('disparos')
            .update({ status: 'failed' })
            .eq('id', disparo.id);
          continue;
        }

        if (connection.status !== 'online') {
          console.error(`Conexão ${connection.id} não está online`);
          continue;
        }

        // Atualizar status para in_progress
        await supabase
          .from('disparos')
          .update({
            status: 'in_progress',
            started_at: new Date().toISOString(),
          })
          .eq('id', disparo.id);

        // Buscar recipients pendentes
        const { data: recipients, error: recipientsError } = await supabase
          .from('disparo_recipients')
          .select('*')
          .eq('disparo_id', disparo.id)
          .eq('status', 'pending')
          .order('created_at');

        if (recipientsError) throw recipientsError;

        if (!recipients || recipients.length === 0) {
          await supabase
            .from('disparos')
            .update({ status: 'completed' })
            .eq('id', disparo.id);
          continue;
        }

        // Enviar mensagens
        for (let i = 0; i < recipients.length; i++) {
          const recipient = recipients[i];

          try {
            let result;
            const cleanPhone = recipient.phone_number.replace(/\D/g, '');

            // Enviar mensagem com ou sem mídia
            if (recipient.media_url && recipient.media_type) {
              const mediaBase64 = recipient.media_url; // Já deve estar em base64 com prefixo
              
              switch (recipient.media_type) {
                case 'image': {
                  const response = await fetch(`${WHATSAPP_API_URL}/chat/send/image`, {
                    method: 'POST',
                    headers: {
                      'token': connection.api_instance_token,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      Phone: cleanPhone,
                      Image: mediaBase64,
                      Caption: recipient.personalized_message || undefined,
                    }),
                  });
                  result = await response.json();
                  break;
                }
                case 'video': {
                  const response = await fetch(`${WHATSAPP_API_URL}/chat/send/video`, {
                    method: 'POST',
                    headers: {
                      'token': connection.api_instance_token,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      Phone: cleanPhone,
                      Video: mediaBase64,
                      Caption: recipient.personalized_message || undefined,
                    }),
                  });
                  result = await response.json();
                  break;
                }
                case 'document': {
                  // Extrair nome do arquivo ou usar padrão
                  const fileName = recipient.media_url.match(/filename=([^;]+)/)?.[1] || 'documento.pdf';
                  const response = await fetch(`${WHATSAPP_API_URL}/chat/send/document`, {
                    method: 'POST',
                    headers: {
                      'token': connection.api_instance_token,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      Phone: cleanPhone,
                      Document: mediaBase64,
                      FileName: fileName,
                    }),
                  });
                  result = await response.json();
                  break;
                }
                case 'audio': {
                  const response = await fetch(`${WHATSAPP_API_URL}/chat/send/audio`, {
                    method: 'POST',
                    headers: {
                      'token': connection.api_instance_token,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      Phone: cleanPhone,
                      Audio: mediaBase64,
                      PTT: false, // PTT = false por padrão
                    }),
                  });
                  result = await response.json();
                  break;
                }
                default: {
                  // Se não suportado, enviar apenas texto
                  const response = await fetch(`${WHATSAPP_API_URL}/chat/send/text`, {
                    method: 'POST',
                    headers: {
                      'token': connection.api_instance_token,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      Phone: cleanPhone,
                      Body: recipient.personalized_message || '',
                    }),
                  });
                  result = await response.json();
                }
              }
            } else {
              // Enviar apenas texto
              const response = await fetch(`${WHATSAPP_API_URL}/chat/send/text`, {
                method: 'POST',
                headers: {
                  'token': connection.api_instance_token,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  Phone: cleanPhone,
                  Body: recipient.personalized_message || '',
                }),
              });
              result = await response.json();
            }

            if (result.success) {
              // Atualizar recipient como enviado
              await supabase
                .from('disparo_recipients')
                .update({
                  status: 'sent',
                  sent_at: new Date().toISOString(),
                })
                .eq('id', recipient.id);

              // Atualizar contador do disparo diretamente (mesma lógica do frontend)
              const { data: currentDisparo } = await supabase
                .from('disparos')
                .select('sent_count')
                .eq('id', disparo.id)
                .single();
              
              await supabase
                .from('disparos')
                .update({ sent_count: (currentDisparo?.sent_count || 0) + 1 })
                .eq('id', disparo.id);

              // Atualizar contador de mensagens enviadas na conexão
              const { data: currentConnection } = await supabase
                .from('connections')
                .select('messages_sent, created_at')
                .eq('id', connection.id)
                .single();
              
              if (currentConnection) {
                // Calcular dias ativos desde a criação da conexão
                const now = new Date();
                const createdDate = new Date(currentConnection.created_at);
                const activeDays = Math.max(1, Math.floor(
                  (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
                ) + 1);
                
                // Incrementar mensagens enviadas e atualizar dias ativos
                await supabase
                  .from('connections')
                  .update({ 
                    messages_sent: (currentConnection.messages_sent || 0) + 1,
                    active_days: activeDays
                  })
                  .eq('id', connection.id);
              }
            } else {
              // Marcar como falha
              await supabase
                .from('disparo_recipients')
                .update({
                  status: 'failed',
                  error_message: result.message || 'Erro ao enviar',
                })
                .eq('id', recipient.id);

              // Atualizar contador de falhas diretamente (mesma lógica do frontend)
              const { data: currentDisparo } = await supabase
                .from('disparos')
                .select('failed_count')
                .eq('id', disparo.id)
                .single();
              
              await supabase
                .from('disparos')
                .update({ failed_count: (currentDisparo?.failed_count || 0) + 1 })
                .eq('id', disparo.id);
            }
          } catch (error) {
            console.error(`Erro ao enviar para ${recipient.phone_number}:`, error);
            await supabase
              .from('disparo_recipients')
              .update({
                status: 'failed',
                error_message: error instanceof Error ? error.message : 'Erro desconhecido',
              })
              .eq('id', recipient.id);

            // Atualizar contador de falhas diretamente (mesma lógica do frontend)
            const { data: currentDisparo } = await supabase
              .from('disparos')
              .select('failed_count')
              .eq('id', disparo.id)
              .single();
            
            await supabase
              .from('disparos')
              .update({ failed_count: (currentDisparo?.failed_count || 0) + 1 })
              .eq('id', disparo.id);
          }

          // Aplicar delay entre mensagens (exceto após a última)
          if (i < recipients.length - 1) {
            // Calcular delay aleatório entre min e max
            const delay = Math.floor(
              Math.random() * (disparo.delay_max - disparo.delay_min + 1)
            ) + disparo.delay_min;
            
            // Garantir delay mínimo de 7 segundos para evitar banimento
            const safeDelay = Math.max(7000, delay);
            
            console.log(`[${startTime}] Aguardando ${safeDelay}ms antes de enviar próxima mensagem`);
            await new Promise((resolve) => setTimeout(resolve, safeDelay));
            
            // Pausa maior a cada 10 mensagens para evitar padrões detectáveis
            if ((i + 1) % 10 === 0) {
              const extraDelay = Math.floor(Math.random() * 10000) + 5000; // 5-15 segundos extras
              console.log(`[${startTime}] Pausa extra de ${extraDelay}ms após ${i + 1} mensagens`);
              await new Promise((resolve) => setTimeout(resolve, extraDelay));
            }
            
            // Pausa ainda maior a cada 50 mensagens
            if ((i + 1) % 50 === 0) {
              const longDelay = Math.floor(Math.random() * 30000) + 20000; // 20-50 segundos extras
              console.log(`[${startTime}] Pausa longa de ${longDelay}ms após ${i + 1} mensagens`);
              await new Promise((resolve) => setTimeout(resolve, longDelay));
            }
          }
        }

        // Atualizar status final do disparo
        const { data: finalStats } = await supabase
          .from('disparo_recipients')
          .select('status')
          .eq('disparo_id', disparo.id);

        const sentCount = finalStats?.filter((s) => s.status === 'sent').length || 0;
        const failedCount = finalStats?.filter((s) => s.status === 'failed').length || 0;

        await supabase
          .from('disparos')
          .update({
            status: sentCount > 0 ? 'completed' : 'failed',
            sent_count: sentCount,
            failed_count: failedCount,
            completed_at: new Date().toISOString(),
          })
          .eq('id', disparo.id);

        // Enviar push notification quando campanha finalizar
        if (sentCount > 0) {
          try {
            const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
            await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userId: disparo.user_id,
                title: '✅ Campanha Concluída',
                body: `A campanha "${disparo.campaign_name}" foi finalizada! ${sentCount} de ${disparo.total_recipients || 0} mensagens enviadas.`,
                data: {
                  type: 'campaign_completed',
                  campaignId: disparo.id,
                  url: '/campanhas',
                },
                icon: '/favicon.ico',
                tag: `campaign_${disparo.id}`,
              }),
            });
          } catch (pushError) {
            console.error('Erro ao enviar push notification:', pushError);
            // Não falhar o processo se push falhar
          }
        }
      } catch (error) {
        console.error(`Erro ao processar disparo ${disparo.id}:`, error);
        await supabase
          .from('disparos')
          .update({ status: 'failed' })
          .eq('id', disparo.id);
      }
    }

    const endTime = new Date().toISOString();
    console.log(`[${endTime}] Edge Function concluída. Processados: ${disparos.length} disparos`);
    
    return new Response(
      JSON.stringify({
        success: true,
        processed: disparos.length,
        timestamp: endTime,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    const errorTime = new Date().toISOString();
    console.error(`[${errorTime}] Erro na função:`, error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: errorTime,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
