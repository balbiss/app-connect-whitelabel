/**
 * Componente que bloqueia funcionalidades quando a assinatura expirou
 */

import { AlertCircle, Calendar, CreditCard, Lock } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { GlassCard } from '@/components/GlassCard';

interface SubscriptionBlockedProps {
  children?: React.ReactNode;
  message?: string;
  showCard?: boolean;
}

export function SubscriptionBlocked({ children, message, showCard = true }: SubscriptionBlockedProps) {
  const { subscriptionExpired, isExpired, profile } = useSubscription();
  const navigate = useNavigate();

  if (!isExpired && !subscriptionExpired) {
    return <>{children}</>;
  }

  const expiredDate = profile?.subscription_ends_at 
    ? new Date(profile.subscription_ends_at).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : null;

  const defaultMessage = message || `Sua assinatura expirou${expiredDate ? ` em ${expiredDate}` : ''}. Renove sua assinatura para continuar usando esta funcionalidade.`;

  if (!showCard) {
    return null;
  }

  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <GlassCard className="max-w-md w-full p-6 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
            <Lock className="w-8 h-8 text-red-400" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-foreground">
              ⚠️ Assinatura Expirada
            </h3>
            <p className="text-sm text-muted-foreground">
              {defaultMessage}
            </p>
          </div>

          {expiredDate && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>Expirou em: {expiredDate}</span>
            </div>
          )}

          <Button
            onClick={() => navigate('/plans')}
            className="w-full bg-gradient-to-r from-accent-purple to-accent-cyan"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            Renovar Assinatura
          </Button>

          <p className="text-xs text-muted-foreground">
            Você pode acessar o sistema, mas não pode usar as funcionalidades até renovar.
          </p>
        </div>
      </GlassCard>
    </div>
  );
}




