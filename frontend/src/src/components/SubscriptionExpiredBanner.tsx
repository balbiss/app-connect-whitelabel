/**
 * Componente que exibe banner de bloqueio quando a assinatura expirou
 */

import { AlertCircle, Calendar, CreditCard } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export function SubscriptionExpiredBanner() {
  const { subscriptionExpired, message, profile } = useSubscription();
  const navigate = useNavigate();

  if (!subscriptionExpired) return null;

  const expiredDate = profile?.subscription_ends_at 
    ? new Date(profile.subscription_ends_at).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-red-600/95 backdrop-blur-sm border-b border-red-700 shadow-lg">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <AlertCircle className="w-5 h-5 text-white flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm sm:text-base">
                ⚠️ Assinatura Expirada
              </p>
              <p className="text-red-100 text-xs sm:text-sm mt-0.5">
                {message || `Sua assinatura expirou${expiredDate ? ` em ${expiredDate}` : ''}. Renove para continuar usando.`}
              </p>
            </div>
          </div>
          <Button
            onClick={() => navigate('/plans')}
            size="sm"
            className="bg-white text-red-600 hover:bg-red-50 flex-shrink-0"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            Renovar
          </Button>
        </div>
      </div>
    </div>
  );
}




