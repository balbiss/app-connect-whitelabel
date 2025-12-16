/**
 * Componente para processar callback do OAuth (Google, etc)
 * Processa o hash da URL e limpa após autenticação
 */

import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

export function OAuthCallbackHandler() {
  const navigate = useNavigate();
  const location = useLocation();
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        // Verificar se há hash na URL (token do OAuth)
        const hash = window.location.hash;
        
        if (hash && (hash.includes('access_token') || hash.includes('error'))) {
          console.log('[OAuthCallback] Processando hash do OAuth...', hash.substring(0, 50));
          
          // Aguardar um pouco para o Supabase processar o hash
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Verificar se há erro no hash
          if (hash.includes('error=')) {
            const errorMatch = hash.match(/error=([^&]+)/);
            const errorDescription = hash.match(/error_description=([^&]+)/);
            const error = errorMatch ? decodeURIComponent(errorMatch[1]) : 'Erro desconhecido';
            const description = errorDescription ? decodeURIComponent(errorDescription[1]) : '';
            
            console.error('[OAuthCallback] Erro no OAuth:', error, description);
            
            // Limpar hash
            window.history.replaceState(null, '', window.location.pathname);
            setProcessing(false);
            navigate('/login', { replace: true });
            return;
          }
          
          // O Supabase processa automaticamente o hash quando há access_token
          // Aguardar o processamento e verificar a sessão
          let attempts = 0;
          const maxAttempts = 10;
          
          while (attempts < maxAttempts) {
            const { data: { session }, error } = await supabase.auth.getSession();
            
            if (error) {
              console.error('[OAuthCallback] Erro ao processar sessão:', error);
              break;
            }

            if (session) {
              console.log('[OAuthCallback] Sessão criada com sucesso');
              
              // Limpar o hash da URL após processar
              window.history.replaceState(null, '', window.location.pathname + window.location.search);
              
              // Aguardar um pouco para garantir que o perfil foi carregado
              await new Promise(resolve => setTimeout(resolve, 800));
              
              // Redirecionar para dashboard
              navigate('/', { replace: true });
              setProcessing(false);
              return;
            }
            
            // Aguardar antes de tentar novamente
            await new Promise(resolve => setTimeout(resolve, 200));
            attempts++;
          }
          
          // Se chegou aqui, não conseguiu criar sessão
          console.warn('[OAuthCallback] Nenhuma sessão encontrada após processar hash');
          // Limpar hash mesmo sem sessão
          window.history.replaceState(null, '', window.location.pathname);
          navigate('/login', { replace: true });
        } else {
          // Não há hash, não precisa processar
          setProcessing(false);
        }
      } catch (error) {
        console.error('[OAuthCallback] Erro ao processar callback:', error);
        // Limpar hash em caso de erro
        window.history.replaceState(null, '', window.location.pathname);
        navigate('/login', { replace: true });
      } finally {
        setProcessing(false);
      }
    };

    handleOAuthCallback();
  }, [navigate, location]);

  // Mostrar loading enquanto processa
  // Isso bloqueia a renderização do resto da aplicação até processar o OAuth
  if (processing && window.location.hash.includes('access_token')) {
    return (
      <div className="fixed inset-0 z-50 tech-grid-bg flex flex-col items-center justify-center gap-4 bg-[hsl(var(--bg-primary))]">
        <div className="w-12 h-12 border-4 border-accent-purple border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground animate-pulse">Processando login...</p>
      </div>
    );
  }

  return null;
}

