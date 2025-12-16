/**
 * Hook para gerenciar vendedores/revendedores
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAdmin } from './useAdmin';

export interface Reseller {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  commission_percentage: number;
  referral_code: string;
  referral_link: string | null;
  active: boolean;
  total_users_activated: number;
  total_revenue: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ResellerStats {
  id: string;
  name: string;
  email: string;
  referral_code: string;
  active: boolean;
  commission_percentage: number;
  total_users: number;
  active_users: number;
  pro_users: number;
  super_pro_users: number;
  total_revenue: number;
  created_at: string;
  updated_at: string;
}

export function useResellers() {
  const { isAdmin } = useAdmin();
  const queryClient = useQueryClient();

  // Query para carregar vendedores
  const { data: resellers = [], isLoading, refetch } = useQuery({
    queryKey: ['resellers'],
    queryFn: async () => {
      if (!isAdmin) return [];
      
      const { data, error } = await supabase
        .from('resellers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as Reseller[];
    },
    enabled: isAdmin,
    staleTime: 1 * 60 * 1000, // 1 minuto
  });

  // Query para estatísticas de vendedores
  const { data: resellerStats = [], isLoading: statsLoading } = useQuery({
    queryKey: ['reseller-stats'],
    queryFn: async () => {
      if (!isAdmin) return [];
      
      const { data, error } = await supabase
        .from('reseller_stats')
        .select('*')
        .order('total_revenue', { ascending: false });

      if (error) throw error;
      return (data || []) as ResellerStats[];
    },
    enabled: isAdmin,
    staleTime: 1 * 60 * 1000,
  });

  // Mutation para criar vendedor
  const createReseller = useMutation({
    mutationFn: async (resellerData: Omit<Reseller, 'id' | 'created_at' | 'updated_at' | 'total_users_activated' | 'total_revenue'>) => {
      if (!isAdmin) throw new Error('Apenas administradores podem criar vendedores');
      
      // Gerar código de referência se não fornecido
      let referralCode = resellerData.referral_code;
      if (!referralCode || referralCode.trim() === '') {
        // Gerar código manualmente se a função RPC não estiver disponível
        const generateCode = () => {
          const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
          let code = '';
          for (let i = 0; i < 8; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
          }
          return code;
        };
        
        // Tentar usar a função RPC primeiro
        try {
          const { data, error } = await supabase.rpc('generate_referral_code');
          if (!error && data) {
            referralCode = data;
          } else {
            // Fallback: gerar código manualmente
            let attempts = 0;
            do {
              referralCode = generateCode();
              const { data: existing } = await supabase
                .from('resellers')
                .select('id')
                .eq('referral_code', referralCode)
                .single();
              if (!existing) break;
              attempts++;
            } while (attempts < 10);
          }
        } catch (rpcError) {
          // Se RPC falhar, gerar manualmente
          let attempts = 0;
          do {
            referralCode = generateCode();
            const { data: existing } = await supabase
              .from('resellers')
              .select('id')
              .eq('referral_code', referralCode)
              .single();
            if (!existing) break;
            attempts++;
          } while (attempts < 10);
        }
      }

      // Gerar link de referência
      const baseUrl = window.location.origin;
      const referralLink = `${baseUrl}/register?ref=${referralCode}`;

      const { data, error } = await supabase
        .from('resellers')
        .insert({
          ...resellerData,
          referral_code: referralCode,
          referral_link: referralLink,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Reseller;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resellers'] });
      queryClient.invalidateQueries({ queryKey: ['reseller-stats'] });
    },
  });

  // Mutation para atualizar vendedor
  const updateReseller = useMutation({
    mutationFn: async ({ id, ...updateData }: Partial<Reseller> & { id: string }) => {
      if (!isAdmin) throw new Error('Apenas administradores podem atualizar vendedores');
      
      // Se atualizar referral_code, atualizar também o link
      if (updateData.referral_code) {
        const baseUrl = window.location.origin;
        updateData.referral_link = `${baseUrl}/register?ref=${updateData.referral_code}`;
      }

      const { data, error } = await supabase
        .from('resellers')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Reseller;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resellers'] });
      queryClient.invalidateQueries({ queryKey: ['reseller-stats'] });
    },
  });

  // Mutation para deletar vendedor
  const deleteReseller = useMutation({
    mutationFn: async (id: string) => {
      if (!isAdmin) throw new Error('Apenas administradores podem deletar vendedores');
      
      const { error } = await supabase
        .from('resellers')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resellers'] });
      queryClient.invalidateQueries({ queryKey: ['reseller-stats'] });
    },
  });

  // Query para usuários de um vendedor específico
  const getResellerUsers = async (resellerId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('reseller_id', resellerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  };

  return {
    resellers,
    resellerStats,
    isLoading,
    statsLoading,
    createReseller,
    updateReseller,
    deleteReseller,
    getResellerUsers,
    refetch,
  };
}

