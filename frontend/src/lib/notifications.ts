/**
 * Funções helper para criar notificações no sistema
 */

import { supabase } from './supabase';

export interface CreateNotificationParams {
  userId: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  referenceType?: string | null;
  referenceId?: string | null;
}

/**
 * Cria uma notificação no banco de dados
 */
export async function createNotification(params: CreateNotificationParams): Promise<void> {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        reference_type: params.referenceType || null,
        reference_id: params.referenceId || null,
      });

    if (error) {
      console.error('Erro ao criar notificação:', error);
      // Não lançar erro para não quebrar o fluxo principal
    } else {
      console.log('✅ Notificação criada:', params.title);
    }
  } catch (error) {
    console.error('Erro ao criar notificação:', error);
  }
}

/**
 * Cria notificação quando campanha é criada
 */
export async function notifyCampaignCreated(userId: string, campaignName: string, campaignId: string): Promise<void> {
  await createNotification({
    userId,
    type: 'info',
    title: '🚀 Campanha Criada',
    message: `A campanha "${campaignName}" foi criada com sucesso e está sendo processada.`,
    referenceType: 'disparo',
    referenceId: campaignId,
  });
}

/**
 * Cria notificação quando campanha é iniciada
 */
export async function notifyCampaignStarted(userId: string, campaignName: string, campaignId: string): Promise<void> {
  await createNotification({
    userId,
    type: 'info',
    title: '▶️ Campanha Iniciada',
    message: `A campanha "${campaignName}" foi iniciada e está enviando mensagens.`,
    referenceType: 'disparo',
    referenceId: campaignId,
  });
}

/**
 * Cria notificação quando campanha é pausada
 */
export async function notifyCampaignPaused(userId: string, campaignName: string, campaignId: string): Promise<void> {
  await createNotification({
    userId,
    type: 'warning',
    title: '⏸️ Campanha Pausada',
    message: `A campanha "${campaignName}" foi pausada. Você pode retomar quando quiser.`,
    referenceType: 'disparo',
    referenceId: campaignId,
  });
}

/**
 * Cria notificação quando campanha é cancelada
 */
export async function notifyCampaignCancelled(userId: string, campaignName: string, campaignId: string): Promise<void> {
  await createNotification({
    userId,
    type: 'warning',
    title: '⏹️ Campanha Cancelada',
    message: `A campanha "${campaignName}" foi cancelada.`,
    referenceType: 'disparo',
    referenceId: campaignId,
  });
}

/**
 * Cria notificação quando campanha é concluída
 */
export async function notifyCampaignCompleted(
  userId: string, 
  campaignName: string, 
  campaignId: string,
  sentCount: number,
  totalRecipients: number
): Promise<void> {
  await createNotification({
    userId,
    type: 'success',
    title: '✅ Campanha Concluída',
    message: `A campanha "${campaignName}" foi finalizada! ${sentCount} de ${totalRecipients} mensagens enviadas com sucesso.`,
    referenceType: 'disparo',
    referenceId: campaignId,
  });
}

/**
 * Cria notificação quando campanha falha
 */
export async function notifyCampaignFailed(userId: string, campaignName: string, campaignId: string, error?: string): Promise<void> {
  await createNotification({
    userId,
    type: 'error',
    title: '❌ Campanha Falhou',
    message: `A campanha "${campaignName}" falhou${error ? `: ${error}` : ''}. Verifique os detalhes.`,
    referenceType: 'disparo',
    referenceId: campaignId,
  });
}

/**
 * Cria notificação quando pagamento é confirmado
 */
export async function notifyPaymentConfirmed(
  userId: string,
  amount: number,
  paymentType: string,
  clientName: string,
  billingId: string
): Promise<void> {
  const formattedAmount = new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL' 
  }).format(amount);

  await createNotification({
    userId,
    type: 'success',
    title: '💰 Pagamento Confirmado!',
    message: `Pagamento de ${formattedAmount} de ${clientName} foi confirmado via ${paymentType}.`,
    referenceType: 'billing',
    referenceId: billingId,
  });
}

/**
 * Cria notificação quando pagamento falha
 */
export async function notifyPaymentFailed(
  userId: string,
  amount: number,
  clientName: string,
  billingId: string
): Promise<void> {
  const formattedAmount = new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL' 
  }).format(amount);

  await createNotification({
    userId,
    type: 'error',
    title: '❌ Pagamento Falhou',
    message: `O pagamento de ${formattedAmount} de ${clientName} falhou. Verifique os detalhes.`,
    referenceType: 'billing',
    referenceId: billingId,
  });
}

/**
 * Cria notificação quando instância é conectada
 */
export async function notifyInstanceConnected(userId: string, instanceName: string, connectionId: string): Promise<void> {
  await createNotification({
    userId,
    type: 'success',
    title: '📱 Instância Conectada',
    message: `A instância "${instanceName}" foi conectada com sucesso!`,
    referenceType: 'connection',
    referenceId: connectionId,
  });
}

/**
 * Cria notificação quando instância é desconectada
 */
export async function notifyInstanceDisconnected(userId: string, instanceName: string, connectionId: string): Promise<void> {
  await createNotification({
    userId,
    type: 'warning',
    title: '📱 Instância Desconectada',
    message: `A instância "${instanceName}" foi desconectada.`,
    referenceType: 'connection',
    referenceId: connectionId,
  });
}

/**
 * Cria notificação quando assinatura é ativada
 */
export async function notifySubscriptionActivated(userId: string, planName: string): Promise<void> {
  await createNotification({
    userId,
    type: 'success',
    title: '🎉 Assinatura Ativada!',
    message: `Sua assinatura do plano ${planName} foi ativada com sucesso!`,
    referenceType: 'subscription',
    referenceId: null,
  });
}

/**
 * Cria notificação quando assinatura expira
 */
export async function notifySubscriptionExpired(userId: string): Promise<void> {
  await createNotification({
    userId,
    type: 'warning',
    title: '⚠️ Assinatura Expirada',
    message: 'Sua assinatura expirou. Renove para continuar usando o sistema.',
    referenceType: 'subscription',
    referenceId: null,
  });
}




