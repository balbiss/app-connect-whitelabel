/**
 * Hook para verificar limites de conexões por plano
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

export interface ConnectionLimitStatus {
  plan: 'pro' | 'super_pro';
  maxConnections: number;
  currentConnections: number;
  remainingConnections: number;
  canCreateConnection: boolean;
}

export function useConnectionLimit() {
  const { user, profile } = useAuth();
  const [limitStatus, setLimitStatus] = useState<ConnectionLimitStatus | null>(null);
  const [loading, setLoading] = useState(true); // Iniciar como true para bloquear até verificar

  useEffect(() => {
    if (user && profile) {
      loadLimitStatus();
    } else if (!user) {
      // Se não houver usuário, resetar estado
      setLimitStatus(null);
      setLoading(false);
    }
  }, [user, profile]);

  const loadLimitStatus = async () => {
    if (!user) return;

    try {
      // Buscar status de conexões
      const { data, error } = await supabase
        .from('user_connection_status')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setLimitStatus({
          plan: data.plan as 'free' | 'pro' | 'super_pro',
          maxConnections: data.max_connections,
          currentConnections: data.current_connections,
          remainingConnections: data.remaining_connections,
          canCreateConnection: data.can_create_connection,
        });
      } else {
        // Fallback se a view não retornar dados
        const maxConn = profile.max_connections || 1;
        const { count } = await supabase
          .from('connections')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        setLimitStatus({
          plan: profile.plan,
          maxConnections: maxConn,
          currentConnections: count || 0,
          remainingConnections: maxConn - (count || 0),
          canCreateConnection: (count || 0) < maxConn,
        });
      }
    } catch (error) {
      console.error('Erro ao carregar limite de conexões:', error);
      // Fallback com dados do perfil
      if (profile) {
        const maxConn = profile.max_connections || 1;
        setLimitStatus({
          plan: profile.plan,
          maxConnections: maxConn,
          currentConnections: 0,
          remainingConnections: maxConn,
          canCreateConnection: true,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return {
    limitStatus,
    loading,
    refresh: loadLimitStatus,
  };
}

