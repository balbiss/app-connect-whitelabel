/**
 * Hook para gerenciar pagamentos via Sync Pay
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface CreatePixPaymentParams {
  planId: string;
  amount: number;
  description: string;
  userId: string;
}

interface PixPaymentResponse {
  success: boolean;
  transaction_id: string;
  qr_code: string | null;
  qr_code_base64: string | null;
  copy_paste: string | null;
  status: string;
}

export function useSyncPay() {
  const [loading, setLoading] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [tokenExpiresAt, setTokenExpiresAt] = useState<Date | null>(null);

  /**
   * Gerar token de autenticação Sync Pay (busca credenciais do system_settings)
   */
  const generateAuthToken = useCallback(async (): Promise<string | null> => {
    try {
      // Verificar se já temos um token válido
      if (accessToken && tokenExpiresAt && tokenExpiresAt > new Date()) {
        return accessToken;
      }

      // Edge Function busca credenciais automaticamente do system_settings
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Usuário não autenticado');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/syncpay-auth-token`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          // Não envia credenciais - Edge Function busca do banco
          body: JSON.stringify({}),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao gerar token de autenticação');
      }

      const data = await response.json();
      
      if (data.success && data.access_token) {
        setAccessToken(data.access_token);
        // Token expira em 1 hora (3600 segundos)
        const expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + (data.expires_in || 3600));
        setTokenExpiresAt(expiresAt);
        return data.access_token;
      }

      throw new Error('Token não retornado na resposta');
    } catch (error: any) {
      console.error('Erro ao gerar token Sync Pay:', error);
      toast.error(error.message || 'Erro ao gerar token de autenticação');
      return null;
    }
  }, [accessToken, tokenExpiresAt]);

  /**
   * Criar pagamento PIX
   */
  const createPixPayment = useCallback(async (
    params: CreatePixPaymentParams
  ): Promise<PixPaymentResponse | null> => {
    setLoading(true);
    try {
      // Gerar token de autenticação (busca credenciais automaticamente)
      const token = await generateAuthToken();
      if (!token) {
        throw new Error('Não foi possível obter token de autenticação');
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Usuário não autenticado');
      }

      // Criar pagamento PIX
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/syncpay-create-pix`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            access_token: token,
            amount: params.amount.toString(),
            description: params.description,
            external_reference: `subscription_${params.userId}_${params.planId}_${Date.now()}`,
            user_id: params.userId,
            plan_id: params.planId,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao criar pagamento PIX');
      }

      const data = await response.json();
      
      if (data.success) {
        return {
          success: true,
          transaction_id: data.transaction_id,
          qr_code: data.qr_code,
          qr_code_base64: data.qr_code_base64,
          copy_paste: data.copy_paste,
          status: data.status,
        };
      }

      throw new Error('Pagamento não foi criado com sucesso');
    } catch (error: any) {
      console.error('Erro ao criar pagamento PIX:', error);
      toast.error(error.message || 'Erro ao criar pagamento PIX');
      return null;
    } finally {
      setLoading(false);
    }
  }, [generateAuthToken]);

  /**
   * Consultar status de transação
   */
  const checkTransaction = useCallback(async (
    transactionId: string
  ): Promise<any | null> => {
    try {
      // Gerar token de autenticação (busca credenciais automaticamente)
      const token = await generateAuthToken();
      if (!token) {
        throw new Error('Não foi possível obter token de autenticação');
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Usuário não autenticado');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/syncpay-check-transaction?access_token=${token}&transaction_id=${transactionId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao consultar transação');
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      // Erro silencioso - não mostrar para o usuário
      console.error('Erro ao consultar transação (silencioso):', error);
      return null;
    }
  }, [generateAuthToken]);

  return {
    loading,
    createPixPayment,
    checkTransaction,
    generateAuthToken,
  };
}

