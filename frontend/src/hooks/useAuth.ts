/**
 * Hook para autenticação e gerenciamento de usuário
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, Profile } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const loadingProfileRef = useRef<Set<string>>(new Set()); // Evitar múltiplas chamadas simultâneas
  const profileLoadedRef = useRef<Set<string>>(new Set()); // Rastrear perfis já carregados nesta sessão

  // Definir createProfileIfNotExists primeiro (usado por loadProfileFromDB)
  const createProfileIfNotExists = useCallback(async (userId: string) => {
    try {
      // Buscar dados do usuário do auth
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('Usuário não encontrado ao criar perfil');
        return;
      }

      // Verificar se o perfil já existe antes de tentar criar
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle(); // Usar maybeSingle para não dar erro se não existir

      // Se encontrou o perfil, já existe
      if (existingProfile) {
        console.log('Perfil já existe');
        return;
      }

      // Se o erro não for "não encontrado", pode ser outro problema
      if (checkError && checkError.code !== 'PGRST116') {
        console.warn('Erro ao verificar perfil existente:', checkError);
      }

      // Verificar se há código de referência (reseller)
      let resellerId: string | null = null;
      const referralCode = localStorage.getItem('referral_code') || new URLSearchParams(window.location.search).get('ref');
      
      if (referralCode) {
        // Buscar vendedor pelo código de referência
        const { data: reseller, error: resellerError } = await supabase
          .from('resellers')
          .select('id')
          .eq('referral_code', referralCode.toUpperCase())
          .eq('active', true)
          .single();
        
        if (!resellerError && reseller) {
          resellerId = reseller.id;
          console.log('✅ Usuário associado ao vendedor:', resellerId);
          // Limpar código do localStorage após usar
          localStorage.removeItem('referral_code');
        } else {
          console.warn('⚠️ Código de referência inválido ou vendedor inativo:', referralCode);
        }
      }

      // Criar perfil SEM plano por padrão (usuário precisa assinar)
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: user.email || null,
          name: user.user_metadata?.full_name || user.user_metadata?.name || 'Usuário',
          google_id: user.user_metadata?.provider_id || null,
          avatar_url: user.user_metadata?.avatar_url || null,
          plan: null, // SEM PLANO por padrão
          max_connections: 0, // SEM CONEXÕES por padrão
          subscription_status: null, // SEM ASSINATURA ATIVA por padrão
          reseller_id: resellerId, // Associar ao vendedor se houver código de referência
        });

      if (insertError) {
        // Se o erro for de violação única, significa que já existe (race condition)
        if (insertError.code === '23505') {
          console.log('Perfil já existe (race condition) - OK');
          return;
        }
        
        // Se for erro de política RLS
        if (insertError.code === '42501' || insertError.message?.includes('policy')) {
          console.error('Erro de política RLS ao criar perfil. Execute o SQL de correção no Supabase.');
          throw new Error('Não foi possível criar o perfil. Execute o SQL de correção no Supabase.');
        }
        
        // Outros erros
        console.error('Erro ao criar perfil:', insertError);
        throw insertError;
      }

      console.log('Perfil criado com sucesso');
    } catch (error) {
      console.error('Erro ao criar perfil:', error);
      // Relançar o erro para que o chamador saiba que falhou
      throw error;
    }
  }, []);

  // Definir loadProfileFromDB (usado por loadProfile)
  const loadProfileFromDB = useCallback(async (userId: string) => {
    try {
      // Query otimizada: selecionar apenas campos necessários
      // Usar select('*') para evitar erros se algum campo não existir
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        // Se o perfil não existir, criar automaticamente
        if (error.code === 'PGRST116' || error.message?.includes('0 rows') || error.message?.includes('The result contains 0 rows')) {
          console.log('Perfil não encontrado, criando automaticamente...');
          try {
            await createProfileIfNotExists(userId);
            // Aguardar um pouco para evitar race condition
            await new Promise(resolve => setTimeout(resolve, 500));
            // Tentar carregar novamente
            const { data: newData, error: newError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', userId)
              .single();
            
            if (newError && newError.code !== 'PGRST116') {
              console.error('Erro ao carregar perfil após criação:', newError);
              // Verificar se é erro de recursão RLS
              if (newError.message?.includes('infinite recursion') || newError.message?.includes('recursion')) {
                console.error('❌ ERRO DE RECURSÃO RLS! Execute o SQL: supabase/migrations/007_fix_rls_recursion.sql');
                toast.error('Erro de recursão RLS. Execute o SQL de correção no Supabase.');
              }
              // Mesmo com erro, continuar sem perfil (não bloquear o app)
              setProfile(null);
            } else if (newData) {
              // Salvar no cache
              localStorage.setItem(`profile_${userId}`, JSON.stringify({
                data: newData,
                timestamp: Date.now()
              }));
              setProfile(newData);
            } else {
              setProfile(null);
            }
          } catch (createError) {
            console.error('Erro ao criar perfil:', createError);
            // Não bloquear o app se não conseguir criar o perfil
            setProfile(null);
          }
        } else {
          // Log detalhado do erro
          console.error('❌ Erro ao carregar perfil:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
            error: error
          });
          
          // Verificar se é erro de recursão RLS
          if (error.message?.includes('infinite recursion') || error.message?.includes('recursion')) {
            console.error('❌ ERRO DE RECURSÃO RLS! Execute o SQL: supabase/migrations/007_fix_rls_recursion.sql');
            toast.error('Erro de recursão RLS. Execute o SQL de correção no Supabase.');
          } 
          // Verificar se é erro 400 (Bad Request) - pode ser RLS ou campo inexistente
          else if (error.code === 'PGRST301' || error.status === 400 || error.message?.includes('400')) {
            console.error('❌ Erro 400 - Possível problema de RLS ou campo inexistente');
            console.error('💡 Solução: Execute o SQL de correção RLS: supabase/migrations/007_fix_rls_recursion.sql');
            toast.error('Erro ao carregar perfil. Verifique as políticas RLS no Supabase.');
          }
          // Não bloquear o app, apenas logar o erro
          setProfile(null);
        }
      } else {
        // Salvar no cache
        localStorage.setItem(`profile_${userId}`, JSON.stringify({
          data,
          timestamp: Date.now()
        }));
        
        // Debug log (apenas em desenvolvimento)
        if (process.env.NODE_ENV === 'development') {
          console.log('🔍 [useAuth] Profile loaded:', {
            id: data?.id,
            email: data?.email,
            is_admin: data?.is_admin,
            is_admin_type: typeof data?.is_admin,
            is_blocked: data?.is_blocked
          });
        }
        setProfile(data);
      }
    } catch (error: any) {
      console.error('Erro ao carregar perfil do DB:', error);
      // Verificar se é erro de recursão RLS
      if (error?.message?.includes('infinite recursion') || error?.message?.includes('recursion')) {
        console.error('❌ ERRO DE RECURSÃO RLS! Execute o SQL: supabase/migrations/007_fix_rls_recursion.sql');
        toast.error('Erro de recursão RLS. Execute o SQL de correção no Supabase.');
      }
      // Não bloquear o app
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [createProfileIfNotExists]);

  // Definir loadProfile (usado pelo useEffect)
  const loadProfile = useCallback(async (userId: string) => {
    // Evitar múltiplas chamadas simultâneas para o mesmo usuário
    if (loadingProfileRef.current.has(userId)) {
      return;
    }

    // Se já carregou o perfil recentemente, usar cache
    if (profileLoadedRef.current.has(userId)) {
      const cacheKey = `profile_${userId}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const { data: cachedData, timestamp } = JSON.parse(cached);
          const now = Date.now();
          // Usar cache se tiver menos de 30 segundos
          if (now - timestamp < 30000) {
            setProfile(cachedData);
            setLoading(false);
            return;
          }
        } catch (e) {
          // Cache inválido, continuar com query
        }
      }
    }

    loadingProfileRef.current.add(userId);

    try {
      // Verificar cache local primeiro (últimos 30 segundos)
      const cacheKey = `profile_${userId}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const { data: cachedData, timestamp } = JSON.parse(cached);
          const now = Date.now();
          // Usar cache se tiver menos de 30 segundos
          if (now - timestamp < 30000) {
            setProfile(cachedData);
            setLoading(false);
            profileLoadedRef.current.add(userId);
            // Carregar em background para atualizar (sem bloquear)
            setTimeout(() => {
              loadProfileFromDB(userId).finally(() => {
                loadingProfileRef.current.delete(userId);
              });
            }, 1000);
            return;
          }
        } catch (e) {
          // Cache inválido, continuar com query
        }
      }

      // Carregar do banco de dados
      await loadProfileFromDB(userId);
      profileLoadedRef.current.add(userId);
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
      // Não bloquear o app
      setProfile(null);
      setLoading(false);
    } finally {
      loadingProfileRef.current.delete(userId);
    }
  }, [loadProfileFromDB]);

  // useEffect que usa loadProfile
  useEffect(() => {
    let mounted = true;
    
    // Função para processar sessão
    const processSession = async () => {
      try {
        // Se há hash na URL, aguardar um pouco para o Supabase processar
        if (window.location.hash && window.location.hash.includes('access_token')) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (error) {
          console.error('[useAuth] Erro ao obter sessão:', error);
          setLoading(false);
          return;
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          loadProfile(session.user.id);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('[useAuth] Erro ao processar sessão:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };
    
    processSession();

    // Listener para mudanças de autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
        profileLoadedRef.current.clear();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  };

  const signUp = async (email: string, password: string, name?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name || 'Usuário',
          full_name: name || 'Usuário',
        },
      },
    });

    if (error) throw error;
    return data;
  };

  const signInWithGoogle = async () => {
    // Usar o domínio atual ou fallback para produção
    const redirectUrl = typeof window !== 'undefined' 
      ? `${window.location.origin}/`
      : 'https://connect.visitaia.com.br/';
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      // Melhorar mensagem de erro para provedor não habilitado
      if (error.message?.includes('provider is not enabled') || 
          error.message?.includes('Unsupported provider') ||
          error.status === 400) {
        throw new Error(
          'O provedor Google não está habilitado no Supabase. ' +
          'Por favor, habilite o Google OAuth em Authentication > Providers no dashboard do Supabase.'
        );
      }
      throw error;
    }
    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    navigate('/login');
  };

  // Função para forçar recarregamento do perfil (ignorando cache)
  const refreshProfile = useCallback(async () => {
    if (!user) return;
    
    // Limpar cache local
    const cacheKey = `profile_${user.id}`;
    localStorage.removeItem(cacheKey);
    profileLoadedRef.current.delete(user.id);
    
    // Recarregar do banco
    await loadProfileFromDB(user.id);
  }, [user, loadProfileFromDB]);

  return {
    user,
    session,
    profile,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    loadProfile,
    refreshProfile,
  };
}
