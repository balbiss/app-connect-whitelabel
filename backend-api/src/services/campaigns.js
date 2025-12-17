/**
 * Serviços para gerenciamento de campanhas
 * Substitui as Edge Functions execute-scheduled-disparos e insert-campaign-recipients
 */

import { supabase } from '../config/supabase.js';
import dotenv from 'dotenv';

dotenv.config();

const MIDDLEWARE_URL = process.env.MIDDLEWARE_URL || 'http://localhost:3000';

/**
 * Executa campanhas agendadas
 * Substitui: execute-scheduled-disparos
 */
export async function executeScheduledCampaigns(disparo_id = null) {
  const startTime = new Date().toISOString();
  console.log(`[${startTime}] Executando campanhas agendadas...`);

  try {
    let disparos = [];
    const now = new Date().toISOString();

    if (disparo_id) {
      // Processar disparo específico
      console.log(`[${startTime}] Processando disparo específico: ${disparo_id}`);
      
      // Buscar disparo sem filtro de status primeiro (para debug)
      const { data: disparoDebug, error: debugError } = await supabase
        .from('disparos')
        .select('*')
        .eq('id', disparo_id)
        .single();
      
      if (debugError || !disparoDebug) {
        console.error(`[${startTime}] Disparo não encontrado no banco: ${disparo_id}`);
        throw new Error(`Disparo não encontrado: ${disparo_id}`);
      }
      
      console.log(`[${startTime}] Disparo encontrado com status: ${disparoDebug.status}`);
      
      // Se o disparo não está em um status válido, retornar mensagem
      if (!['scheduled', 'in_progress', 'paused'].includes(disparoDebug.status)) {
        console.warn(`[${startTime}] Disparo ${disparo_id} tem status inválido: ${disparoDebug.status}`);
        return {
          processed: 0,
          message: `Disparo tem status '${disparoDebug.status}', não pode ser executado. Status válidos: scheduled, in_progress, paused`,
        };
      }
      
      const disparo = disparoDebug;

      // Verificar se é agendado e se já passou o horário
      if (disparo.status === 'scheduled' && disparo.scheduled_at) {
        const scheduledTime = new Date(disparo.scheduled_at);
        const currentTime = new Date();
        
        if (scheduledTime > currentTime) {
          const minutesUntil = Math.ceil((scheduledTime.getTime() - currentTime.getTime()) / 60000);
          return {
            message: `Disparo ainda não chegou no horário agendado. Faltam ${minutesUntil} minutos.`,
            scheduled_at: disparo.scheduled_at,
            current_time: currentTime.toISOString(),
          };
        }
      }

      disparos = [disparo];
    } else {
      // Buscar disparos agendados que devem ser executados
      const nowWithBuffer = new Date(Date.now() - 60000); // 1 minuto atrás
      
      const { data: disparosAgendados, error: disparosError } = await supabase
        .from('disparos')
        .select('*')
        .eq('status', 'scheduled')
        .lte('scheduled_at', nowWithBuffer.toISOString());

      if (disparosError) {
        throw disparosError;
      }

      disparos = disparosAgendados || [];
    }

    console.log(`[${startTime}] Encontrados ${disparos.length} disparos para processar`);

    if (disparos.length === 0) {
      return {
        message: 'Nenhum disparo para executar',
        processed: 0,
      };
    }

    // Processar cada disparo
    let processed = 0;
    for (const disparo of disparos) {
      try {
        await processDisparo(disparo);
        processed++;
      } catch (error) {
        console.error(`Erro ao processar disparo ${disparo.id}:`, error);
        await supabase
          .from('disparos')
          .update({ status: 'failed' })
          .eq('id', disparo.id);
      }
    }

    return {
      processed,
      total: disparos.length,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Erro ao executar campanhas:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * Processa um disparo individual
 */
async function processDisparo(disparo) {
  console.log(`Processando disparo ${disparo.id} - ${disparo.campaign_name}`);

  // Buscar conexão
  const { data: connection, error: connError } = await supabase
    .from('connections')
    .select('*')
    .eq('id', disparo.connection_id)
    .single();

  if (connError || !connection) {
    throw new Error(`Conexão não encontrada para disparo ${disparo.id}`);
  }

  if (connection.status !== 'online') {
    throw new Error(`Conexão ${connection.id} não está online`);
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
    return;
  }

  // Enviar mensagens para o middleware
  const cleanMiddlewareUrl = MIDDLEWARE_URL.replace(/\/$/, '');
  const middlewareEndpoint = `${cleanMiddlewareUrl}/api/messages/dispatch`;

  const messages = recipients.map(recipient => ({
    disparo_id: disparo.id,
    recipient_id: recipient.id,
    phone: recipient.phone_number,
    message: recipient.personalized_message || '',
    media_url: recipient.media_url || null,
    media_type: recipient.media_type || null,
    api_token: connection.api_instance_token,
    priority: 1,
  }));

  try {
    const response = await fetch(middlewareEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Erro ao adicionar mensagens na fila');
    }

    console.log(`✅ ${result.jobsAdded} mensagens adicionadas na fila do middleware`);
  } catch (error) {
    console.error('❌ Erro ao enviar para middleware:', error);
    
    // Marcar disparo como falha
    await supabase
      .from('disparos')
      .update({ 
        status: 'failed',
        error_message: error.message,
      })
      .eq('id', disparo.id);
    
    // Marcar recipients como failed
    for (const recipient of recipients) {
      await supabase
        .from('disparo_recipients')
        .update({
          status: 'failed',
          error_message: error.message,
        })
        .eq('id', recipient.id);
    }
    
    throw error;
  }
}

/**
 * Insere recipients de campanha em background
 * Substitui: insert-campaign-recipients
 */
export async function insertCampaignRecipients(disparo_id, recipients, total_recipients) {
  console.log(`[insert-recipients] Iniciando inserção de ${recipients.length} recipients para disparo ${disparo_id}`);

  // Verificar se o disparo existe (com retry para aguardar ser salvo)
  let disparo = null;
  let retries = 5; // Tentar 5 vezes
  let waitTime = 500; // Começar com 500ms

  while (retries > 0 && !disparo) {
    const { data: disparoData, error: disparoError } = await supabase
      .from('disparos')
      .select('id, user_id, status')
      .eq('id', disparo_id)
      .single();

    if (!disparoError && disparoData) {
      disparo = disparoData;
      console.log(`[insert-recipients] ✅ Disparo encontrado após ${6 - retries} tentativa(s)`);
      break;
    } else {
      retries--;
      if (retries > 0) {
        console.log(`[insert-recipients] ⏳ Disparo ainda não encontrado, aguardando ${waitTime}ms... (${retries} tentativas restantes)`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        waitTime *= 2; // Aumentar tempo de espera exponencialmente
      }
    }
  }

  if (!disparo) {
    console.error(`[insert-recipients] ❌ Disparo não encontrado após todas as tentativas: ${disparo_id}`);
    throw new Error(`Disparo não encontrado: ${disparo_id}. Aguarde alguns segundos e tente novamente.`);
  }

  // Inserir recipients em lotes
  const BATCH_SIZE = 50; // Pode ser maior agora que não tem WORKER_LIMIT
  const totalBatches = Math.ceil(recipients.length / BATCH_SIZE);
  let insertedCount = 0;
  const errors = [];

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;

    console.log(`[insert-recipients] Processando lote ${batchNum}/${totalBatches} (${batch.length} recipients)`);

    // Preparar dados do lote
    const batchData = batch.map((r) => ({
      disparo_id,
      name: r.name || null,
      phone_number: r.phone_number,
      message_variation_id: r.message_variation_id || 0,
      personalized_message: r.personalized_message || '',
      media_url: r.media_url || null,
      media_type: r.media_type || null,
      status: 'pending',
    }));

    // Tentar inserir com retry
    let retries = 3;
    let batchInserted = false;

    while (retries > 0 && !batchInserted) {
      try {
        const { error: insertError } = await supabase
          .from('disparo_recipients')
          .insert(batchData);

        if (insertError) {
          if ((insertError.code === '57014' || insertError.message?.includes('timeout')) && retries > 1) {
            retries--;
            console.warn(`[insert-recipients] Timeout no lote ${batchNum}, tentando novamente... (${retries} tentativas restantes)`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }
          throw insertError;
        }

        batchInserted = true;
        insertedCount += batch.length;
        console.log(`[insert-recipients] ✅ Lote ${batchNum}/${totalBatches} inserido: ${batch.length} recipients`);

        // Atualizar contador periodicamente (a cada 10 lotes)
        if (batchNum % 10 === 0) {
          await supabase
            .from('disparos')
            .update({
              total_recipients: total_recipients || insertedCount,
              pending_count: insertedCount,
            })
            .eq('id', disparo_id);
        }
      } catch (error) {
        if ((error.code === '57014' || error.message?.includes('timeout')) && retries > 1) {
          retries--;
          console.warn(`[insert-recipients] Erro no lote ${batchNum}, tentando novamente... (${retries} tentativas restantes)`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        console.error(`[insert-recipients] ❌ Erro ao inserir lote ${batchNum}:`, {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          stack: error.stack,
        });
        errors.push({ batch: batchNum, error: error.message, code: error.code });
        retries = 0;
      }
    }

    // Pequeno delay entre lotes
    if (i + BATCH_SIZE < recipients.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  // Atualizar contador final
  try {
    await supabase
      .from('disparos')
      .update({
        total_recipients: total_recipients || insertedCount,
        pending_count: insertedCount,
      })
      .eq('id', disparo_id);
  } catch (updateError) {
    console.warn(`[insert-recipients] Erro ao atualizar contador final (não crítico):`, updateError);
  }

  console.log(`[insert-recipients] ✅ Concluído: ${insertedCount}/${recipients.length} recipients inseridos`);

  return {
    inserted: insertedCount,
    total: recipients.length,
    errors: errors.length > 0 ? errors : undefined,
  };
}

