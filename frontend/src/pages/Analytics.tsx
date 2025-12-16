import { useState, useEffect, useMemo, useCallback, memo, lazy, Suspense, useRef } from "react";
import { PageHeader } from "@/components/PageHeader";
import { GlassCard } from "@/components/GlassCard";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BottomNav } from "@/components/BottomNav";
import { Skeleton } from "@/components/Skeleton";
import { TrendingUp, Download } from "lucide-react";
import { useDisparos } from "@/hooks/useDisparos";
import { useConnections } from "@/hooks/useConnections";
import { toast } from "sonner";

// Componente de gráfico animado estilo montanha para os cards
const AnimatedStatChart = memo(({ color = "purple" }: { color?: "purple" | "orange" | "red" | "cyan" }) => {
  const [points, setPoints] = useState<number[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const width = 150;
    const height = 40;
    const numPoints = 30;
    const centerY = height / 2;
    
    // Inicializar pontos criando forma de montanha
    const initialPoints = Array.from({ length: numPoints }, (_, i) => {
      const x = i / (numPoints - 1);
      // Criar picos e vales para formar montanhas
      const mountain1 = Math.sin(x * Math.PI * 2) * 12;
      const mountain2 = Math.sin(x * Math.PI * 4) * 8;
      const noise = (Math.random() - 0.5) * 4;
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
        const wave = Math.sin(time) * 10; // Onda maior para picos
        const variation = trend * 0.3 + wave + (Math.random() - 0.5) * 5;
        
        const newPoint = Math.max(6, Math.min(height - 6, lastPoint + variation));
        newPoints.push(newPoint);
        return newPoints;
      });
    };

    // Animar mais devagar (a cada 120ms)
    intervalRef.current = setInterval(animate, 120);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const width = 150;
  const height = 40;
  const stepX = width / (points.length - 1);

  const pathData = points
    .map((y, i) => `${i * stepX},${y}`)
    .join(' L ');

  // Cores baseadas no tipo
  const gradientColors = {
    purple: [
      { offset: "0%", color: "#8b5cf6", opacity: 0.8 },
      { offset: "50%", color: "#a855f7", opacity: 0.9 },
      { offset: "100%", color: "#06b6d4", opacity: 0.8 },
    ],
    orange: [
      { offset: "0%", color: "#f97316", opacity: 0.8 },
      { offset: "50%", color: "#fb923c", opacity: 0.9 },
      { offset: "100%", color: "#f59e0b", opacity: 0.8 },
    ],
    red: [
      { offset: "0%", color: "#ef4444", opacity: 0.8 },
      { offset: "50%", color: "#f87171", opacity: 0.9 },
      { offset: "100%", color: "#dc2626", opacity: 0.8 },
    ],
    cyan: [
      { offset: "0%", color: "#06b6d4", opacity: 0.8 },
      { offset: "50%", color: "#22d3ee", opacity: 0.9 },
      { offset: "100%", color: "#67e8f9", opacity: 0.8 },
    ],
  };

  const colors = gradientColors[color];
  const gradientId = `chartGradient-${color}`;

  return (
    <div ref={containerRef} className="w-full h-10 flex items-center justify-center overflow-hidden -mx-1">
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            {colors.map((stop, i) => (
              <stop key={i} offset={stop.offset} stopColor={stop.color} stopOpacity={stop.opacity} />
            ))}
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
          fill={`url(#${gradientId})`}
          fillOpacity="0.2"
        />
        {/* Linha do gráfico (contorno da montanha) */}
        <path
          d={`M ${pathData}`}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
});
AnimatedStatChart.displayName = 'AnimatedStatChart';

// Lazy load Recharts (pesado)
const LineChart = lazy(() => import('recharts').then(module => ({ default: module.LineChart })));
const Line = lazy(() => import('recharts').then(module => ({ default: module.Line })));
const XAxis = lazy(() => import('recharts').then(module => ({ default: module.XAxis })));
const YAxis = lazy(() => import('recharts').then(module => ({ default: module.YAxis })));
const CartesianGrid = lazy(() => import('recharts').then(module => ({ default: module.CartesianGrid })));
const Tooltip = lazy(() => import('recharts').then(module => ({ default: module.Tooltip })));
const ResponsiveContainer = lazy(() => import('recharts').then(module => ({ default: module.ResponsiveContainer })));

const Analytics = memo(() => {
  const { disparos, getDisparoRecipients } = useDisparos();
  const { connections } = useConnections();
  const [period, setPeriod] = useState("7d");
  
  // Detectar modo desktop
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;

  // Calcular stats memoizado
  const stats = useMemo(() => {
    const totalSent = disparos.reduce((sum, d) => sum + (d.sent_count || 0), 0);
    const totalDelivered = disparos.reduce((sum, d) => sum + (d.delivered_count || 0), 0);
    const totalFailed = disparos.reduce((sum, d) => sum + (d.failed_count || 0), 0);
    const total = totalSent + totalFailed;
    const successRate = total > 0 ? Math.round((totalSent / total) * 100) : 0;

    // Calcular top conexões
    const connectionStats: Record<string, { sent: number; failed: number }> = {};
    for (const disparo of disparos) {
      if (!connectionStats[disparo.connection_id]) {
        connectionStats[disparo.connection_id] = { sent: 0, failed: 0 };
      }
      connectionStats[disparo.connection_id].sent += disparo.sent_count || 0;
      connectionStats[disparo.connection_id].failed += disparo.failed_count || 0;
    }

    const topConnections = Object.entries(connectionStats)
      .map(([connectionId, stats]) => {
        const connection = connections.find(c => c.id === connectionId);
        const total = stats.sent + stats.failed;
        const rate = total > 0 ? Math.round((stats.sent / total) * 100) : 0;
        return {
          name: connection?.name || 'Desconhecida',
          sent: stats.sent,
          rate,
        };
      })
      .sort((a, b) => b.sent - a.sent)
      .slice(0, 3);

    return {
      totalSent,
      totalDelivered,
      totalFailed,
      successRate,
      topConnections,
    };
  }, [disparos, connections]);

  // Calcular performance data memoizado
  const performanceData = useMemo(() => {
    const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
    const data: Array<{ day: string; messages: number }> = [];
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const messages = disparos
        .filter(d => {
          if (!d.created_at) return false;
          const createdDate = new Date(d.created_at);
          createdDate.setHours(0, 0, 0, 0);
          return createdDate.getTime() === date.getTime();
        })
        .reduce((sum, d) => sum + (d.sent_count || 0), 0);

      const dayLabel = days <= 7 
        ? dayNames[date.getDay()]
        : `${date.getDate()}/${date.getMonth() + 1}`;

      data.push({ day: dayLabel, messages });
    }

    return data;
  }, [disparos, period]);

  const handleExport = useCallback(() => {
    try {
      const csv = [
        ['Métrica', 'Valor'].join(','),
        ['Total Enviadas', stats.totalSent].join(','),
        ['Total Entregues', stats.totalDelivered].join(','),
        ['Total Erros', stats.totalFailed].join(','),
        ['Taxa de Sucesso', `${stats.successRate}%`].join(','),
        ['', ''].join(','),
        ['Top Instâncias', ''].join(','),
        ...stats.topConnections.map(c => [`${c.name}`, `${c.sent} msgs • ${c.rate}%`].join(','))
      ].join('\n');

      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success("Relatório exportado com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar relatório:", error);
      toast.error("Erro ao exportar relatório");
    }
  }, [stats]);

  return (
    <div className="min-h-screen bg-[hsl(var(--bg-primary))] pb-24">
      <PageHeader
        title="Estatísticas"
        action={
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7d</SelectItem>
              <SelectItem value="30d">30d</SelectItem>
              <SelectItem value="90d">90d</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <div className={`${isDesktop ? 'max-w-5xl' : 'max-w-lg'} mx-auto px-4 sm:px-6 ${isDesktop ? 'space-y-3' : 'space-y-3 sm:space-y-4'} py-3`}>
        {/* Overview */}
        <GlassCard glow className={isDesktop ? 'p-3' : ''}>
          <div className={isDesktop ? 'mb-2' : 'mb-3'}>
            <h3 className={`${isDesktop ? 'text-xs' : 'text-sm'} text-muted-foreground ${isDesktop ? 'mb-0.5' : 'mb-1'}`}>Taxa de Sucesso</h3>
            <div className="flex items-end gap-2">
              <span className={`${isDesktop ? 'text-3xl' : 'text-4xl'} font-bold gradient-text`}>{stats.successRate}%</span>
              {stats.successRate > 0 && (
                <Badge variant="secondary" className={isDesktop ? 'mb-0.5 text-[10px]' : 'mb-1'}>
                  <TrendingUp className={`${isDesktop ? 'w-2.5 h-2.5' : 'w-3 h-3'} mr-1`} />
                  {stats.successRate >= 90 ? 'Excelente' : stats.successRate >= 70 ? 'Bom' : 'Regular'}
                </Badge>
              )}
            </div>
          </div>
          <Progress value={stats.successRate} className={isDesktop ? 'mb-1.5' : 'mb-2'} />
          <p className={`${isDesktop ? 'text-[10px]' : 'text-xs'} text-muted-foreground`}>Baseado em {stats.totalSent + stats.totalFailed} mensagens</p>
        </GlassCard>

        {/* Stats Grid */}
        <div className={`grid grid-cols-3 ${isDesktop ? 'gap-2' : 'gap-3 sm:gap-4'}`}>
          <GlassCard className={`text-center relative overflow-hidden ${isDesktop ? 'p-2.5' : 'p-3'}`}>
            <div className="absolute top-0 right-0 w-20 h-20 bg-accent-purple/10 rounded-full blur-xl" />
            <div className="relative">
              <div className={`${isDesktop ? 'text-xl' : 'text-2xl'} font-bold gradient-text mb-1`}>{stats.totalSent.toLocaleString('pt-BR')}</div>
              <div className={`${isDesktop ? 'text-[10px]' : 'text-xs'} text-muted-foreground mb-2`}>Enviou</div>
              <AnimatedStatChart color="purple" />
            </div>
          </GlassCard>
          <GlassCard className={`text-center relative overflow-hidden ${isDesktop ? 'p-2.5' : 'p-3'}`}>
            <div className="absolute top-0 right-0 w-20 h-20 bg-accent-cyan/10 rounded-full blur-xl" />
            <div className="relative">
              <div className={`${isDesktop ? 'text-xl' : 'text-2xl'} font-bold text-accent-cyan mb-1`}>{stats.totalDelivered.toLocaleString('pt-BR')}</div>
              <div className={`${isDesktop ? 'text-[10px]' : 'text-xs'} text-muted-foreground mb-2`}>Entrega</div>
              <AnimatedStatChart color="cyan" />
            </div>
          </GlassCard>
          <GlassCard className={`text-center relative overflow-hidden ${isDesktop ? 'p-2.5' : 'p-3'}`}>
            <div className="absolute top-0 right-0 w-20 h-20 bg-destructive/10 rounded-full blur-xl" />
            <div className="relative">
              <div className={`${isDesktop ? 'text-xl' : 'text-2xl'} font-bold text-destructive mb-1`}>{stats.totalFailed.toLocaleString('pt-BR')}</div>
              <div className={`${isDesktop ? 'text-[10px]' : 'text-xs'} text-muted-foreground mb-2`}>Erro</div>
              <AnimatedStatChart color="red" />
            </div>
          </GlassCard>
        </div>

        {/* Grid de Cards - Funil de Conversão e Top Instâncias */}
        {isDesktop ? (
          <div className="grid grid-cols-2 gap-3">
            {/* Funil de Conversão */}
            <GlassCard className="p-3">
              <h3 className="text-xs mb-2">Funil de Conversão</h3>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span>Enviadas</span>
                    <span className="font-medium">{stats.totalSent.toLocaleString('pt-BR')}</span>
                  </div>
                  <Progress value={100} />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span>Entregues</span>
                    <span className="font-medium">
                      {stats.totalDelivered.toLocaleString('pt-BR')} ({stats.totalSent > 0 ? Math.round((stats.totalDelivered / stats.totalSent) * 100) : 0}%)
                    </span>
                  </div>
                  <Progress value={stats.totalSent > 0 ? Math.round((stats.totalDelivered / stats.totalSent) * 100) : 0} />
                </div>
              </div>
            </GlassCard>

            {/* Top Instâncias */}
            {stats.topConnections.length > 0 ? (
              <GlassCard className="p-3">
                <h3 className="text-xs mb-2">Top Instâncias</h3>
                <div className="space-y-2">
                  {stats.topConnections.map((conn, index) => (
                    <div key={index}>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span>{index + 1}. {conn.name}</span>
                        <span className="text-muted-foreground">
                          {conn.sent.toLocaleString('pt-BR')} msgs • {conn.rate}%
                        </span>
                      </div>
                      <Progress value={conn.rate} />
                    </div>
                  ))}
                </div>
              </GlassCard>
            ) : (
              <GlassCard className="p-3">
                <h3 className="text-xs mb-2">Top Instâncias</h3>
                <p className="text-xs text-muted-foreground text-center py-2">
                  Nenhuma instância com mensagens enviadas ainda
                </p>
              </GlassCard>
            )}
          </div>
        ) : (
          <>
            {/* Funil de Conversão - Mobile */}
            <GlassCard className={isDesktop ? 'p-3' : ''}>
              <h3 className={`${isDesktop ? 'text-xs' : 'font-semibold'} ${isDesktop ? 'mb-2' : 'mb-4'}`}>Funil de Conversão</h3>
              <div className={isDesktop ? 'space-y-2' : 'space-y-3'}>
                <div>
                  <div className={`flex justify-between ${isDesktop ? 'text-xs' : 'text-sm'} ${isDesktop ? 'mb-0.5' : 'mb-1'}`}>
                    <span>Enviadas</span>
                    <span className="font-medium">{stats.totalSent.toLocaleString('pt-BR')}</span>
                  </div>
                  <Progress value={100} />
                </div>
                <div>
                  <div className={`flex justify-between ${isDesktop ? 'text-xs' : 'text-sm'} ${isDesktop ? 'mb-0.5' : 'mb-1'}`}>
                    <span>Entregues</span>
                    <span className="font-medium">
                      {stats.totalDelivered.toLocaleString('pt-BR')} ({stats.totalSent > 0 ? Math.round((stats.totalDelivered / stats.totalSent) * 100) : 0}%)
                    </span>
                  </div>
                  <Progress value={stats.totalSent > 0 ? Math.round((stats.totalDelivered / stats.totalSent) * 100) : 0} />
                </div>
              </div>
            </GlassCard>

            {/* Top Instâncias - Mobile */}
            {stats.topConnections.length > 0 ? (
              <GlassCard className={isDesktop ? 'p-3' : ''}>
                <h3 className={`${isDesktop ? 'text-xs' : 'font-semibold'} ${isDesktop ? 'mb-2' : 'mb-4'}`}>Top Instâncias</h3>
                <div className={isDesktop ? 'space-y-2' : 'space-y-4'}>
                  {stats.topConnections.map((conn, index) => (
                    <div key={index}>
                      <div className={`flex justify-between ${isDesktop ? 'text-xs' : 'text-sm'} ${isDesktop ? 'mb-0.5' : 'mb-1'}`}>
                        <span>{index + 1}. {conn.name}</span>
                        <span className="text-muted-foreground">
                          {conn.sent.toLocaleString('pt-BR')} msgs • {conn.rate}%
                        </span>
                      </div>
                      <Progress value={conn.rate} />
                    </div>
                  ))}
                </div>
              </GlassCard>
            ) : (
              <GlassCard className={isDesktop ? 'p-3' : ''}>
                <h3 className={`${isDesktop ? 'text-xs' : 'font-semibold'} ${isDesktop ? 'mb-2' : 'mb-4'}`}>Top Instâncias</h3>
                <p className={`${isDesktop ? 'text-xs' : 'text-sm'} text-muted-foreground text-center ${isDesktop ? 'py-2' : 'py-4'}`}>
                  Nenhuma instância com mensagens enviadas ainda
                </p>
              </GlassCard>
            )}
          </>
        )}

        {/* Exportar */}
        <div className="flex justify-center">
          <Button 
            variant="outline" 
            className={`${isDesktop ? 'w-auto px-6 h-9 text-xs' : 'w-full'}`}
            onClick={handleExport}
          >
            <Download className={`${isDesktop ? 'w-3.5 h-3.5' : 'w-4 h-4'} mr-2`} />
            Exportar Relatório
          </Button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
});

Analytics.displayName = 'Analytics';

export default Analytics;
