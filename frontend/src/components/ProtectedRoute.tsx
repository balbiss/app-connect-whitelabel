/**
 * Componente para proteger rotas - apenas usuários autenticados podem acessar
 */

import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [timeoutReached, setTimeoutReached] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Timeout de 10 segundos para evitar loading infinito
  useEffect(() => {
    if (loading) {
      timeoutRef.current = setTimeout(() => {
        setTimeoutReached(true);
      }, 10000); // 10 segundos
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setTimeoutReached(false);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [loading]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    // Verificar se usuário está bloqueado
    if (profile && profile.is_blocked) {
      toast.error("Sua conta foi bloqueada. Entre em contato com o suporte.");
      // Não deslogar, apenas mostrar mensagem
    }
  }, [profile]);

  // Se timeout foi atingido, redirecionar para login
  if (timeoutReached && !user) {
    navigate('/login');
    return null;
  }

  if (loading && !timeoutReached) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--bg-primary))]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-accent-purple border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Bloquear acesso se usuário estiver bloqueado
  if (profile?.is_blocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--bg-primary))]">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 border-4 border-destructive border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Conta Bloqueada</h2>
          <p className="text-muted-foreground mb-4">
            Sua conta foi bloqueada. Entre em contato com o suporte para mais informações.
          </p>
          <p className="text-sm text-muted-foreground">
            Email: {profile.email || 'suporte@connect.com'}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};



