import { useMemo, useCallback, memo, useEffect, useState, useRef } from "react";
import { Bell, TrendingUp, Smartphone, Send, Play, Pause, Calendar, CheckCircle, XCircle, Clock, AlertCircle, Shield, Users, DollarSign, Contact } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { GradientButton } from "@/components/GradientButton";
import { Progress } from "@/components/ui/progress";
import { BottomNav } from "@/components/BottomNav";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton, SkeletonCard } from "@/components/Skeleton";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { useConnections } from "@/hooks/useConnections";
import { useDisparos } from "@/hooks/useDisparos";
import { useSubscription } from "@/hooks/useSubscription";
import { useNotifications } from "@/hooks/useNotifications";
import { toast } from "sonner";

// Memoizar componentes internos para evitar re-renders desnecessários
const NotificationItem = memo(({ notification, onMarkRead }: { notification: any; onMarkRead: () => void }) => {
  const Icon = 
    notification.type === 'success' ? CheckCircle :
    notification.type === 'warning' ? AlertCircle :
    notification.type === 'error' ? XCircle :
    Clock;
  
  return (
    <div
      onClick={onMarkRead}
      className={`p-3 rounded-lg cursor-pointer transition-colors border-0 ${
        notification.read 
          ? 'bg-transparent hover:bg-white/5' 
          : 'bg-accent-purple/10 hover:bg-accent-purple/20'
      }`}
    >
      <div className="flex items-start gap-3">
        <Icon 
          className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
            notification.type === 'success' ? 'text-success' :
            notification.type === 'warning' ? 'text-warning' :
            notification.type === 'error' ? 'text-destructive' :
            'text-accent-cyan'
          }`}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={`text-sm font-medium ${!notification.read ? 'font-semibold' : ''}`}>
              {notification.title}
            </p>
            {!notification.read && (
              <span className="w-2 h-2 bg-accent-pink rounded-full flex-shrink-0 mt-1.5" />
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {notification.message}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {notification.time}
          </p>
        </div>
      </div>
    </div>
  );
});
NotificationItem.displayName = 'NotificationItem';

const CampaignCard = memo(({ disparo, onRetomar }: { disparo: any; onRetomar: () => void }) => {
  // Garantir que os valores sejam números válidos
  const sentCount = Number(disparo?.sent_count) || 0;
  const totalRecipients = Number(disparo?.total_recipients) || 0;
  
  const progress = totalRecipients > 0 
    ? Math.round((sentCount / totalRecipients) * 100)
    : 0;
  
  const enviadas = sentCount;
  const total = totalRecipients;
  const faltam = Math.max(0, total - enviadas);
  
  // Debug
  if (process.env.NODE_ENV === 'development') {
    console.log('[CampaignCard] Dados:', {
      campaign_name: disparo?.campaign_name,
      sent_count: sentCount,
      total_recipients: total,
      faltam,
      progress
    });
  }
  
  return (
    <GlassCard hover className="space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent-purple/20 flex items-center justify-center flex-shrink-0">
            <Play className="w-5 h-5 text-accent-purple" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold truncate">{disparo?.campaign_name || 'Sem nome'}</h3>
          </div>
        </div>
      </div>
      
      {/* Contador de Enviadas e Faltam */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-accent-purple/10 rounded-lg p-2 border border-accent-purple/20">
          <p className="text-xs text-muted-foreground mb-0.5">✅ Enviadas</p>
          <p className="text-lg font-bold text-accent-purple">{enviadas.toLocaleString('pt-BR')}</p>
        </div>
        <div className="bg-warning/10 rounded-lg p-2 border border-warning/20">
          <p className="text-xs text-muted-foreground mb-0.5">⏳ Faltam</p>
          <p className="text-lg font-bold text-warning">{faltam.toLocaleString('pt-BR')}</p>
        </div>
      </div>
      
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Progresso</span>
          <span className="font-semibold">{progress}%</span>
        </div>
        <div className="relative h-2 bg-bg-input rounded-full overflow-hidden">
          <div 
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-accent-purple to-accent-cyan animate-pulse-glow"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground text-center">Total: {total.toLocaleString('pt-BR')}</p>
      </div>
    </GlassCard>
  );
});
CampaignCard.displayName = 'CampaignCard';

// Componente de gráfico animado estilo montanha
const AnimatedChart = memo(() => {
  const [points, setPoints] = useState<number[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const width = 200;
    const height = 60;
    const numPoints = 40;
    const centerY = height / 2;
    
    // Inicializar pontos criando forma de montanha
    const initialPoints = Array.from({ length: numPoints }, (_, i) => {
      const x = i / (numPoints - 1);
      // Criar picos e vales para formar montanhas
      const mountain1 = Math.sin(x * Math.PI * 2) * 15;
      const mountain2 = Math.sin(x * Math.PI * 4) * 10;
      const noise = (Math.random() - 0.5) * 5;
      return centerY + mountain1 + mountain2 + noise;
    });
    setPoints(initialPoints);

    let frame = 0;
    const animate = () => {
      frame++;
      setPoints(prev => {
        const newPoints = [...prev];
        // Remove o primeiro ponto e adiciona um novo no final
        newPoints.shift();
        
        // Gera um novo ponto criando picos de montanha
        const lastPoint = prev[prev.length - 1];
        const secondLastPoint = prev[prev.length - 2] || lastPoint;
        
        // Calcular tendência (subindo ou descendo)
        const trend = lastPoint - secondLastPoint;
        
        // Criar variação que forma picos e vales (montanhas)
        const time = frame * 0.1;
        const wave = Math.sin(time) * 12; // Onda maior para picos
        const variation = trend * 0.3 + wave + (Math.random() - 0.5) * 6;
        
        const newPoint = Math.max(8, Math.min(height - 8, lastPoint + variation));
        newPoints.push(newPoint);
        return newPoints;
      });
    };

    // Animar mais devagar (a cada 100ms ao invés de cada frame)
    intervalRef.current = setInterval(animate, 100);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const width = 200;
  const height = 60;
  const stepX = width / (points.length - 1);

  const pathData = points
    .map((y, i) => `${i * stepX},${y}`)
    .join(' L ');

  return (
    <div ref={containerRef} className="w-full h-16 flex items-center justify-center overflow-hidden">
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="chartGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#a855f7" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.8" />
          </linearGradient>
        </defs>
        {/* Grid lines */}
        {[0, height / 2, height].map((y, i) => (
          <line
            key={i}
            x1="0"
            y1={y}
            x2={width}
            y2={y}
            stroke="rgba(255, 255, 255, 0.05)"
            strokeWidth="1"
          />
        ))}
        {/* Área preenchida (montanha) */}
        <path
          d={`M 0,${height} L ${pathData} L ${width},${height} Z`}
          fill="url(#chartGradient)"
          fillOpacity="0.2"
        />
        {/* Linha do gráfico (contorno da montanha) */}
        <path
          d={`M ${pathData}`}
          fill="none"
          stroke="url(#chartGradient)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
});
AnimatedChart.displayName = 'AnimatedChart';

const Dashboard = () => {
  const navigate = useNavigate();
  const { profile, refreshProfile } = useAuth();
  const { isAdmin } = useAdmin();
  const { connections } = useConnections();
  const { disparos, startDisparo } = useDisparos();
  const { dailyDisparosCount, dailyDisparosLimit } = useSubscription();
  
  // Detectar modo desktop
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;
  
  // Estado para controlar dropdown de notificações
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  
  // Notificações reais do banco de dados
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAllNotifications } = useNotifications();

  // Debug: logar quando notificações mudarem
  useEffect(() => {
    console.log('📬 Notificações atualizadas no Dashboard:', {
      total: notifications.length,
      unread: unreadCount,
      ids: notifications.map(n => n.id)
    });
    
    // Fechar dropdown se não houver mais notificações
    if (notifications.length === 0 && notificationsOpen) {
      console.log('🔒 Fechando dropdown - não há notificações');
      setNotificationsOpen(false);
    }
  }, [notifications, unreadCount, notificationsOpen]);

  const handleRetomarCampanha = useCallback(async (disparoId: string) => {
    try {
      await startDisparo(disparoId);
      toast.success("Campanha retomada!");
    } catch (error) {
      toast.error("Erro ao retomar campanha");
    }
  }, [startDisparo]);

  const { activeDisparos, pausedDisparos, scheduledDisparos, messagesToday, successRate, growthPercentage } = useMemo(() => {
    const activeDisparos = disparos.filter(d => d.status === 'in_progress');
    const pausedDisparos = disparos.filter(d => d.status === 'paused');
    const scheduledDisparos = disparos.filter(d => d.status === 'scheduled');

    // Usar contador diário do perfil do usuário (mais preciso)
    const messagesToday = dailyDisparosCount || 0;

    // Calcular taxa de sucesso baseada em delivered_count (mais preciso que sent_count)
    // Nota: delivered_count pode não estar atualizado, então usamos sent_count como fallback
    const totalDelivered = disparos.reduce((sum, d) => sum + (d.delivered_count || 0), 0);
    const totalFailed = disparos.reduce((sum, d) => sum + (d.failed_count || 0), 0);
    const totalSent = disparos.reduce((sum, d) => sum + (d.sent_count || 0), 0);
    
    // Taxa de sucesso = (entregues / total tentativas) * 100
    // Prioridade: delivered_count > sent_count
    let successRate = 0;
    
    // Se tiver delivered_count (dados de entrega confirmada), usar ele (mais preciso)
    // Só usar delivered_count se houver dados reais de entrega
    if (totalDelivered > 0) {
      const totalAttempts = totalDelivered + totalFailed;
      if (totalAttempts > 0) {
        successRate = Math.round((totalDelivered / totalAttempts) * 100);
      }
    } 
    // Se não tiver delivered_count, usar sent_count como fallback
    // Isso é comum porque delivered_count só é atualizado quando há confirmação de entrega
    else if (totalSent > 0 || totalFailed > 0) {
      const totalAttempts = totalSent + totalFailed;
      if (totalAttempts > 0) {
        // Usar sent_count como sucesso (mensagens enviadas com sucesso)
        successRate = Math.round((totalSent / totalAttempts) * 100);
      }
    }
    
    // Se não houver dados, manter 0% (não há como calcular)
    
    // Debug: log dos valores para verificar (sempre, não apenas em dev)
    console.log('[Dashboard] Estatísticas calculadas:', {
      totalDelivered,
      totalFailed,
      totalSent,
      successRate,
      disparosCount: disparos.length,
      disparosSample: disparos.slice(0, 3).map(d => ({
        id: d.id,
        sent_count: d.sent_count,
        failed_count: d.failed_count,
        delivered_count: d.delivered_count,
        status: d.status
      }))
    });

    // Calcular crescimento comparando com ontem
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const messagesYesterday = disparos
      .filter(d => {
        if (!d.created_at) return false;
        const createdDate = new Date(d.created_at);
        createdDate.setHours(0, 0, 0, 0);
        return createdDate.getTime() === yesterday.getTime();
      })
      .reduce((sum, d) => sum + (d.sent_count || 0), 0);

    const growthPercentage = messagesYesterday > 0
      ? Math.round(((messagesToday - messagesYesterday) / messagesYesterday) * 100)
      : messagesToday > 0 ? 100 : 0;

    return { activeDisparos, pausedDisparos, scheduledDisparos, messagesToday, successRate, growthPercentage };
  }, [disparos, dailyDisparosCount]);

  // Usar limite do perfil do usuário, ou padrão se não tiver limite
  const messageLimit = dailyDisparosLimit || 10000;

  return (
    <div className="min-h-screen tech-grid-bg pb-24">
      {/* Header Fixo */}
      <header className="sticky top-0 z-40 glass px-4 py-3 sm:py-4 mb-4 sm:mb-6 safe-top">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <h1 className="text-xl font-bold gradient-text">Connect</h1>
            <p className="text-sm text-muted-foreground">Bem-vindo, {profile?.name || 'Usuário'}! 👋</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Botão Admin - Aparece sempre que isAdmin for true */}
            {isAdmin && (
              <button
                onClick={async () => {
                  console.log('🔍 [Dashboard] Clicou no botão Admin');
                  // Forçar refresh do perfil antes de navegar
                  await refreshProfile();
                  navigate('/admin');
                }}
                className="p-2 rounded-lg bg-gradient-to-r from-accent-purple/20 to-accent-cyan/20 hover:from-accent-purple/30 hover:to-accent-cyan/30 transition-colors border border-accent-purple/30"
                title="Painel Administrativo"
              >
                <Shield className="w-5 h-5 text-accent-cyan" />
              </button>
            )}
            <DropdownMenu open={notificationsOpen} onOpenChange={setNotificationsOpen}>
              <DropdownMenuTrigger asChild>
                <button 
                  className="p-2 rounded-lg hover:bg-white/5 transition-colors relative"
                >
                  <Bell className="w-5 h-5 text-muted-foreground hover:text-white" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-pink-500 rounded-full" />
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="w-80 max-h-[400px] overflow-y-auto glass border-0"
              >
                <div className="p-2">
                  <div className="flex items-center justify-between mb-3 px-2">
                    <h3 className="font-semibold text-sm">Notificações</h3>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <>
                          <span className="text-xs text-muted-foreground">
                            {unreadCount} não lida{unreadCount > 1 ? 's' : ''}
                          </span>
                          <button
                            onClick={() => {
                              markAllAsRead();
                              toast.success('Todas as notificações foram marcadas como lidas');
                            }}
                            className="text-xs text-accent-cyan hover:text-accent-purple transition-colors"
                          >
                            Marcar todas
                          </button>
                        </>
                      )}
                      {notifications.length > 0 && (
                        <button
                          onClick={async () => {
                            if (confirm('Tem certeza que deseja limpar todas as notificações?')) {
                              try {
                                console.log('🗑️ Iniciando limpeza de notificações...');
                                await clearAllNotifications();
                                console.log('✅ Limpeza concluída!');
                                setNotificationsOpen(false); // Fechar dropdown
                                toast.success('Todas as notificações foram removidas');
                              } catch (error) {
                                console.error('❌ Erro ao limpar:', error);
                                toast.error('Erro ao limpar notificações');
                              }
                            }
                          }}
                          className="text-xs text-red-400 hover:text-red-300 transition-colors"
                        >
                          Limpar todas
                        </button>
                      )}
                    </div>
                  </div>
                  {notifications.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground" key="empty-state">
                      Nenhuma notificação
                    </div>
                  ) : (
                    <div className="space-y-1" key={`notifications-${notifications.length}`}>
                      {notifications.map((notification) => (
                        <NotificationItem
                          key={notification.id}
                          notification={notification}
                          onMarkRead={() => {
                            if (!notification.read) {
                              markAsRead(notification.id);
                            }
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Logo no canto direito */}
            <img 
              src="https://i.postimg.cc/zfK0BqB7/Gemini-Generated-Image-urlh0ourlh0ourlh-1.png" 
              alt="VisitaIA Logo" 
              className="w-10 h-10 rounded-full object-cover"
            />
          </div>
        </div>
      </header>

      <div className={`${isDesktop ? 'max-w-7xl' : 'max-w-lg'} mx-auto px-4 sm:px-6 ${isDesktop ? 'space-y-5' : 'space-y-3 sm:space-y-5'} animate-slide-up pt-2`}>
        {/* Top Section: Analytics + Quick Stats */}
        <div className={`${isDesktop ? 'grid grid-cols-3 gap-4' : 'space-y-4'}`}>
          {/* AI Analytics Card - Ocupa 2 colunas em desktop */}
          <div className={isDesktop ? 'col-span-2' : ''}>
            <GlassCard glow className="relative overflow-hidden !p-3 h-full">
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent-purple/10 rounded-full blur-2xl" />
              <div className="relative h-full flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-accent-purple to-accent-cyan flex items-center justify-center">
                      🤖
                    </div>
                    <h3 className="font-semibold text-sm">IA Analytics</h3>
                  </div>
                  <div className={`flex items-center gap-1 ${growthPercentage >= 0 ? 'text-success' : 'text-destructive'}`}>
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span className="text-xs font-semibold">
                      {growthPercentage >= 0 ? '+' : ''}{growthPercentage}%
                    </span>
                  </div>
                </div>
                
                {/* Gráfico animado */}
                <div className="my-2 -mx-1">
                  <AnimatedChart />
                </div>
                
                <div className="space-y-2">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-lg font-bold">{successRate}%</span>
                      <span className="text-xs text-muted-foreground">Taxa de Sucesso</span>
                    </div>
                    <Progress value={successRate} className="h-1.5" />
                  </div>
                  
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">💬 Mensagens Hoje</span>
                    <span className="font-semibold">{messagesToday.toLocaleString('pt-BR')} / {messageLimit.toLocaleString('pt-BR')}</span>
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Quick Stats - Ocupa 1 coluna em desktop */}
          <div className={`${isDesktop ? 'flex flex-col gap-3' : 'grid grid-cols-2 gap-3'}`}>
            <div 
              className="text-center cursor-pointer hover:scale-105 transition-transform flex-1"
              onClick={() => navigate("/instances")}
            >
              <GlassCard className="!p-4 h-full flex flex-col justify-center">
                <Smartphone className={`${isDesktop ? 'w-10 h-10' : 'w-8 h-8'} mx-auto mb-2 text-accent-cyan`} />
                <div className={`${isDesktop ? 'text-3xl' : 'text-2xl'} font-bold`}>{connections.length}</div>
                <div className="text-sm text-muted-foreground">Instâncias</div>
              </GlassCard>
            </div>
            
            <div 
              className="text-center cursor-pointer hover:scale-105 transition-transform flex-1"
              onClick={() => navigate("/campaigns")}
            >
              <GlassCard className="!p-4 h-full flex flex-col justify-center">
                <Send className={`${isDesktop ? 'w-10 h-10' : 'w-8 h-8'} mx-auto mb-2 text-accent-purple`} />
                <div className={`${isDesktop ? 'text-3xl' : 'text-2xl'} font-bold`}>{disparos.length}</div>
                <div className="text-sm text-muted-foreground">Campanhas</div>
              </GlassCard>
            </div>
          </div>
        </div>

        {/* Grid de Cards de Funcionalidades - Desktop: 3 colunas */}
        <div className={`${isDesktop ? 'grid grid-cols-3 gap-5' : 'space-y-4'}`}>
          {/* Groups Campaign Card */}
          <GlassCard hover className="cursor-pointer" onClick={() => navigate("/extract-members")}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-purple/20 to-accent-cyan/20 flex items-center justify-center flex-shrink-0">
                <Users className="w-6 h-6 text-accent-purple" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base">Disparar para Grupos</h3>
                <p className="text-sm text-muted-foreground">Liste grupos e envie mensagens em massa</p>
              </div>
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-purple to-accent-cyan flex items-center justify-center">
                  <Send className="w-4 h-4 text-white" />
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Extract Contacts Card */}
          <GlassCard hover className="cursor-pointer" onClick={() => navigate("/extract-contacts")}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center flex-shrink-0">
                <Contact className="w-6 h-6 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base">Extrair Contatos</h3>
                <p className="text-sm text-muted-foreground">Extraia todos os contatos da sua conta WhatsApp</p>
              </div>
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <Contact className="w-4 h-4 text-white" />
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Billing Card */}
          <GlassCard hover className="cursor-pointer" onClick={() => navigate("/billing")}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-6 h-6 text-green-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base">Cobranças Automáticas</h3>
                <p className="text-sm text-muted-foreground">Gerencie e envie cobranças automaticamente</p>
              </div>
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-white" />
                </div>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Campaigns Section - Desktop: 2 colunas */}
        <div className={`${isDesktop ? 'grid grid-cols-2 gap-5' : 'space-y-6'}`}>
          {/* Active Campaigns */}
          <div>
            <h2 className="text-base font-bold mb-3 flex items-center gap-2">
              🔥 Campanhas Ativas
            </h2>
            
            <div className="space-y-3">
              {activeDisparos.length > 0 ? (
                activeDisparos.map((disparo) => (
                  <CampaignCard
                    key={disparo.id}
                    disparo={disparo}
                    onRetomar={() => handleRetomarCampanha(disparo.id)}
                  />
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma campanha ativa</p>
              )}

              {pausedDisparos.length > 0 && pausedDisparos.map((disparo) => {
                const progress = disparo.total_recipients > 0 
                  ? Math.round((disparo.sent_count / disparo.total_recipients) * 100)
                  : 0;
                
                const enviadas = disparo.sent_count || 0;
                const total = disparo.total_recipients || 0;
                const faltam = Math.max(0, total - enviadas);
                
                return (
                  <GlassCard key={disparo.id} hover className="mt-3">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-muted/20 flex items-center justify-center">
                          <Pause className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{disparo.campaign_name}</h3>
                          <p className="text-xs text-warning">Pausada - {progress}%</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleRetomarCampanha(disparo.id)}
                          className="p-1.5 rounded-lg hover:bg-success/20 transition-colors"
                        >
                          <Play className="w-4 h-4 text-success" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Contador de Enviadas e Faltam */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-accent-purple/10 rounded-lg p-2 border border-accent-purple/20">
                        <p className="text-xs text-muted-foreground mb-0.5">✅ Enviadas</p>
                        <p className="text-base font-bold text-accent-purple">{enviadas.toLocaleString('pt-BR')}</p>
                      </div>
                      <div className="bg-warning/10 rounded-lg p-2 border border-warning/20">
                        <p className="text-xs text-muted-foreground mb-0.5">⏳ Faltam</p>
                        <p className="text-base font-bold text-warning">{faltam.toLocaleString('pt-BR')}</p>
                      </div>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          </div>

          {/* Upcoming */}
          <div>
            <h2 className="text-base font-bold mb-3 flex items-center gap-2">
              📅 Próximos Agendamentos
            </h2>
            
            <div className="space-y-3">
              {scheduledDisparos.length > 0 ? (
                scheduledDisparos.slice(0, 3).map((disparo) => (
                  <div 
                    key={disparo.id}
                    className="cursor-pointer"
                    onClick={() => navigate("/campaigns")}
                  >
                    <GlassCard hover>
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-accent-cyan/20 flex items-center justify-center flex-shrink-0">
                          <Calendar className="w-5 h-5 text-accent-cyan" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold">{disparo.campaign_name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {disparo.scheduled_at 
                              ? new Date(disparo.scheduled_at).toLocaleString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })
                              : 'Data não definida'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">{disparo.total_recipients} contatos</p>
                        </div>
                      </div>
                    </GlassCard>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum agendamento</p>
              )}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="flex justify-center">
          <GradientButton 
            className="max-w-md w-full" 
            size="lg"
            onClick={() => navigate("/create")}
          >
            📤 Criar Nova Campanha
          </GradientButton>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default memo(Dashboard);
