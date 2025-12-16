import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

export interface PaymentProvider {
  id: string;
  user_id: string;
  provider: 'mercado_pago' | 'asaas' | 'gerencianet' | 'stripe' | 'pagseguro';
  api_key: string | null;
  api_secret: string | null;
  client_id: string | null;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export function usePaymentProviders() {
  const { user } = useAuth();
  const [providers, setProviders] = useState<PaymentProvider[]>([]);
  const [loading, setLoading] = useState(false);
  const [defaultProvider, setDefaultProvider] = useState<PaymentProvider | null>(null);

  // Carregar provedores do usuário
  const loadProviders = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('payment_providers')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setProviders(data || []);
      
      // Encontrar provedor padrão
      const defaultProv = data?.find(p => p.is_default && p.is_active) || null;
      setDefaultProvider(defaultProv);
    } catch (error) {
      console.error('Erro ao carregar provedores:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Salvar ou atualizar provedor
  const saveProvider = useCallback(async (
    provider: PaymentProvider['provider'],
    apiKey: string,
    apiSecret?: string,
    clientId?: string,
    isDefault: boolean = false
  ) => {
    if (!user?.id) return { success: false, error: 'Usuário não autenticado' };

    try {
      // Se for padrão, desmarcar outros como padrão
      if (isDefault) {
        await supabase
          .from('payment_providers')
          .update({ is_default: false })
          .eq('user_id', user.id)
          .eq('is_default', true);
      }

      // Salvar ou atualizar
      const { data, error } = await supabase
        .from('payment_providers')
        .upsert({
          user_id: user.id,
          provider,
          api_key: apiKey.trim() || null,
          api_secret: apiSecret?.trim() || null,
          client_id: clientId?.trim() || null,
          is_active: !!apiKey.trim(),
          is_default: isDefault,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,provider'
        })
        .select()
        .single();

      if (error) throw error;

      await loadProviders();
      return { success: true, data };
    } catch (error) {
      console.error('Erro ao salvar provedor:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro ao salvar provedor' 
      };
    }
  }, [user?.id, loadProviders]);

  // Remover provedor
  const removeProvider = useCallback(async (providerId: string) => {
    if (!user?.id) return { success: false, error: 'Usuário não autenticado' };

    try {
      const { error } = await supabase
        .from('payment_providers')
        .delete()
        .eq('id', providerId)
        .eq('user_id', user.id);

      if (error) throw error;

      await loadProviders();
      return { success: true };
    } catch (error) {
      console.error('Erro ao remover provedor:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro ao remover provedor' 
      };
    }
  }, [user?.id, loadProviders]);

  // Definir como padrão
  const setAsDefault = useCallback(async (providerId: string) => {
    if (!user?.id) return { success: false, error: 'Usuário não autenticado' };

    try {
      // Desmarcar todos como padrão
      await supabase
        .from('payment_providers')
        .update({ is_default: false })
        .eq('user_id', user.id);

      // Marcar este como padrão
      const { error } = await supabase
        .from('payment_providers')
        .update({ is_default: true })
        .eq('id', providerId)
        .eq('user_id', user.id);

      if (error) throw error;

      await loadProviders();
      return { success: true };
    } catch (error) {
      console.error('Erro ao definir como padrão:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro ao definir como padrão' 
      };
    }
  }, [user?.id, loadProviders]);

  // Carregar ao montar
  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  return {
    providers,
    defaultProvider,
    loading,
    loadProviders,
    saveProvider,
    removeProvider,
    setAsDefault,
  };
}


