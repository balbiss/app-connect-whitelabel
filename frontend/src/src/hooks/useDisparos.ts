/**
 * Hook para gerenciar disparos (campanhas)
 */

import { useCallback } from 'react';
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
    staleTime: 3 * 60 * 1000, // 3 minutos - dados ficam frescos por 3min (otimizado de 1min)
    gcTime: 10 * 60 * 1000, // 10 minutos - cache mantido por 10min (otimizado de 5min)
    refetchOnWindowFocus: false, // Não refetch ao focar janela (reduz requisições)
    refetchOnReconnect: true, // Refetch ao reconectar (importante)
    refetchOnMount: true, // Refetch ao montar (garante dados atualizados)
    retry: 1,
  });

  const loadDisparos = useCallback(() => {
    refetch();
  }, [refetch]);

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

      // Inserir recipients em lotes otimizados para evitar timeout
      // Reduzido para 100 para evitar timeout com muitos recipients
      const batchSize = 100; // Lote menor para evitar timeout
      const totalBatches = Math.ceil(recipientsData.length / batchSize);
      let insertedCount = 0;
      const failedBatches: number[] = [];
      
      // Para muitos recipients, inserir apenas o primeiro lote e continuar em background
      // Isso permite mostrar sucesso rapidamente
      const shouldProcessInBackground = recipientsData.length > 100;
      const initialBatches = shouldProcessInBackground ? 1 : totalBatches; // Inserir apenas 1 lote inicial (100 recipients)
      const maxInitialRecipients = shouldProcessInBackground ? batchSize : recipientsData.length;
      
      // Inserir apenas o primeiro lote (máximo 1 lote se houver muitos recipients)
      // Isso permite retornar rapidamente
      for (let i = 0; i < Math.min(recipientsData.length, maxInitialRecipients); i += batchSize) {
        const batch = recipientsData.slice(i, i + batchSize);
        const currentBatch = Math.floor(i / batchSize) + 1;
        
        // Log de progresso
        console.log(`Inserindo lote ${currentBatch}/${totalBatches} (${batch.length} recipients)...`);
        
        // Tentar inserir com retry em caso de erro (2 retries para ser mais resiliente)
        let retries = 2;
        let lastError = null;
        let batchInserted = false;
        
        while (retries >= 0) {
          try {
            const { error: recipientsError } = await supabase
              .from('disparo_recipients')
              .insert(batch);

            if (recipientsError) {
              // Se for timeout, tentar novamente
              if ((recipientsError.code === '57014' || recipientsError.message?.includes('timeout')) && retries > 0) {
                retries--;
                lastError = recipientsError;
                console.warn(`Timeout ao inserir lote ${currentBatch}, tentando novamente... (${retries} tentativas restantes)`);
                await new Promise(resolve => setTimeout(resolve, 500)); // Delay maior entre tentativas
                continue;
              }
              throw recipientsError;
            }
            
            // Sucesso, sair do loop de retry
            batchInserted = true;
            insertedCount += batch.length;
            console.log(`✅ Lote ${currentBatch}/${totalBatches} inserido com sucesso (${batch.length} recipients)`);
            break;
          } catch (error: any) {
            if ((error.code === '57014' || error.message?.includes('timeout')) && retries > 0) {
              retries--;
              lastError = error;
              console.warn(`Timeout ao inserir lote ${currentBatch}, tentando novamente... (${retries} tentativas restantes)`);
              await new Promise(resolve => setTimeout(resolve, 500));
              continue;
            }
            // Se não for timeout ou já tentou, registrar mas continuar
            console.error(`Erro ao inserir lote ${currentBatch}:`, error);
            failedBatches.push(currentBatch);
            lastError = error;
            break;
          }
        }
        
        // Se falhou após todas as tentativas, registrar mas continuar (não bloquear)
        if (!batchInserted && lastError) {
          console.error(`❌ Erro ao inserir lote ${currentBatch} após todas as tentativas:`, lastError);
          failedBatches.push(currentBatch);
        }
        
        // Pequeno delay entre lotes para não sobrecarregar o banco
        if (i + batchSize < Math.min(recipientsData.length, maxInitialRecipients)) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      // Continuar inserção em background se houver mais recipients
      const hasRemainingRecipients = recipientsData.length > maxInitialRecipients;
      
      if (hasRemainingRecipients) {
        const remainingRecipients = recipientsData.slice(maxInitialRecipients);
        const remainingBatches = Math.ceil(remainingRecipients.length / batchSize);
        
        console.log(`📦 Continuando inserção em background: ${remainingRecipients.length} recipients restantes (${remainingBatches} lotes)`);
        
        // Continuar inserção em background sem bloquear (não aguardar)
        Promise.resolve().then(async () => {
          let bgInsertedCount = insertedCount; // Começar com o que já foi inserido
          
          for (let j = 0; j < remainingRecipients.length; j += batchSize) {
            const bgBatch = remainingRecipients.slice(j, j + batchSize);
            const bgBatchNum = Math.floor(j / batchSize) + 1 + initialBatches;
            
            try {
              const { error: bgError } = await supabase
                .from('disparo_recipients')
                .insert(bgBatch);
              
              if (!bgError) {
                bgInsertedCount += bgBatch.length;
                console.log(`✅ Lote ${bgBatchNum} inserido em background (${bgBatch.length} recipients) - Total: ${bgInsertedCount}/${recipientsData.length}`);
                
                // Atualizar pending_count na campanha periodicamente
                if (bgBatchNum % 5 === 0 || j + batchSize >= remainingRecipients.length) {
                  await supabase
                    .from('disparos')
                    .update({ 
                      total_recipients: bgInsertedCount,
                      pending_count: bgInsertedCount 
                    })
                    .eq('id', disparo.id);
                }
              } else {
                console.warn(`⚠️ Erro ao inserir lote ${bgBatchNum} em background:`, bgError);
                failedBatches.push(bgBatchNum);
              }
              
              // Pequeno delay entre lotes em background
              if (j + batchSize < remainingRecipients.length) {
                await new Promise(resolve => setTimeout(resolve, 200));
              }
            } catch (bgError) {
              console.error(`❌ Erro ao inserir lote ${bgBatchNum} em background:`, bgError);
              failedBatches.push(bgBatchNum);
            }
          }
          
          // Atualizar total_recipients e pending_count após inserção completa
          await supabase
            .from('disparos')
            .update({ 
              total_recipients: bgInsertedCount,
              pending_count: bgInsertedCount 
            })
            .eq('id', disparo.id);
          console.log(`✅ Inserção em background concluída: ${bgInsertedCount} recipients inseridos`);
        });
      }
      
      // Se nenhum recipient foi inserido nos lotes iniciais, avisar mas não bloquear
      if (insertedCount === 0 && recipientsData.length > 0) {
        console.warn('⚠️ Nenhum recipient foi inserido nos lotes iniciais. Continuando inserção em background...');
        // Não lançar erro - deixar tentar em background
      }
      
      // Se alguns lotes falharam, avisar mas continuar
      if (failedBatches.length > 0) {
        console.warn(`Aviso: ${failedBatches.length} lote(s) falharam ao inserir, mas ${insertedCount} recipients foram inseridos com sucesso.`);
      }

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
      console.log(`✅ Campanha criada com sucesso! ${insertedCount}/${recipientsData.length} recipients inseridos inicialmente. Restante em background.`);
      
      // Iniciar disparo apenas se não for agendado
      if (!disparo.scheduled_at) {
        // Iniciar disparo de forma assíncrona sem bloquear
        // Aguardar um pouco mais para garantir que todos os recipients foram salvos
        Promise.resolve().then(async () => {
          // Aguardar tempo suficiente para garantir que recipients foram salvos
          // Se houver recipients inseridos, aguardar menos tempo, mas sempre aguardar
          const waitTime = insertedCount > 0 ? 3000 : 6000;
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
          toast.info('Campanha já está em andamento e sem recipients pendentes');
          return;
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

      // Chamar a Edge Function execute-scheduled-disparos para processar imediatamente
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      
      // Obter token de autenticação
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Sessão não encontrada. Faça login novamente.');
      }

      // Chamar a função existente execute-scheduled-disparos com o disparo_id específico
      const response = await fetch(`${supabaseUrl}/functions/v1/execute-scheduled-disparos`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          disparo_id: disparoId,
        }),
      });

      // Não falhar se a função não responder imediatamente
      // O cron job vai processar de qualquer forma
      if (!response.ok) {
        console.warn('Edge Function não respondeu, mas o cron job vai processar em até 1 minuto');
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


