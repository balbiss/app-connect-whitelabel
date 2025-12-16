import { useNavigate } from "react-router-dom";
import { GradientButton } from "@/components/GradientButton";
import { Badge } from "@/components/ui/badge";
import { 
  Check, 
  Zap, 
  MessageSquare, 
  Users, 
  BarChart3, 
  Clock, 
  Shield, 
  Rocket,
  Star,
  ArrowRight,
  Play
} from "lucide-react";

const Landing = () => {
  const navigate = useNavigate();

  const plans = [
    {
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
      cta: 'Começar Teste',
    },
    {
      id: 'pro',
      name: 'PRO',
      price: 'R$ 64,90',
      period: '/mês',
      connections: 2,
      features: [
        '2 conexões WhatsApp',
        'Disparo ilimitado',
        'Suporte por email',
        'Relatórios básicos',
        'Agendamento de campanhas',
      ],
      popular: true,
      cta: 'Assinar Agora',
    },
    {
      id: 'super_pro',
      name: 'SUPER PRO',
      price: 'R$ 99,90',
      period: '/mês',
      connections: 4,
      features: [
        '4 conexões WhatsApp',
        'Disparo ilimitado',
        'Suporte prioritário',
        'Relatórios avançados',
        'Agendamento de campanhas',
        'API personalizada',
        'Webhooks',
      ],
      popular: false,
      cta: 'Assinar Agora',
    },
  ];

  const features = [
    {
      icon: MessageSquare,
      title: 'Disparos em Massa',
      description: 'Envie mensagens personalizadas para milhares de contatos simultaneamente',
    },
    {
      icon: Users,
      title: 'Múltiplas Conexões',
      description: 'Gerencie várias contas WhatsApp em um único painel',
    },
    {
      icon: BarChart3,
      title: 'Relatórios Detalhados',
      description: 'Acompanhe entregas, aberturas e conversões em tempo real',
    },
    {
      icon: Clock,
      title: 'Agendamento Inteligente',
      description: 'Programe campanhas para o melhor horário de envio',
    },
    {
      icon: Zap,
      title: 'Mensagens Personalizadas',
      description: 'Use variáveis dinâmicas para personalizar cada mensagem',
    },
    {
      icon: Shield,
      title: 'Seguro e Confiável',
      description: 'Proteção de dados e conformidade com LGPD',
    },
  ];

  const testimonials = [
    {
      name: 'Carlos Silva',
      role: 'CEO, TechStart',
      content: 'Aumentamos nossa taxa de conversão em 300% usando o VisitaIA. A plataforma é incrível!',
      rating: 5,
    },
    {
      name: 'Mariana Santos',
      role: 'Marketing Manager',
      content: 'Economizamos horas de trabalho manual. Agora enviamos campanhas para milhares de clientes em minutos.',
      rating: 5,
    },
    {
      name: 'João Oliveira',
      role: 'E-commerce Owner',
      content: 'O melhor investimento que fizemos. ROI positivo no primeiro mês!',
      rating: 5,
    },
  ];

  const handlePlanClick = (planId: string) => {
    navigate(`/register?plan=${planId}`);
  };

  return (
    <div className="min-h-screen tech-grid-bg">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/50 backdrop-blur-xl">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-accent-purple to-accent-cyan rounded-lg flex items-center justify-center">
                <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <span className="text-lg sm:text-xl font-bold gradient-text">Connect</span>
            </div>
            <div className="flex items-center gap-3 sm:gap-4">
              <button
                onClick={() => navigate('/login')}
                className="text-sm sm:text-base text-muted-foreground hover:text-foreground transition-colors"
              >
                Entrar
              </button>
              <GradientButton
                onClick={() => navigate('/register')}
                className="text-sm sm:text-base"
              >
                Começar Grátis
              </GradientButton>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-12 sm:py-16 lg:py-24 overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="mb-4 sm:mb-6 px-3 sm:px-4 py-1 sm:py-1.5 text-xs sm:text-sm">
              <Zap className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" />
              Plataforma #1 em Disparos WhatsApp
            </Badge>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 leading-tight">
              <span className="gradient-text">Disparos WhatsApp</span>
              <br />
              com Inteligência Artificial
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto">
              Automatize seus disparos, personalize mensagens e aumente suas conversões. 
              Tudo em uma plataforma poderosa e fácil de usar.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
              <GradientButton
                onClick={() => navigate('/register')}
                size="lg"
                className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4"
              >
                Começar Agora
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
              </GradientButton>
              <button
                onClick={() => navigate('/register?plan=teste')}
                className="flex items-center gap-2 text-sm sm:text-base text-muted-foreground hover:text-foreground transition-colors"
              >
                <Play className="w-4 h-4" />
                Teste Grátis por 3 dias
              </button>
            </div>
            <div className="mt-8 sm:mt-12 flex flex-wrap justify-center gap-4 sm:gap-6 text-sm sm:text-base text-muted-foreground">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 sm:w-5 sm:h-5 text-success" />
                <span>Sem cartão de crédito</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 sm:w-5 sm:h-5 text-success" />
                <span>Cancelamento a qualquer momento</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 sm:w-5 sm:h-5 text-success" />
                <span>Suporte 24/7</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-16 lg:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
              Tudo que você precisa para
              <span className="gradient-text"> escalar seus negócios</span>
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
              Ferramentas poderosas para automatizar seus disparos e aumentar suas conversões
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="glass rounded-2xl p-6 sm:p-8 hover:border-accent-purple/50 transition-all duration-300"
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-accent-purple/20 to-accent-cyan/20 rounded-xl flex items-center justify-center mb-4 sm:mb-6">
                  <feature.icon className="w-6 h-6 sm:w-7 sm:h-7 text-accent-purple" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3">{feature.title}</h3>
                <p className="text-sm sm:text-base text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Plans Section - OCULTA: Planos não são exibidos para usuários */}
      {/* <section className="py-12 sm:py-16 lg:py-24 bg-gradient-to-b from-transparent to-background/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
              Escolha o plano
              <span className="gradient-text"> ideal para você</span>
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
              Comece grátis e escale conforme sua necessidade
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`glass rounded-2xl p-6 sm:p-8 relative ${
                  plan.popular
                    ? 'border-2 border-accent-purple/50 scale-105 sm:scale-110'
                    : 'border border-border/50'
                } hover:border-accent-purple/50 transition-all duration-300`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-accent-purple to-accent-cyan">
                    Mais Popular
                  </Badge>
                )}
                {plan.isTrial && (
                  <Badge variant="secondary" className="absolute -top-3 left-1/2 -translate-x-1/2">
                    Teste Grátis
                  </Badge>
                )}
                <div className="text-center mb-6 sm:mb-8">
                  <h3 className="text-xl sm:text-2xl font-bold mb-2">{plan.name}</h3>
                  <div className="flex items-baseline justify-center gap-1 mb-2">
                    <span className="text-3xl sm:text-4xl font-bold gradient-text">{plan.price}</span>
                    <span className="text-sm sm:text-base text-muted-foreground">{plan.period}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {plan.connections} conexão{plan.connections > 1 ? 'ões' : ''} WhatsApp
                  </p>
                </div>
                <ul className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                      <span className="text-sm sm:text-base text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                <GradientButton
                  onClick={() => handlePlanClick(plan.id)}
                  className="w-full text-base sm:text-lg py-3 sm:py-4"
                  variant={plan.popular ? 'purple-cyan' : 'outline'}
                >
                  {plan.cta}
                </GradientButton>
              </div>
            ))}
          </div>
        </div>
      </section> */}

      {/* Testimonials Section */}
      <section className="py-12 sm:py-16 lg:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
              O que nossos clientes
              <span className="gradient-text"> estão dizendo</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="glass rounded-2xl p-6 sm:p-8 hover:border-accent-purple/50 transition-all duration-300"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 sm:w-5 sm:h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6">
                  "{testimonial.content}"
                </p>
                <div>
                  <p className="font-semibold text-sm sm:text-base">{testimonial.name}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">{testimonial.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 lg:py-24 bg-gradient-to-br from-accent-purple/10 via-accent-cyan/10 to-accent-purple/10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center glass rounded-3xl p-8 sm:p-12 lg:p-16">
            <Rocket className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-6 sm:mb-8 text-accent-purple" />
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6">
              Pronto para começar?
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground mb-6 sm:mb-8">
              Junte-se a milhares de empresas que já estão usando o Connect para escalar seus negócios
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <GradientButton
                onClick={() => navigate('/register')}
                size="lg"
                className="text-base sm:text-lg px-8 sm:px-10 py-4 sm:py-5"
              >
                Começar Agora
                <ArrowRight className="w-5 h-5 ml-2" />
              </GradientButton>
              <GradientButton
                onClick={() => navigate('/register?plan=teste')}
                variant="outline"
                size="lg"
                className="text-base sm:text-lg px-8 sm:px-10 py-4 sm:py-5"
              >
                Teste Grátis
              </GradientButton>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 sm:py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-accent-purple to-accent-cyan rounded-lg flex items-center justify-center">
                <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <span className="text-lg sm:text-xl font-bold gradient-text">Connect</span>
            </div>
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm sm:text-base text-muted-foreground">
              <button
                onClick={() => navigate('/login')}
                className="hover:text-foreground transition-colors"
              >
                Entrar
              </button>
              <button
                onClick={() => navigate('/register')}
                className="hover:text-foreground transition-colors"
              >
                Cadastrar
              </button>
            </div>
          </div>
          <div className="mt-6 sm:mt-8 text-center text-xs sm:text-sm text-muted-foreground">
            <p>© 2025 Connect. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;


