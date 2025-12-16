/**
 * Página de Checkout com QR Code PIX do Sync Pay
 */

import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { GlassCard } from '@/components/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Check, Loader2, QrCode, ArrowLeft, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSyncPay } from '@/hooks/useSyncPay';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { BottomNav } from '@/components/BottomNav';

export default function Checkout() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { createPixPayment, checkTransaction, loading } = useSyncPay();
  
  const planId = searchParams.get('plan');
  const transactionId = searchParams.get('transaction_id');

  const [pixData, setPixData] = useState<{
    qr_code: string | null;
    qr_code_base64: string | null;
    copy_paste: string | null;
    transaction_id: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [plan, setPlan] = useState<any>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  // Carregar plano
  useEffect(() => {
    const loadPlan = async () => {
      if (!planId) return;

      try {
        const { data, error } = await supabase
          .from('plans_config')
          .select('*')
          .eq('id', planId)
          .single();

        if (error) {
          // Se não encontrar no banco, usar dados hardcoded como fallback
          console.warn('Plano não encontrado no banco, usando dados padrão:', error);
          const defaultPlans: Record<string, any> = {
            'teste': {
              id: 'teste',
              name: 'PLANO TESTE',
              price: 12.00,
              max_connections: 1,
              description: 'Plano de teste válido por 3 dias',
              features: [
                '1 conexão WhatsApp',
                '20 disparos por dia',
                'Válido por 3 dias',
                'Teste todas as funcionalidades',
                'Sem compromisso',
              ],
            },
            'pro': {
              id: 'pro',
              name: 'PRO',
              price: 64.90,
              max_connections: 2,
              description: 'Plano profissional com recursos essenciais',
              features: [
                '2 conexões WhatsApp',
                'Disparo ilimitado',
                'Suporte por email',
                'Relatórios básicos',
                'Agendamento de campanhas',
              ],
            },
            'super_pro': {
              id: 'super_pro',
              name: 'SUPER PRO',
              price: 99.90,
              max_connections: 4,
              description: 'Plano completo com todos os recursos',
              features: [
                '4 conexões WhatsApp',
                'Disparo ilimitado',
                'Suporte prioritário',
                'Relatórios avançados',
                'Agendamento de campanhas',
                'API personalizada',
                'Webhooks',
              ],
            },
          };
          
          const defaultPlan = defaultPlans[planId];
          if (defaultPlan) {
            setPlan(defaultPlan);
            return;
          }
          throw error;
        }
        setPlan(data);
      } catch (error) {
        console.error('Erro ao carregar plano:', error);
        toast.error('Erro ao carregar informações do plano');
      }
    };

    loadPlan();
  }, [planId]);

  // Se já tiver transaction_id, carregar dados do PIX
  useEffect(() => {
    const loadPixData = async () => {
      if (!transactionId) return;

      try {
        const { data, error } = await supabase
          .from('syncpay_transactions')
          .select('*')
          .eq('transaction_id', transactionId)
          .eq('user_id', profile?.id)
          .single();

        if (error) throw error;

        if (data) {
          setPixData({
            qr_code: data.qr_code,
            qr_code_base64: data.qr_code_base64,
            copy_paste: data.copy_paste,
            transaction_id: data.transaction_id,
          });
        }
      } catch (error) {
        console.error('Erro ao carregar dados do PIX:', error);
      }
    };

    if (transactionId && profile?.id) {
      loadPixData();
    }
  }, [transactionId, profile?.id]);

  // Verificar status do pagamento periodicamente (silencioso - erros não são mostrados ao usuário)
  useEffect(() => {
    if (!pixData?.transaction_id || checkingStatus) return;

    const interval = setInterval(async () => {
      setCheckingStatus(true);
      try {
        const transaction = await checkTransaction(pixData.transaction_id);
        
        // Se a consulta falhar (retornar null), apenas continua tentando silenciosamente
        if (!transaction) {
          setCheckingStatus(false);
          return;
        }
        
        if (transaction.status === 'paid' || transaction.status === 'approved' || transaction.status === 'completed') {
          toast.success('Pagamento confirmado! Redirecionando...');
          clearInterval(interval);
          setTimeout(() => {
            navigate('/plans?success=true');
          }, 2000);
        } else if (transaction.status === 'failed' || transaction.status === 'cancelled' || transaction.status === 'expired') {
          // Apenas logar, não mostrar erro ao usuário
          console.log('Pagamento falhou ou foi cancelado:', transaction.status);
          clearInterval(interval);
        }
      } catch (error) {
        // Erro silencioso - não mostrar para o usuário
        console.error('Erro ao verificar status (silencioso):', error);
      } finally {
        setCheckingStatus(false);
      }
    }, 10000); // Verificar a cada 10 segundos

    return () => clearInterval(interval);
  }, [pixData?.transaction_id, checkTransaction, navigate, checkingStatus]);

  const handleGeneratePix = async () => {
    if (!profile || !plan) {
      toast.error('Dados incompletos');
      return;
    }

    const payment = await createPixPayment({
      planId: plan.id,
      amount: plan.price,
      description: `Assinatura ${plan.name}`,
      userId: profile.id,
    });

    if (payment && payment.transaction_id) {
      setPixData({
        qr_code: payment.qr_code,
        qr_code_base64: payment.qr_code_base64,
        copy_paste: payment.copy_paste,
        transaction_id: payment.transaction_id,
      });

      // Atualizar URL com transaction_id
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.set('transaction_id', payment.transaction_id);
      navigate(`/checkout?${newSearchParams.toString()}`, { replace: true });
    }
  };

  const handleCopyPix = () => {
    if (pixData?.copy_paste) {
      navigator.clipboard.writeText(pixData.copy_paste);
      setCopied(true);
      toast.success('Chave PIX copiada!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!plan) {
    return (
      <div className="min-h-screen bg-[hsl(var(--bg-primary))] pb-24">
        <PageHeader title="Checkout" showBack />
        <div className="max-w-lg mx-auto px-4 py-8">
          <GlassCard>
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Carregando informações do plano...</p>
            </div>
          </GlassCard>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--bg-primary))] pb-24">
      <PageHeader title="Checkout" showBack />

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Coluna Esquerda: Informações do Plano */}
          <div className="space-y-6">
            <GlassCard>
              <div className="space-y-4">
                <div className="space-y-2">
                  <h2 className="text-xl font-bold">{plan.name}</h2>
                  <p className="text-2xl font-bold text-primary">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(plan.price)}
                  </p>
                  {plan.description && (
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                  )}
                </div>

                {/* Benefícios do Plano */}
                {plan.features && Array.isArray(plan.features) && plan.features.length > 0 && (
                  <div className="pt-4 border-t border-border/50">
                    <h3 className="text-sm font-semibold mb-3 text-muted-foreground">
                      O que está incluído:
                    </h3>
                    <div className="space-y-2">
                      {plan.features.map((feature: string, index: number) => (
                        <div key={index} className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-success flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </GlassCard>
          </div>

          {/* Coluna Direita: Pagamento */}
          <div className="space-y-6">
            {/* Botão para gerar PIX (se não tiver PIX gerado) */}
            {!pixData && (
              <GlassCard>
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-4">
                      Clique no botão abaixo para gerar o QR Code PIX e finalizar o pagamento
                    </p>
                  </div>
                  <Button
                    onClick={handleGeneratePix}
                    disabled={loading}
                    className="w-full"
                    size="lg"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Gerando PIX...
                      </>
                    ) : (
                      <>
                        <QrCode className="w-4 h-4 mr-2" />
                        Gerar QR Code PIX
                      </>
                    )}
                  </Button>
                </div>
              </GlassCard>
            )}

            {/* QR Code PIX */}
            {pixData && (
              <GlassCard>
                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold mb-1">Escaneie o QR Code</h3>
                    <p className="text-sm text-muted-foreground mb-6">
                      ou copie a chave PIX abaixo
                    </p>
                    
                    {pixData.qr_code_base64 ? (
                      <div className="flex justify-center mb-6">
                        <div className="p-4 bg-white rounded-xl shadow-lg">
                          <img
                            src={pixData.qr_code_base64}
                            alt="QR Code PIX"
                            className="w-full max-w-[280px] h-auto object-contain rounded-lg"
                            style={{ imageRendering: 'crisp-edges' }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-center mb-6">
                        <div className="w-full max-w-[280px] aspect-square border-2 border-border rounded-xl flex items-center justify-center bg-muted p-8">
                          <QrCode className="w-32 h-32 text-muted-foreground" />
                        </div>
                      </div>
                    )}
                  </div>

                  {pixData.copy_paste && (
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Chave PIX (Copiar e Colar)</Label>
                      <div className="flex gap-2">
                        <Input
                          value={pixData.copy_paste}
                          readOnly
                          className="font-mono text-xs flex-1 break-all"
                        />
                        <Button
                          onClick={handleCopyPix}
                          variant="outline"
                          size="icon"
                          className="flex-shrink-0"
                        >
                          {copied ? (
                            <Check className="w-4 h-4 text-success" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                      {copied && (
                        <p className="text-xs text-success text-center">
                          Chave PIX copiada com sucesso!
                        </p>
                      )}
                    </div>
                  )}

                  {checkingStatus && (
                    <div className="text-center py-3 bg-primary/10 rounded-lg border border-primary/20">
                      <Loader2 className="w-5 h-5 animate-spin inline mr-2 text-primary" />
                      <span className="text-sm text-muted-foreground">
                        Aguardando confirmação do pagamento...
                      </span>
                    </div>
                  )}

                  <div className="pt-4 border-t border-border/50">
                    <Button
                      onClick={() => navigate('/plans')}
                      variant="outline"
                      className="w-full"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Voltar para Planos
                    </Button>
                  </div>
                </div>
              </GlassCard>
            )}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

