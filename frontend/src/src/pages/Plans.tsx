import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { GlassCard } from "@/components/GlassCard";
import { GradientButton } from "@/components/GradientButton";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Zap, CheckCircle, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { BottomNav } from "@/components/BottomNav";
import { Skeleton } from "@/components/Skeleton";

interface PlanFromDB {
  id: string;
  name: string;
  description: string | null;
  price: number;
  checkout_url: string | null;
  max_connections: number;
  features: string[] | null;
  active: boolean;
  display_order: number;
}

const Plans = memo(() => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [plansFromDB, setPlansFromDB] = useState<PlanFromDB[]>([]);
  const [searchParams] = useSearchParams();
  const success = searchParams.get('success');
  const canceled = searchParams.get('canceled');
  const selectedPlanId = searchParams.get('plan');

  // Mostrar mensagem de sucesso ou cancelamento
  useEffect(() => {
    if (success === 'true') {
      toast.success('Pagamento realizado com sucesso! Sua conta foi ativada.');
    } else if (canceled === 'true') {
      toast.info('Pagamento cancelado. Você pode tentar novamente quando quiser.');
    }
  }, [success, canceled]);

  // Carregar planos do banco de dados
  useEffect(() => {
    const loadPlans = async () => {
      try {
        setLoadingPlans(true);
        const { data, error } = await supabase
          .from('plans_config')
          .select('*')
          .eq('active', true)
          .order('display_order', { ascending: true });

        if (error) throw error;
        setPlansFromDB(data || []);
      } catch (error) {
        console.error('Erro ao carregar planos:', error);
        toast.error('Erro ao carregar planos');
      } finally {
        setLoadingPlans(false);
      }
    };

    loadPlans();
  }, []);

  // Scroll para o plano selecionado quando vier da landing page
  useEffect(() => {
    if (selectedPlanId && !loadingPlans) {
      setTimeout(() => {
        const element = document.getElementById(`plan-${selectedPlanId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500);
    }
  }, [selectedPlanId, loadingPlans]);

  // Transformar planos do banco para o formato esperado
  const plans = useMemo(() => {
    // Plano teste (hardcoded, não está no banco)
    const testePlan = {
      id: 'teste',
      name: 'PLANO TESTE',
      price: 'R$ 12,00',
      period: 'por 3 dias',
      connections: 1,
      features: [
        '1 conexão WhatsApp',
        '20 disparos por dia',
        'Válido por 3 dias',
        'Teste todas as funcionalidades',
        'Sem compromisso',
      ],
      popular: false,
      isTrial: true,
      checkout_url: 'https://pay.cakto.com.br/yrbm9mu_641531',
    };

    // Transformar planos do banco
    const dbPlans = plansFromDB.map((plan) => ({
      id: plan.id,
      name: plan.name.toUpperCase(),
      price: new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(plan.price),
      period: '/mês',
      connections: plan.max_connections,
      features: plan.features && Array.isArray(plan.features) 
        ? plan.features 
        : (plan.description ? [plan.description] : []),
      popular: plan.id === 'super_pro', // Marcar super_pro como popular
      isTrial: false,
      checkout_url: plan.checkout_url,
      description: plan.description,
    }));

    // Combinar plano teste com planos do banco
    const allPlans = [testePlan, ...dbPlans];
    console.log('Planos carregados:', allPlans);
    return allPlans;
  }, [plansFromDB]);

  const handleSubscribe = useCallback(async (planId: string) => {
    setLoading(planId);

    if (!profile) {
      toast.error('Você precisa estar logado para assinar um plano');
      setLoading(null);
      return;
    }

    try {
      // Buscar plano
      const plan = plans.find(p => p.id === planId);
      if (!plan) {
        toast.error('Plano não encontrado');
        setLoading(null);
        return;
      }

      // Redirecionar para página de checkout com Sync Pay
      navigate(`/checkout?plan=${planId}`);
      
      toast.info('Redirecionando para o checkout...');
    } catch (error) {
      console.error('Erro ao criar checkout:', error);
      toast.error('Erro ao processar pagamento. Tente novamente.');
    } finally {
      setLoading(null);
    }
  }, [profile, plans, navigate]);

  // Verificar se é plano atual (memoizado)
  const isCurrentPlan = useCallback((planId: string) => {
    return profile?.plan === planId && profile?.subscription_status === 'active';
  }, [profile]);

  const isUpgrade = useCallback((planId: string) => {
    return profile?.plan === 'pro' && planId === 'super_pro';
  }, [profile]);

  const isDowngrade = useCallback((planId: string) => {
    return profile?.plan === 'super_pro' && planId === 'pro';
  }, [profile]);

  return (
    <div className="min-h-screen bg-[hsl(var(--bg-primary))] pb-24">
      <PageHeader title="Planos" showBack />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-4 sm:space-y-6 py-4">
        {/* Mensagem de Sucesso */}
        {success === 'true' && (
          <GlassCard className="border-success/50 bg-success/10 animate-slide-up">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-success flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-success mb-1">Pagamento Realizado!</h3>
                <p className="text-sm text-muted-foreground">
                  Sua conta foi ativada com sucesso. Agora você tem acesso completo a todas as funcionalidades!
                </p>
              </div>
            </div>
          </GlassCard>
        )}

        {/* Mensagem de Cancelamento */}
        {canceled === 'true' && (
          <GlassCard className="border-warning/50 bg-warning/10 animate-slide-up">
            <div className="flex items-center gap-3">
              <XCircle className="w-6 h-6 text-warning flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-warning mb-1">Pagamento Cancelado</h3>
                <p className="text-sm text-muted-foreground">
                  Você pode escolher um plano e tentar novamente quando quiser.
                </p>
              </div>
            </div>
          </GlassCard>
        )}

        {/* Header */}
        <div className="text-center space-y-2">
          <h2 className="text-xl sm:text-2xl font-bold gradient-text">Escolha seu Plano</h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Todos os planos incluem disparo ilimitado
          </p>
        </div>

        {/* Loading */}
        {loadingPlans && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        )}

        {/* Planos */}
        {!loadingPlans && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            {plans.length === 0 ? (
              <GlassCard className="border-warning/50 bg-warning/10">
                <div className="text-center py-8">
                  <h3 className="font-semibold text-warning mb-2">Nenhum Plano Disponível</h3>
                  <p className="text-sm text-muted-foreground">
                    Não há planos configurados no momento. Entre em contato com o suporte.
                  </p>
                </div>
              </GlassCard>
            ) : (
              plans.map((plan) => {
            const currentPlan = isCurrentPlan(plan.id);
            const upgrade = isUpgrade(plan.id);
            const downgrade = isDowngrade(plan.id);

            return (
              <GlassCard
                id={`plan-${plan.id}`}
                key={plan.id}
                glow={plan.popular}
                className={`relative h-full flex flex-col ${plan.popular ? 'border-2 border-accent-purple/50' : ''}`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-accent-purple to-accent-cyan">
                    <Crown className="w-3 h-3 mr-1" />
                    Mais Popular
                  </Badge>
                )}

                <div className="space-y-4 flex flex-col flex-1">
                  {/* Header do Plano */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xl font-bold">{plan.name}</h3>
                      {currentPlan && (
                        <Badge variant="secondary">Plano Atual</Badge>
                      )}
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl sm:text-3xl font-bold gradient-text">
                        {plan.price}
                      </span>
                      <span className="text-xs sm:text-sm text-muted-foreground">
                        {plan.period}
                      </span>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="space-y-2 flex-1">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-success flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                    {plan.isTrial && (
                      <div className="mt-2 p-2 bg-warning/10 rounded-lg border border-warning/20">
                        <p className="text-xs text-warning font-semibold">
                          ⚠️ Plano válido por 3 dias apenas
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Botão */}
                  {currentPlan ? (
                    <GradientButton
                      className="w-full"
                      disabled
                      variant="purple-cyan"
                    >
                      Plano Atual
                    </GradientButton>
                  ) : (
                    <GradientButton
                      className="w-full hover:opacity-90 transition-opacity active:scale-[0.98]"
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={loading !== null}
                      variant={upgrade ? 'pink-red' : 'purple-cyan'}
                    >
                      {loading === plan.id ? (
                        'Processando...'
                      ) : upgrade ? (
                        <>
                          <Zap className="w-4 h-4 mr-2" />
                          Fazer Upgrade
                        </>
                      ) : downgrade ? (
                        'Fazer Downgrade'
                      ) : (
                        'Assinar Agora'
                      )}
                    </GradientButton>
                  )}
                </div>
              </GlassCard>
              );
            })
            )}
          </div>
        )}

        {/* Info */}
        <GlassCard>
          <p className="text-xs text-muted-foreground text-center">
            💳 Pagamento processado pelo Sync Pay de forma segura
            <br />
            🔄 Cancele a qualquer momento
            <br />
            ✅ Todos os planos incluem suporte
          </p>
        </GlassCard>
      </div>

      <BottomNav />
    </div>
  );
});

Plans.displayName = 'Plans';

export default Plans;

