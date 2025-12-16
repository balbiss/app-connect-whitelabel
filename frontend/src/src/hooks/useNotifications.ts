/**
 * Hook para gerenciar notificações
 */

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

export interface Notification {
  id: string;
  user_id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  read: boolean;
  reference_type: string | null;
  reference_id: string | null;
  created_at: string;
  read_at: string | null;
}

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Query para carregar notificações
  const { data: notifications = [], isLoading, refetch } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      // Selecionar apenas campos necessários (reduz tamanho dos dados transferidos)
      const { data, error } = await supabase
        .from('notifications')
        .select('id, user_id, type, title, message, read, reference_type, reference_id, created_at, read_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []) as Notification[];
    },
    enabled: !!user,
    staleTime: 30 * 1000, // 30 segundos - notificações precisam atualizar mais rápido
    gcTime: 5 * 60 * 1000, // 5 minutos - cache mais curto para notificações
    refetchOnWindowFocus: true, // Refetch ao focar janela (importante para notificações)
    refetchOnReconnect: true, // Refetch ao reconectar (importante)
    refetchInterval: 30 * 1000, // Refetch a cada 30 segundos (mais frequente para notificações)
    retry: 2,
  });

  // Mutation para marcar notificação como lida
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('notifications')
        .update({ 
          read: true,
          read_at: new Date().toISOString()
        })
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
  });

  // Mutation para marcar todas como lidas
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('notifications')
        .update({ 
          read: true,
          read_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
  });

  // Mutation para deletar uma notificação específica
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
  });

  // Mutation para limpar todas as notificações
  const clearAllNotificationsMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Usuário não autenticado');

      console.log('🗑️ Limpando todas as notificações do usuário:', user.id);

      // Primeiro, verificar quantas notificações existem
      const { data: beforeDelete, error: countError } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', user.id);

      console.log('📊 Notificações antes de deletar:', beforeDelete?.length || 0);

      // Tentar deletar
      const { data: deletedData, error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id)
        .select();

      if (error) {
        console.error('❌ Erro ao limpar notificações:', error);
        console.error('   Detalhes do erro:', JSON.stringify(error, null, 2));
        throw error;
      }

      console.log('✅ Notificações deletadas:', deletedData?.length || 0);

      // Verificar se realmente deletou
      const { data: afterDelete, error: afterError } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', user.id);

      console.log('📊 Notificações após deletar:', afterDelete?.length || 0);

      if ((afterDelete?.length || 0) > 0) {
        console.warn('⚠️ ATENÇÃO: Ainda há notificações no banco após deletar!');
        throw new Error('Falha ao deletar notificações - possível problema de RLS');
      }

      console.log('✅ Notificações limpas com sucesso!');
    },
    onMutate: async () => {
      // Cancelar refetch em andamento
      await queryClient.cancelQueries({ queryKey: ['notifications', user?.id] });

      // Salvar snapshot do cache atual
      const previousNotifications = queryClient.getQueryData(['notifications', user?.id]);

      // Atualização otimista: limpar cache imediatamente
      console.log('🔄 Limpando cache local imediatamente (otimistic update)...');
      queryClient.setQueryData(['notifications', user?.id], []);

      return { previousNotifications };
    },
    onError: (err, variables, context) => {
      // Reverter em caso de erro
      if (context?.previousNotifications) {
        queryClient.setQueryData(['notifications', user?.id], context.previousNotifications);
      }
    },
    onSuccess: async () => {
      console.log('♻️ Invalidando cache de notificações...');
      
      // Pequeno delay para garantir que o banco processou
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Invalidar e refetch imediatamente
      await queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
      await queryClient.refetchQueries({ queryKey: ['notifications', user?.id] });
      console.log('✅ Cache invalidado e recarregado!');
    },
    onSettled: () => {
      // Sempre invalidar no final para garantir sincronização
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  // Função para formatar tempo relativo
  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'há poucos segundos';
    if (diffInSeconds < 3600) return `há ${Math.floor(diffInSeconds / 60)} minuto${Math.floor(diffInSeconds / 60) > 1 ? 's' : ''}`;
    if (diffInSeconds < 86400) return `há ${Math.floor(diffInSeconds / 3600)} hora${Math.floor(diffInSeconds / 3600) > 1 ? 's' : ''}`;
    if (diffInSeconds < 604800) return `há ${Math.floor(diffInSeconds / 86400)} dia${Math.floor(diffInSeconds / 86400) > 1 ? 's' : ''}`;
    
    return date.toLocaleDateString('pt-BR');
  };

  return {
    notifications: notifications.map(n => ({
      ...n,
      time: formatTimeAgo(n.created_at),
    })),
    unreadCount,
    isLoading,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    deleteNotification: deleteNotificationMutation.mutate,
    clearAllNotifications: clearAllNotificationsMutation.mutateAsync,
    refetch,
  };
}

