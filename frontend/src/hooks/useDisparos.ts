/**
 * Hook para gerenciar disparos (campanhas)
 */

import { useCallback, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, Disparo, DisparoRecipient } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { whatsappApi, cleanPhoneNumber, validateAndNormalizePhone } from '@/lib/whatsapp-api';
import { toast } from 'sonner';
import { 
  notifyCampaignCreated, 
  notifyCampaignStarted, 
  notifyCampaignPaused, 
  notifyCampaignCancelled,
  notifyCampaignFailed 
} from '@/lib/notifications';

export function useDisparos() {
  const { user, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<any>(null);

  // Query para carregar disparos com cache otimizado
  const { data: disparos = [], isLoading: loading, refetch } = useQuery({
    queryKey: ['disparos', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      // Selecionar apenas colunas necessárias (reduz tamanho dos dados)
      const { data, error } = await supabase
        .from('disparos')
        .select('id, campaign_name, status, total_recipients, sent_count, delivered_count, failed_count, created_at, scheduled_at, started_at, completed_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50); // Limite de 50 campanhas (reduz consumo)

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    staleTime: 0, // Dados sempre considerados stale para Realtime funcionar
    gcTime: 10 * 60 * 1000, // 10 minutos - cache mantido por 10min
    refetchOnWindowFocus: true, // Refetch ao focar janela
    refetchOnReconnect: true, // Refetch ao reconectar
    refetchOnMount: true, // Refetch ao montar
    refetchInterval: 5000, // Refetch a cada 5 segundos para atualização em tempo real
    retry: 1,
  });

  // Realtime subscription para atualização automática
  useEffect(() => {
    if (!user?.id) return;

    // Limpar subscription anterior se existir
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }

    console.log('🔴 Iniciando Realtime subscription para disparos...');

    // Criar subscription para mudanças na tabela disparos
    const subscription = supabase
      .channel(`disparos:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'disparos',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('🔄 Mudança detectada em disparos:', payload.eventType, payload.new || payload.old);
          
          // Invalidar cache para forçar refetch
          queryClient.invalidateQueries({ queryKey: ['disparos', user.id] });
          
          // Se for UPDATE, atualizar cache otimisticamente
          if (payload.eventType === 'UPDATE' && payload.new) {
            queryClient.setQueryData<Disparo[]>(['disparos', user.id], (old) => {
              if (!old) return [];
              return old.map((d) => 
                d.id === payload.new.id ? { ...d, ...payload.new } : d
              );
            });
          }
          
          // Se for INSERT, adicionar ao cache
          if (payload.eventType === 'INSERT' && payload.new) {
            queryClient.setQueryData<Disparo[]>(['disparos', user.id], (old) => {
              if (!old) return [payload.new];
              return [payload.new, ...old];
            });
          }
          
          // Se for DELETE, remover do cache
          if (payload.eventType === 'DELETE' && payload.old) {
            queryClient.setQueryData<Disparo[]>(['disparos', user.id], (old) => {
              if (!old) return [];
              return old.filter((d) => d.id !== payload.old.id);
            });
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Realtime subscription ativa para disparos');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Erro na subscription Realtime');
        }
      });

    subscriptionRef.current = subscription;

    // Cleanup
    return () => {
      if (subscriptionRef.current) {
        console.log('🔴 Desconectando Realtime subscription...');
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [user?.id, queryClient]);

  const loadDisparos = useCallback(() => {
    refetch();
  }, [refetch]);

  // Função auxiliar para inserir recipients diretamente como fallback
  const insertRecipientsFallback = async (
    disparoId: string,
    recipientsData: any[],
    supabaseClient: any
  ): Promise<number> => {
    console.log(`🔄 Fallback: Inserindo ${recipientsData.length} recipients diretamente em lotes pequenos...`);
    
    const FALLBACK_BATCH_SIZE = 10; // Lotes muito pequenos para evitar timeout
    let totalInserted = 0;
    
    for (let i = 0; i < recipientsData.length; i += FALLBACK_BATCH_SIZE) {
      const batch = recipientsData.slice(i, i + FALLBACK_BATCH_SIZE);
      const batchNum = Math.floor(i / FALLBACK_BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(recipientsData.length / FALLBACK_BATCH_SIZE);
      
      try {
        console.log(`🔄 Fallback: Inserindo lote ${batchNum}/${totalBatches} (${batch.length} recipients)...`);
        const { error: insertError } = await supabaseClient
          .from('disparo_recipients')
          .insert(batch);
        
        if (insertError) {
          console.error(`❌ Erro ao inserir lote ${batchNum} no fallback:`, insertError);
          // Continuar com próximo lote mesmo se este falhar
          continue;
        }
        
        totalInserted += batch.length;
        console.log(`✅ Fallback: Lote ${batchNum}/${totalBatches} inserido (${batch.length} recipients)`);
        
        // Pequeno delay entre lotes
        if (i + FALLBACK_BATCH_SIZE < recipientsData.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error(`❌ Erro no lote ${batchNum} do fallback:`, error);
        // Continuar com próximo lote
      }
    }
    
    // Atualizar contador
    if (totalInserted > 0) {
      await supabaseClient
        .from('disparos')
        .update({
          total_recipients: totalInserted,
          pending_count: totalInserted,
        })
        .eq('id', disparoId);
    }
    
    console.log(`✅ Fallback concluído: ${totalInserted}/${recipientsData.length} recipients inseridos`);
    return totalInserted;
  };

  const createDisparo = async (
    connectionId: string,
    campaignName: string,
    messageVariations: string[],
    recipients: Array<{ name: string; phone: string }>,
    delayMin: number = 7000,
    delayMax: number = 13000,
    media?: { url: string; type: 'image' | 'video' | 'document' | 'audio' },
    scheduledAt?: string | null
  ) => {
    if (!user) throw new Error('Usuário não autenticado');

    // Verificar se tem assinatura ativa e limites
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_status, plan, daily_disparos_limit, daily_disparos_count, trial_ends_at, subscription_ends_at')
      .eq('id', user.id)
      .single();

    if (!profile) {
      throw new Error(
        'Perfil não encontrado. Entre em contato com o suporte.'
      );
    }

    // Verificar se a assinatura expirou (subscription_ends_at)
    if (profile.subscription_ends_at) {
      const expirationDate = new Date(profile.subscription_ends_at);
      if (expirationDate < new Date()) {
        const expiredDateStr = expirationDate.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        throw new Error(
          `Sua assinatura expirou em ${expiredDateStr}. Renove sua assinatura para continuar usando o sistema.`
        );
      }
    }

    // Verificar se plano teste expirou
    if (profile.plan === 'teste' && profile.trial_ends_at) {
      const trialEndDate = new Date(profile.trial_ends_at);
      if (trialEndDate < new Date()) {
        throw new Error(
          'Seu plano de teste expirou. Assine um plano para continuar usando!'
        );
      }
    }

    // Verificar se tem assinatura ativa (após verificar expiração)
    if (profile.subscription_status !== 'active') {
      throw new Error(
        'Você precisa de uma assinatura ativa para criar campanhas. ' +
        'Assine um plano em /plans para começar a usar o Connect!'
      );
    }

    // Verificar limite diário de disparos
    if (profile.daily_disparos_limit !== null) {
      const currentCount = profile.daily_disparos_count || 0;
      const limit = profile.daily_disparos_limit;
      
      if (currentCount >= limit) {
        throw new Error(
          `Você atingiu o limite diário de ${limit} disparos. O limite será resetado amanhã.`
        );
      }

      // Verificar se o novo disparo excederia o limite
      if (currentCount + recipients.length > limit) {
        const remaining = limit - currentCount;
        throw new Error(
          `Você pode criar apenas mais ${remaining} disparo(s) hoje. Limite diário: ${limit} disparos.`
        );
      }
    }

    try {
      // Criar disparo PRIMEIRO (antes de inserir recipients)
      // Isso permite que a campanha seja criada rapidamente
      const { data: disparo, error: disparoError } = await supabase
        .from('disparos')
        .insert({
          user_id: user.id,
          connection_id: connectionId,
          campaign_name: campaignName,
          message_variations: messageVariations,
          total_recipients: recipients.length,
          pending_count: recipients.length,
          scheduled_at: scheduledAt || null,
          delay_min: delayMin,
          delay_max: delayMax,
          status: scheduledAt ? 'scheduled' : 'scheduled', // Criar como scheduled, será iniciado depois que recipients forem inseridos (ou aguardar horário se agendado)
        })
        .select()
        .single();

      if (disparoError) throw disparoError;
      
      console.log('✅ Campanha criada:', disparo.id);

      // Criar notificação de campanha criada
      notifyCampaignCreated(user.id, campaignName, disparo.id).catch(err => {
        console.error('Erro ao criar notificação de campanha criada:', err);
      });

      // Obter data e hora atual formatadas uma única vez (otimização)
      const now = new Date();
      const formattedDate = now.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
      const formattedTime = now.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });

      // Criar recipients (otimizado - sem validação duplicada, já validado no parseContacts)
      const recipientsData = recipients.map((recipient, index) => {
        // Alternar mensagens: se houver múltiplas mensagens, usar índice para alternar
        // Se houver apenas uma mensagem, usar sempre a primeira
        const messageIndex = messageVariations.length > 1 
          ? (index % messageVariations.length) 
          : 0;
        let personalizedMessage = messageVariations[messageIndex];
        
        // Personalizar mensagem (otimizado - usar replaceAll quando possível)
        personalizedMessage = personalizedMessage.replace(/\{\{\s*nome\s*\}\}/gi, recipient.name || '');
        personalizedMessage = personalizedMessage.replace(/\{\{\s*telefone\s*\}\}/gi, recipient.phone || '');
        personalizedMessage = personalizedMessage.replace(/\{\{\s*numero\s*\}\}/gi, recipient.phone || '');
        personalizedMessage = personalizedMessage.replace(/\{\{\s*data\s*\}\}/gi, formattedDate);
        personalizedMessage = personalizedMessage.replace(/\{\{\s*hora\s*\}\}/gi, formattedTime);

        // Usar telefone já normalizado do parseContacts (sem validação duplicada)
        // O parseContacts já valida e normaliza, então podemos confiar no recipient.phone
        return {
          disparo_id: disparo.id,
          name: recipient.name,
          phone_number: recipient.phone, // Já normalizado pelo parseContacts
          message_variation_id: messageIndex,
          personalized_message: personalizedMessage,
          media_url: media?.url || null,
          media_type: media?.type || null,
          status: 'pending' as const,
        };
      });

      // SOLUÇÃO ROBUSTA: Usar Backend API para inserir recipients em background
      // Isso evita timeout, erros 500 e WORKER_LIMIT
      console.log(`📦 Enviando ${recipientsData.length} recipients para inserção em background via Edge Function...`);
      
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const { data: { session } } = await supabase.auth.getSession();
      
      // Chamar Edge Function para inserir recipients em background
      // Dividir em chunks menores se necessário
      const CHUNK_SIZE = 50; // Tamanho seguro para Edge Functions
      const chunks = [];
      for (let i = 0; i < recipientsData.length; i += CHUNK_SIZE) {
        chunks.push(recipientsData.slice(i, i + CHUNK_SIZE));
      }

      console.log(`📦 Dividindo ${recipientsData.length} recipients em ${chunks.length} chunks`);

      // Processar chunks sequencialmente para não sobrecarregar
      let totalInserted = 0;
      try {
        for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
          const chunk = chunks[chunkIndex];
          console.log(`📤 Enviando chunk ${chunkIndex + 1}/${chunks.length} (${chunk.length} recipients)...`);
          
          const insertResponse = await fetch(`${supabaseUrl}/functions/v1/insert-campaign-recipients`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session?.access_token || ''}`,
            },
            body: JSON.stringify({
              disparo_id: disparo.id,
              recipients: chunk,
              total_recipients: recipientsData.length,
            }),
          });

          if (!insertResponse.ok) {
            const errorData = await insertResponse.json().catch(() => ({ error: 'Erro desconhecido' }));
            console.error(`❌ Erro ao chamar Backend API para chunk ${chunkIndex + 1}:`, errorData);
            // Continuar com próximo chunk mesmo se este falhar
            continue;
          } else {
            const result = await insertResponse.json();
            if (result.success) {
              totalInserted += result.inserted || 0;
              console.log(`✅ Chunk ${chunkIndex + 1}/${chunks.length} processado: ${result.inserted || 0} recipients inseridos`);
            } else {
              console.warn(`⚠️ Chunk ${chunkIndex + 1} retornou erro: ${result.error}`);
            }
          }

          // Pequeno delay entre chunks
          if (chunkIndex < chunks.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }

        if (totalInserted > 0) {
          console.log(`✅ Total de ${totalInserted}/${recipientsData.length} recipients sendo inseridos em background`);
        } else {
          console.warn('⚠️ Nenhum recipient foi inserido via Backend API. Tentando fallback direto...');
          // Fallback: inserir diretamente em lotes muito pequenos
          await insertRecipientsFallback(disparo.id, recipientsData, supabase);
        }
      } catch (error) {
        console.error('❌ Erro ao chamar Backend API:', error);
        // Fallback: inserir diretamente em lotes muito pequenos
        await insertRecipientsFallback(disparo.id, recipientsData, supabase);
      }
      
      // Atualizar contador inicial (será atualizado pela Edge Function depois)
      await supabase
        .from('disparos')
        .update({
          total_recipients: recipientsData.length,
          pending_count: recipientsData.length,
        })
        .eq('id', disparo.id);

      // Incrementar contador de disparos diários (se tiver limite)
      if (profile.daily_disparos_limit !== null) {
        const { error: incrementError } = await supabase.rpc('increment_daily_disparos', {
          user_uuid: user.id,
          count: recipients.length
        });
        
        if (incrementError) {
          console.error('Erro ao incrementar contador diário:', incrementError);
          // Não falhar o disparo por causa disso, apenas logar
        }
      }

      // Invalidar cache para recarregar (sem aguardar)
      queryClient.invalidateQueries({ queryKey: ['disparos', user.id] });
      queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
      
      // Recarregar perfil para atualizar contador diário
      if (refreshProfile) {
        refreshProfile().catch(err => {
          console.error('Erro ao recarregar perfil:', err);
        });
      }
      // Não mostrar toast aqui, será mostrado no componente

      // Retornar disparo IMEDIATAMENTE após criar a campanha
      // Recipients serão inseridos em background
      console.log(`✅ Campanha criada com sucesso! ${recipientsData.length} recipients serão inseridos em background.`);
      
      // Iniciar disparo apenas se não for agendado
      if (!disparo.scheduled_at) {
        // Iniciar disparo de forma assíncrona sem bloquear
        // Aguardar um pouco mais para garantir que todos os recipients foram salvos
        Promise.resolve().then(async () => {
          // Aguardar tempo suficiente para garantir que recipients foram salvos
          // Aguardar 5 segundos para dar tempo da Backend API processar e do disparo ser salvo
          const waitTime = 5000;
          console.log(`⏳ Aguardando ${waitTime}ms antes de iniciar disparo...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          
          try {
            console.log(`🚀 Iniciando disparo para campanha ${disparo.id}...`);
            await startDisparo(disparo.id);
            console.log('✅ Disparo iniciado com sucesso');
            // Notificação será criada no startDisparo
          } catch (error) {
            console.error('❌ Erro ao iniciar disparo automaticamente:', error);
            // Não falhar a criação da campanha se o disparo falhar
            // O usuário pode iniciar manualmente depois
            toast.warning('Campanha criada, mas não foi possível iniciar automaticamente. Você pode iniciar manualmente na página de campanhas.');
          }
        });
      } else {
        // Se for agendado, o cron job vai processar automaticamente
        console.log(`📅 Campanha agendada para ${new Date(disparo.scheduled_at).toLocaleString('pt-BR')}`);
      }

      return disparo;
    } catch (error) {
      console.error('Erro ao criar disparo:', error);
      toast.error('Erro ao criar campanha');
      throw error;
    }
  };

  const startDisparo = async (disparoId: string) => {
    try {
      // Verificar se o disparo existe e está válido
      const { data: disparo, error: disparoError } = await supabase
        .from('disparos')
        .select('id, status, connection_id, campaign_name, user_id')
        .eq('id', disparoId)
        .single();

      if (disparoError || !disparo) {
        throw new Error('Disparo não encontrado');
      }

      // CRÍTICO: Verificar se há recipients antes de iniciar
      const { data: recipients, error: recipientsError } = await supabase
        .from('disparo_recipients')
        .select('id')
        .eq('disparo_id', disparoId)
        .limit(1);

      if (recipientsError) {
        console.error('Erro ao verificar recipients:', recipientsError);
        throw new Error('Erro ao verificar recipients da campanha');
      }

      if (!recipients || recipients.length === 0) {
        // Nenhum recipient encontrado - marcar como failed
        console.error('❌ Nenhum recipient encontrado para a campanha. Marcando como falha.');
        await supabase
          .from('disparos')
          .update({
            status: 'failed',
            error_message: 'Nenhum recipient foi inserido. Tente criar a campanha novamente.',
          })
          .eq('id', disparoId);
        
        toast.error('Não é possível iniciar a campanha: nenhum recipient foi inserido. Tente criar a campanha novamente.');
        throw new Error('Nenhum recipient encontrado');
      }

      // Verificar se já está em progresso
      if (disparo.status === 'in_progress') {
        // Se já está em progresso, verificar se tem recipients pendentes
        // Se tiver, chamar a função para continuar processando
        const { data: pendingRecipients } = await supabase
          .from('disparo_recipients')
          .select('id')
          .eq('disparo_id', disparoId)
          .eq('status', 'pending')
          .limit(1);

        if (!pendingRecipients || pendingRecipients.length === 0) {
          // Verificar se realmente não há recipients ou se todos foram processados
          const { data: allRecipients } = await supabase
            .from('disparo_recipients')
            .select('id, status')
            .eq('disparo_id', disparoId);

          if (!allRecipients || allRecipients.length === 0) {
            // Nenhum recipient - marcar como failed
            await supabase
              .from('disparos')
              .update({
                status: 'failed',
                error_message: 'Nenhum recipient foi inserido.',
              })
              .eq('id', disparoId);
            toast.error('Campanha sem recipients. Tente criar novamente.');
            return;
          }

          // Todos os recipients foram processados - verificar se deve marcar como concluído
          const sentCount = allRecipients.filter(r => r.status === 'sent').length;
          if (sentCount > 0) {
            toast.info('Campanha já foi concluída');
            return;
          } else {
            toast.info('Campanha já está em andamento e sem recipients pendentes');
            return;
          }
        }
        // Se tiver pendentes, continuar para chamar a função (não atualizar status, já está in_progress)
      } else {
        // Permitir iniciar campanhas scheduled ou pausadas
        if (disparo.status !== 'scheduled' && disparo.status !== 'paused') {
          throw new Error('Só é possível iniciar campanhas agendadas ou pausadas');
        }

        // Atualizar status para in_progress apenas se não estiver já
        await supabase
          .from('disparos')
          .update({
            status: 'in_progress',
            started_at: new Date().toISOString(),
          })
          .eq('id', disparoId);
      }

      // Verificar conexão
      const { data: connection, error: connError } = await supabase
        .from('connections')
        .select('id, status')
        .eq('id', disparo.connection_id)
        .single();

      if (connError || !connection) {
        throw new Error('Conexão não encontrada');
      }

      if (connection.status !== 'online') {
        throw new Error('Conexão não está online');
      }

      // Chamar Edge Function diretamente (como funcionava antes)
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${supabaseUrl}/functions/v1/execute-scheduled-disparos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({
          disparo_id: disparoId,
        }),
      });

      // Não falhar se a Edge Function não responder imediatamente
      // O cron job vai processar de qualquer forma
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
        console.warn('Edge Function não respondeu, mas o cron job vai processar em até 1 minuto:', errorData);
      } else {
        const result = await response.json();
        if (result.success) {
          console.log(`✅ Campanha iniciada: ${result.processed || 0} campanhas processadas`);
        }
      }
      
      // Criar notificação de campanha iniciada
      if (disparo.user_id && disparo.campaign_name) {
        notifyCampaignStarted(disparo.user_id, disparo.campaign_name, disparoId).catch(err => {
          console.error('Erro ao criar notificação de campanha iniciada:', err);
        });
      }

      // Invalidar cache para recarregar
      queryClient.invalidateQueries({ queryKey: ['disparos', user?.id] });

      toast.success('Campanha iniciada! O envio está sendo processado.');
      
      // Invalidar cache para recarregar
      queryClient.invalidateQueries({ queryKey: ['disparos', user?.id] });
    } catch (error) {
      console.error('Erro ao iniciar disparo:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao iniciar campanha');
      
      // Marcar como falha apenas se não foi possível iniciar
      await supabase
        .from('disparos')
        .update({ status: 'failed' })
        .eq('id', disparoId);

      // Criar notificação de falha (buscar disparo novamente se necessário)
      try {
        const { data: disparoData } = await supabase
          .from('disparos')
          .select('user_id, campaign_name')
          .eq('id', disparoId)
          .single();

        if (disparoData?.user_id && disparoData?.campaign_name) {
          const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
          notifyCampaignFailed(disparoData.user_id, disparoData.campaign_name, disparoId, errorMsg).catch(err => {
            console.error('Erro ao criar notificação de campanha falhada:', err);
          });
        }
      } catch (notifError) {
        console.error('Erro ao buscar dados do disparo para notificação:', notifError);
      }
    }
  };

  const pauseDisparo = async (disparoId: string) => {
    try {
      // Buscar dados da campanha antes de pausar
      const { data: disparo } = await supabase
        .from('disparos')
        .select('id, campaign_name, user_id, status')
        .eq('id', disparoId)
        .single();

      if (!disparo) {
        throw new Error('Campanha não encontrada');
      }

      // Verificar se já está pausada
      if (disparo.status === 'paused') {
        toast.info('Campanha já está pausada');
        return;
      }

      // Verificar se pode pausar (só pode pausar se estiver em progresso)
      if (disparo.status !== 'in_progress') {
        toast.error('Só é possível pausar campanhas em andamento');
        return;
      }

      const { error } = await supabase
        .from('disparos')
        .update({ status: 'paused' })
        .eq('id', disparoId);

      if (error) throw error;

      // Criar notificação de campanha pausada
      if (disparo.user_id && disparo.campaign_name) {
        notifyCampaignPaused(disparo.user_id, disparo.campaign_name, disparoId).catch(err => {
          console.error('Erro ao criar notificação de campanha pausada:', err);
        });
      }

      // Atualizar cache otimisticamente
      queryClient.setQueryData<Disparo[]>(['disparos', user?.id], (old) => {
        if (!old) return [];
        return old.map((d) => (d.id === disparoId ? { ...d, status: 'paused' } : d));
      });

      // Invalidar cache para recarregar
      queryClient.invalidateQueries({ queryKey: ['disparos', user?.id] });

      toast.success('Campanha pausada com sucesso');
    } catch (error) {
      console.error('Erro ao pausar disparo:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao pausar campanha');
    }
  };

  const cancelDisparo = async (disparoId: string) => {
    try {
      // Buscar dados da campanha antes de cancelar
      const { data: disparo } = await supabase
        .from('disparos')
        .select('id, campaign_name, user_id')
        .eq('id', disparoId)
        .single();

      const { error } = await supabase
        .from('disparos')
        .update({ status: 'cancelled' })
        .eq('id', disparoId);

      if (error) throw error;

      // Criar notificação de campanha cancelada
      if (disparo?.user_id && disparo?.campaign_name) {
        notifyCampaignCancelled(disparo.user_id, disparo.campaign_name, disparoId).catch(err => {
          console.error('Erro ao criar notificação de campanha cancelada:', err);
        });
      }

      // Atualizar cache otimisticamente
      queryClient.setQueryData<Disparo[]>(['disparos', user?.id], (old) => {
        if (!old) return [];
        return old.map((d) => (d.id === disparoId ? { ...d, status: 'cancelled' } : d));
      });

      toast.success('Campanha cancelada');
    } catch (error) {
      console.error('Erro ao cancelar disparo:', error);
      toast.error('Erro ao cancelar campanha');
    }
  };

  const deleteDisparo = async (disparoId: string) => {
    try {
      // Deletar recipients primeiro (cascade)
      const { error: recipientsError } = await supabase
        .from('disparo_recipients')
        .delete()
        .eq('disparo_id', disparoId);

      if (recipientsError) throw recipientsError;

      // Deletar disparo
      const { error } = await supabase
        .from('disparos')
        .delete()
        .eq('id', disparoId);

      if (error) throw error;

      // Invalidar cache para recarregar
      queryClient.invalidateQueries({ queryKey: ['disparos', user?.id] });
      toast.success('Campanha deletada');
    } catch (error) {
      console.error('Erro ao deletar disparo:', error);
      toast.error('Erro ao deletar campanha');
      throw error;
    }
  };

  const getDisparoRecipients = async (disparoId: string, limit: number = 500): Promise<DisparoRecipient[]> => {
    try {
      // Usar cache do React Query
      const cached = queryClient.getQueryData<DisparoRecipient[]>(['disparo_recipients', disparoId]);
      if (cached) return cached;

      // Selecionar apenas colunas necessárias (reduz tamanho dos dados)
      const { data, error } = await supabase
        .from('disparo_recipients')
        .select('id, disparo_id, name, phone_number, status, sent_at, delivered_at, error_message, created_at')
        .eq('disparo_id', disparoId)
        .order('created_at')
        .limit(limit); // Reduzido de 1000 para 500 (reduz consumo)

      if (error) throw error;
      
      const recipients = data || [];
      // Cachear resultado por 10 minutos
      queryClient.setQueryData(['disparo_recipients', disparoId], recipients);
      return recipients;
    } catch (error) {
      console.error('Erro ao carregar recipients:', error);
      return [];
    }
  };

  return {
    disparos,
    loading,
    createDisparo,
    startDisparo,
    pauseDisparo,
    cancelDisparo,
    deleteDisparo,
    getDisparoRecipients,
    refresh: loadDisparos,
  };
}


