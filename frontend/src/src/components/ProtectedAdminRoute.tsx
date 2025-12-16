/**
 * Componente para proteger rotas admin - apenas administradores podem acessar
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface ProtectedAdminRouteProps {
  children: React.ReactNode;
}

export const ProtectedAdminRoute = ({ children }: ProtectedAdminRouteProps) => {
  const { isAdmin, profile, user } = useAdmin();
  const { loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Aguardar o carregamento do perfil
    if (loading) {
      return;
    }

    // Se não tem usuário, não fazer nada (ProtectedRoute vai redirecionar)
    if (!user) {
      return;
    }

    // Aguardar perfil carregar (pode demorar devido ao erro de recursão RLS)
    if (!profile) {
      console.log('🔍 [ProtectedAdminRoute] Aguardando perfil carregar...');
      return;
    }

    // Verificar se é admin
    const adminCheck = profile?.is_admin === true || profile?.email === 'inoovawebpro@gmail.com';
    
    console.log('🔍 [ProtectedAdminRoute] Verificação:', {
      email: profile?.email,
      is_admin: profile?.is_admin,
      adminCheck,
      isAdmin
    });

    if (!adminCheck && !isAdmin) {
      console.log('🔍 [ProtectedAdminRoute] Acesso negado, redirecionando...');
      toast.error("Acesso negado. Apenas administradores podem acessar esta página.");
      navigate('/');
    }
  }, [isAdmin, user, profile, loading, navigate]);

  // Mostrar loading enquanto carrega
  if (loading) {
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

  // Se o perfil ainda não carregou, mostrar loading
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--bg-primary))]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-accent-purple border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Verificando permissões...</p>
          <p className="text-xs text-muted-foreground mt-2">
            Se demorar muito, execute o SQL de correção RLS
          </p>
        </div>
      </div>
    );
  }

  // Verificar se é admin
  const adminCheck = profile?.is_admin === true || profile?.email === 'inoovawebpro@gmail.com';
  
  if (!adminCheck && !isAdmin) {
    return null;
  }

  return <>{children}</>;
};

