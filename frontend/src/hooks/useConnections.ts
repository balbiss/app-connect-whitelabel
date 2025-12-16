/**
 * Hook para gerenciar conexões WhatsApp
 */

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, Connection } from '@/lib/supabase';
import { whatsappApi, generateInstanceToken } from '@/lib/whatsapp-api';
import { useAuth } from './useAuth';
import { useConnectionLimit } from './useConnectionLimit';
import { toast } from 'sonner';

export function useConnections() {
  const { user } = useAuth();
  const { limitStatus, refresh: refreshLimit } = useConnectionLimit();
  const queryClient = useQueryClient();

  // Query para carregar conexões com cache otimizado
  const { data: connections = [], isLoading: loading, refetch } = useQuery({
    queryKey: ['connections', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      // Selecionar apenas colunas necessárias (reduz tamanho dos dados)
      const { data, error } = await supabase
        .from('connections')
        .select('id, name, phone, status, api_instance_id, api_instance_token, messages_sent, active_days, created_at, updated_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutos - dados ficam frescos por 5min (otimizado de 1min) - conexões mudam raramente
    gcTime: 15 * 60 * 1000, // 15 minutos - cache mantido por 15min (otimizado de 5min)
    refetchOnWindowFocus: false, // Não refetch ao focar janela (reduz requisições)
    refetchOnReconnect: true, // Refetch ao reconectar (importante)
    refetchOnMount: true, // Refetch ao montar (garante dados atualizados)
    retry: 1,
  });

  const loadConnections = useCallback(() => {
    refetch();
  }, [refetch]);

  const createConnection = async (name: string, whatsappNumber: string) => {
    if (!user) throw new Error('Usuário não autenticado');

    // Validar número do WhatsApp (deve ter pelo menos 10 dígitos)
    const cleanNumber = whatsappNumber.replace(/\D/g, '');
    if (cleanNumber.length < 10) {
      throw new Error('Número do WhatsApp inválido. Use o formato: código do país + DDD + número (ex: 559192724395)');
    }

    // Verificar limite de conexões ANTES de qualquer outra operação
    // Buscar status atualizado diretamente do banco para garantir validação
    const { data: limitData, error: limitError } = await supabase
      .from('user_connection_status')
      .select('*')
      .eq('user_id', user.id)
      .single();

    let canCreate = true;
    let maxConnections = 1;
    let currentConnections = 0;
    let plan = 'pro';

    if (!limitError && limitData) {
      canCreate = limitData.can_create_connection;
      maxConnections = limitData.max_connections;
      currentConnections = limitData.current_connections;
      plan = limitData.plan;
    } else {
      // Fallback: buscar do perfil e contar conexões
      const { data: profile } = await supabase
        .from('profiles')
        .select('plan, max_connections')
        .eq('id', user.id)
        .single();

      if (profile) {
        maxConnections = profile.max_connections || 1;
        plan = profile.plan || 'pro';
      }

      const { count } = await supabase
        .from('connections')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      currentConnections = count || 0;
      canCreate = currentConnections < maxConnections;
    }

    // BLOQUEAR se limite atingido
    if (!canCreate) {
      throw new Error(
        `Limite de conexões atingido! Seu plano ${plan} permite ${maxConnections} conexão(ões). ` +
        `Você já possui ${currentConnections} conexão(ões). Faça upgrade para conectar mais números.`
      );
    }

    // Verificar se perfil existe e assinatura está ativa
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('subscription_status, plan')
      .eq('id', user.id)
      .single();

    // BLOQUEAR se não tiver assinatura ativa
    if (!profile || profile.subscription_status !== 'active') {
      throw new Error(
        'Você precisa de uma assinatura ativa para criar conexões. ' +
        'Assine um plano em /plans para começar a usar o Connect!'
      );
    }

    // Se o perfil não existir, não bloquear (pode ser criado automaticamente)
    if (profileError && profileError.code !== 'PGRST116') {
      console.warn('Erro ao verificar perfil:', profileError);
    }

    // Só verificar assinatura se o perfil existir e tiver status definido
    // Permitir criar conexão se não tiver status ou se estiver ativo/trialing
    if (profile && profile.subscription_status) {
      if (profile.subscription_status !== 'active' && profile.subscription_status !== 'trialing') {
        throw new Error(
          'Sua assinatura não está ativa. Renove sua assinatura para continuar usando o serviço.'
        );
      }
    }
    // Se não tiver perfil ou não tiver status, permitir (usuário novo)

    try {
      // Gerar token aleatório único para cada instância
      const token = generateInstanceToken();

      // Criar instância na API
      const apiResponse = await whatsappApi.createInstance(name, token);

      if (!apiResponse.success || !apiResponse.data) {
        throw new Error(apiResponse.message || apiResponse.error || 'Erro ao criar instância na API');
      }

      // Salvar no banco
      const { data, error } = await supabase
        .from('connections')
        .insert({
          user_id: user.id,
          name,
          phone: cleanNumber,
          api_instance_id: apiResponse.data.id,
          api_instance_token: token,
          status: 'offline',
        })
        .select()
        .single();

      if (error) throw error;

      // NÃO iniciar conexão automaticamente - o usuário deve escolher o método depois
      // await whatsappApi.connectInstance(token);

      // Invalidar cache para recarregar
      queryClient.invalidateQueries({ queryKey: ['connections', user.id] });
      await refreshLimit(); // Atualizar status de limite
      toast.success('Instância criada com sucesso!');
      return data;
    } catch (error) {
      console.error('Erro ao criar conexão:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao criar conexão');
      throw error;
    }
  };

  const deleteConnection = async (connectionId: string) => {
    try {
      // Buscar do cache ou do estado atual
      let connection = connections.find((c) => c.id === connectionId) ||
        queryClient.getQueryData<Connection[]>(['connections', user?.id])?.find((c) => c.id === connectionId);
      
      // Se não encontrou no cache, buscar do banco
      if (!connection) {
        const { data, error } = await supabase
          .from('connections')
          .select('id, api_instance_id, api_instance_token')
          .eq('id', connectionId)
          .single();
        
        if (error) throw error;
        connection = data;
      }
      
      if (!connection) throw new Error('Conexão não encontrada');

      // Deletar da API primeiro (antes de deletar do banco)
      if (connection.api_instance_id) {
        console.log('Deletando instância da API:', connection.api_instance_id);
        const deleted = await whatsappApi.deleteInstance(connection.api_instance_id, true);
        if (!deleted) {
          console.warn('Aviso: Não foi possível deletar a instância da API, mas continuando com a deleção do banco...');
          // Não lançar erro aqui - continuar com a deleção do banco mesmo se a API falhar
        } else {
          console.log('Instância deletada da API com sucesso');
        }
      } else {
        console.warn('Aviso: api_instance_id não encontrado, pulando deleção da API');
      }

      // Deletar do banco
      const { error } = await supabase
        .from('connections')
        .delete()
        .eq('id', connectionId);

      if (error) throw error;

      // Invalidar cache para recarregar
      queryClient.invalidateQueries({ queryKey: ['connections', user?.id] });
      await refreshLimit(); // Atualizar status de limite
      toast.success('Conexão deletada com sucesso!');
    } catch (error) {
      console.error('Erro ao deletar conexão:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao deletar conexão');
      throw error;
    }
  };

  const updateConnection = async (connectionId: string, updates: Partial<Connection>) => {
    try {
      const { data, error } = await supabase
        .from('connections')
        .update(updates)
        .eq('id', connectionId)
        .select()
        .single();

      if (error) throw error;

      // Atualizar cache otimisticamente
      queryClient.setQueryData<Connection[]>(['connections', user?.id], (old) => {
        if (!old) return [data];
        return old.map((c) => (c.id === connectionId ? data : c));
      });

      return data;
    } catch (error) {
      console.error('Erro ao atualizar conexão:', error);
      throw error;
    }
  };

  const getQRCode = async (connectionId: string): Promise<string | null> => {
    try {
      // Buscar do cache ou do estado atual
      const connection = connections.find((c) => c.id === connectionId) ||
        queryClient.getQueryData<Connection[]>(['connections', user?.id])?.find((c) => c.id === connectionId);
      
      if (!connection) throw new Error('Conexão não encontrada');

      const response = await whatsappApi.getQRCode(connection.api_instance_token);
      
      console.log('Resposta do getQRCode no hook:', {
        success: response.success,
        code: response.code,
        hasData: !!response.data,
        hasQRCode: !!response.data?.QRCode,
        hasQr: !!response.data?.qr,
      });
      
      // Se a resposta não foi bem-sucedida, verificar o motivo
      if (!response.success) {
        const errorMessage = response.message || response.error || '';
        console.log('Erro ao obter QR Code:', errorMessage);
        // Se já estiver logado, o QR code estará vazio - isso é normal
        if (errorMessage.toLowerCase().includes('already connected') || 
            errorMessage.toLowerCase().includes('already logged in') ||
            errorMessage.toLowerCase().includes('logged in')) {
          console.log('Instância já está conectada/logada');
          return null; // Não há QR code se já está logado
        }
        throw new Error(errorMessage || 'Erro ao obter QR Code');
      }

      // API retorna QRCode, mas normalizamos para qr
      const qrCodeValue = response.data?.qr || response.data?.QRCode;
      
      console.log('QR Code Value extraído:', {
        hasValue: !!qrCodeValue,
        length: qrCodeValue?.length || 0,
        startsWith: qrCodeValue?.substring(0, 50) || 'vazio',
      });
      
      // Se o QR code estiver vazio, pode ser que já esteja logado
      if (!qrCodeValue || qrCodeValue === '' || qrCodeValue.trim() === '') {
        console.log('QR Code vazio - instância pode já estar logada');
        return null;
      }

      if (qrCodeValue && qrCodeValue.trim() !== '') {
        console.log('QR Code obtido com sucesso!');
        // NÃO salvar QR code no banco - ele tem validade e sempre deve ser gerado via requisição
        return qrCodeValue;
      }

      console.log('QR Code não encontrado na resposta');
      return null;
    } catch (error) {
      console.error('Erro ao obter QR Code:', error);
      throw error; // Relançar para que o componente possa tratar
    }
  };

  const checkStatus = async (connectionId: string) => {
    try {
      // Buscar do cache ou do estado atual
      const connection = connections.find((c) => c.id === connectionId) ||
        queryClient.getQueryData<Connection[]>(['connections', user?.id])?.find((c) => c.id === connectionId);
      
      if (!connection) return;

      const statusResponse = await whatsappApi.getStatus(connection.api_instance_token);
      if (statusResponse.success && statusResponse.data) {
        // API retorna Connected/LoggedIn (com C maiúsculo), normalizar
        const connected = statusResponse.data.Connected ?? statusResponse.data.connected ?? false;
        const loggedIn = statusResponse.data.LoggedIn ?? statusResponse.data.loggedIn ?? false;
        const { avatar, name, phone } = statusResponse.data;

        // IMPORTANTE: Só marcar como "online" se estiver CONECTADO E LOGADO
        // Se estiver apenas conectado mas não logado, ainda está aguardando QR code
        if (connected && loggedIn) {
          // Conectado E logado = online
          await updateConnection(connectionId, {
            status: 'online',
            avatar_url: avatar || null,
            phone: phone || null,
            last_connected_at: new Date().toISOString(),
          });
        } else if (connected && !loggedIn) {
          // Conectado mas não logado = ainda aguardando QR code (connecting)
          await updateConnection(connectionId, { status: 'connecting' });
        } else {
          // Não conectado = offline
          await updateConnection(connectionId, { status: 'offline' });
        }
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error);
    }
  };

  const reconnect = async (connectionId: string): Promise<{ needsQRCode: boolean }> => {
    try {
      // Buscar do cache ou do estado atual
      const connection = connections.find((c) => c.id === connectionId) ||
        queryClient.getQueryData<Connection[]>(['connections', user?.id])?.find((c) => c.id === connectionId);
      
      if (!connection) throw new Error('Conexão não encontrada');

      await updateConnection(connectionId, { status: 'connecting' });
      
      // Conectar instância
      const connectResult = await whatsappApi.connectInstance(connection.api_instance_token);
      
      if (!connectResult.success && !connectResult.alreadyConnected) {
        throw new Error(connectResult.error || 'Erro ao conectar instância');
      }

      // Aguardar um pouco para a conexão ser estabelecida
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verificar status após conectar
      const statusResponse = await whatsappApi.getStatus(connection.api_instance_token);
      
      if (statusResponse.success && statusResponse.data) {
        const connected = statusResponse.data.Connected ?? statusResponse.data.connected ?? false;
        const loggedIn = statusResponse.data.LoggedIn ?? statusResponse.data.loggedIn ?? false;
        
        if (connected && loggedIn) {
          // Conectado e logado - sucesso! Não precisa de QR code
          await updateConnection(connectionId, {
            status: 'online',
            avatar_url: statusResponse.data.avatar || null,
            phone: statusResponse.data.phone || null,
            last_connected_at: new Date().toISOString(),
          });
          toast.success('Instância reconectada com sucesso!');
          return { needsQRCode: false };
        } else if (connected && !loggedIn) {
          // Conectado mas não logado - precisa de QR code
          await updateConnection(connectionId, { status: 'connecting' });
          return { needsQRCode: true };
        } else {
          // Não conectado
          await updateConnection(connectionId, { status: 'offline' });
          toast.error('Não foi possível conectar. Tente novamente.');
          return { needsQRCode: false };
        }
      } else {
        // Erro ao verificar status
        await updateConnection(connectionId, { status: 'offline' });
        toast.error('Erro ao verificar status da conexão');
        return { needsQRCode: false };
      }
    } catch (error) {
      console.error('Erro ao reconectar:', error);
      toast.error('Erro ao reconectar');
      await updateConnection(connectionId, { status: 'offline' });
      return { needsQRCode: false };
    }
  };

  const disconnect = async (connectionId: string) => {
    try {
      // Buscar do cache ou do estado atual
      const connection = connections.find((c) => c.id === connectionId) ||
        queryClient.getQueryData<Connection[]>(['connections', user?.id])?.find((c) => c.id === connectionId);
      
      if (!connection) throw new Error('Conexão não encontrada');

      // Tentar desconectar na API
      const success = await whatsappApi.disconnect(connection.api_instance_token);
      
      // Sempre atualizar o status localmente, mesmo se a API retornar erro
      // Isso garante que a UI seja atualizada mesmo se houver problemas na API
      try {
        await updateConnection(connectionId, { status: 'offline' });
      } catch (updateError) {
        console.warn('Erro ao atualizar status localmente:', updateError);
      }
      
      if (success) {
        toast.success('Instância desconectada com sucesso');
      } else {
        // Mesmo se a API retornar false, se conseguimos atualizar localmente, considerar sucesso parcial
        toast.warning('Instância desconectada localmente. Verifique o status na API se necessário.');
      }
    } catch (error) {
      console.error('Erro ao desconectar:', error);
      
      // Mesmo em caso de erro, tentar atualizar o status localmente
      try {
        const connection = connections.find((c) => c.id === connectionId) ||
          queryClient.getQueryData<Connection[]>(['connections', user?.id])?.find((c) => c.id === connectionId);
        if (connection) {
          await updateConnection(connectionId, { status: 'offline' });
          toast.warning('Status atualizado localmente. Verifique a conexão na API.');
        }
      } catch (updateError) {
        console.error('Erro ao atualizar status após erro:', updateError);
        toast.error('Erro ao desconectar instância');
      }
    }
  };

  const logout = async (connectionId: string) => {
    try {
      // Buscar do cache ou do estado atual
      const connection = connections.find((c) => c.id === connectionId) ||
        queryClient.getQueryData<Connection[]>(['connections', user?.id])?.find((c) => c.id === connectionId);
      
      if (!connection) throw new Error('Conexão não encontrada');

      const success = await whatsappApi.logout(connection.api_instance_token);
      
      if (success) {
        await updateConnection(connectionId, { status: 'offline' });
        toast.success('Instância deslogada com sucesso. Será necessário escanear QR code novamente.');
      } else {
        toast.error('Erro ao deslogar instância');
      }
    } catch (error) {
      console.error('Erro ao deslogar:', error);
      toast.error('Erro ao deslogar instância');
    }
  };

  return {
    connections,
    loading,
    createConnection,
    deleteConnection,
    updateConnection,
    getQRCode,
    checkStatus,
    reconnect,
    disconnect,
    logout,
    refresh: loadConnections,
  };
}


