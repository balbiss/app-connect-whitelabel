/**
 * Hook para verificar status da assinatura do usuário
 */

import { useAuth } from './useAuth';
import { useAdmin } from './useAdmin';
import { useMemo } from 'react';

export function useSubscription() {
  const { profile } = useAuth();
  const { isAdmin } = useAdmin();

  const subscriptionStatus = useMemo(() => {
    if (!profile) {
      return {
        hasActiveSubscription: false,
        plan: null,
        subscriptionStatus: null,
        canCreate: false,
        canDisparar: false,
        dailyDisparosLimit: null,
        dailyDisparosCount: 0,
        remainingDisparos: null,
        trialExpired: false,
        message: 'Você precisa estar logado para usar esta funcionalidade.',
      };
    }

    // Admins sempre têm acesso (bypass)
    if (isAdmin) {
      return {
        hasActiveSubscription: true,
        plan: profile.plan || 'super_pro',
        subscriptionStatus: 'active',
        canCreate: true,
        canDisparar: true,
        dailyDisparosLimit: null,
        dailyDisparosCount: 0,
        remainingDisparos: null,
        trialExpired: false,
        message: null,
      };
    }

    const hasActiveSubscription = profile.subscription_status === 'active';
    const plan = profile.plan || null;
    const subscriptionStatus = profile.subscription_status || null;

    // Verificar se plano teste expirou
    const trialExpired = plan === 'teste' && profile.trial_ends_at 
      ? new Date(profile.trial_ends_at) < new Date()
      : false;

    // Verificar se a data de expiração da assinatura passou
    const subscriptionExpired = profile.subscription_ends_at 
      ? new Date(profile.subscription_ends_at) < new Date()
      : false;

    // Calcular limites diários
    const dailyDisparosLimit = profile.daily_disparos_limit || null;
    const dailyDisparosCount = profile.daily_disparos_count || 0;
    const remainingDisparos = dailyDisparosLimit 
      ? Math.max(0, dailyDisparosLimit - dailyDisparosCount)
      : null;

    // Debug: Log do status da assinatura
    if (process.env.NODE_ENV === 'development') {
      console.log('[useSubscription] Status:', {
        subscription_status: profile.subscription_status,
        plan: profile.plan,
        hasActiveSubscription,
        trialExpired,
        subscriptionExpired,
        subscription_ends_at: profile.subscription_ends_at,
        dailyDisparosLimit,
        dailyDisparosCount,
        remainingDisparos,
      });
    }

    // Verificar se pode disparar (considerando limite diário e data de expiração)
    // NÃO permitir se:
    // 1. Trial expirou OU
    // 2. Assinatura expirou (subscription_ends_at passou)
    const hasPlan = plan !== null;
    const isExpired = trialExpired || subscriptionExpired;
    const canDisparar = !isExpired && (
      (hasActiveSubscription && (dailyDisparosLimit === null || (remainingDisparos !== null && remainingDisparos > 0))) ||
      (hasPlan && !hasActiveSubscription && (dailyDisparosLimit === null || (remainingDisparos !== null && remainingDisparos > 0))) || // Permitir se tiver plano mesmo sem assinatura ativa
      (dailyDisparosLimit === null && !hasActiveSubscription && !hasPlan) // Permitir disparar se não tiver limite configurado, mesmo sem assinatura ativa
    );

    let message = null;
    if (subscriptionExpired) {
      // Prioridade: Se a assinatura expirou, mostrar mensagem de expiração
      const expiredDate = profile.subscription_ends_at 
        ? new Date(profile.subscription_ends_at).toLocaleDateString('pt-BR')
        : 'data desconhecida';
      message = `Sua assinatura expirou em ${expiredDate}. Renove sua assinatura para continuar usando o sistema.`;
    } else if (trialExpired) {
      message = 'Seu plano de teste expirou. Assine um plano para continuar usando!';
    } else if (!hasActiveSubscription && dailyDisparosLimit !== null) {
      // Se tem limite diário mas não tem assinatura ativa, precisa assinar
      message = 'Você precisa de uma assinatura ativa para usar esta funcionalidade. Assine um plano para começar!';
    } else if (dailyDisparosLimit !== null && remainingDisparos !== null && remainingDisparos === 0) {
      message = `Você atingiu o limite diário de ${dailyDisparosLimit} disparos. O limite será resetado amanhã.`;
    } else if (!hasActiveSubscription && dailyDisparosLimit === null) {
      // Se não tem limite e não tem assinatura, pode ser que precise ativar
      message = 'Você precisa de uma assinatura ativa. Verifique seu plano ou entre em contato com o suporte.';
    }

    return {
      hasActiveSubscription: hasActiveSubscription && !trialExpired && !subscriptionExpired,
      plan,
      subscriptionStatus,
      canCreate: (hasActiveSubscription || dailyDisparosLimit === null) && !trialExpired && !subscriptionExpired,
      canDisparar,
      dailyDisparosLimit,
      dailyDisparosCount,
      remainingDisparos,
      trialExpired,
      subscriptionExpired,
      isExpired: trialExpired || subscriptionExpired,
      message,
    };
  }, [profile, isAdmin]);

  return subscriptionStatus;
}

