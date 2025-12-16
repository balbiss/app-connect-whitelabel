import { useState, useEffect, useMemo, useCallback, memo, useRef } from "react";
import { PageHeader } from "@/components/PageHeader";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BottomNav } from "@/components/BottomNav";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton, SkeletonList } from "@/components/Skeleton";
import { Search, Download, Filter } from "lucide-react";
import { useDisparos } from "@/hooks/useDisparos";
import { useDebounce } from "@/hooks/useDebounce";
import { DisparoRecipient } from "@/lib/supabase";
import { toast } from "sonner";

// Componente de gráfico animado estilo montanha para os cards
const AnimatedStatChart = memo(({ color = "purple" }: { color?: "purple" | "orange" | "red" }) => {
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

const Lista = () => {
  const { disparos, getDisparoRecipients } = useDisparos();
  const [allRecipients, setAllRecipients] = useState<DisparoRecipient[]>([]);
  const [filteredRecipients, setFilteredRecipients] = useState<DisparoRecipient[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  // Detectar modo desktop
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;

  const filterRecipients = useCallback(() => {
    let filtered = [...allRecipients];

    // Filtrar por status
    if (statusFilter !== "all") {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    // Filtrar por busca (usando debounced)
    if (debouncedSearchTerm) {
      const term = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(r => 
        r.name?.toLowerCase().includes(term) ||
        r.phone_number.includes(term)
      );
    }

    setFilteredRecipients(filtered);
  }, [allRecipients, statusFilter, debouncedSearchTerm]);

  const loadAllRecipients = async () => {
    setLoading(true);
    try {
      const recipientsList: DisparoRecipient[] = [];
      
      // Buscar recipients de todas as campanhas em paralelo (mais rápido)
      const promises = disparos.map(disparo => 
        getDisparoRecipients(disparo.id).catch(error => {
          console.error(`Erro ao carregar recipients da campanha ${disparo.id}:`, error);
          return []; // Retornar array vazio em caso de erro
        })
      );
      
      const results = await Promise.all(promises);
      results.forEach(recipients => recipientsList.push(...recipients));
      
      setAllRecipients(recipientsList);
    } catch (error) {
      console.error("Erro ao carregar recipients:", error);
      toast.error("Erro ao carregar lista de contatos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (disparos.length > 0) {
      loadAllRecipients();
    } else {
      setAllRecipients([]);
      setLoading(false);
    }
  }, [disparos.length]); // Só recarregar se o número de disparos mudar

  useEffect(() => {
    filterRecipients();
  }, [filterRecipients]);

  const handleExport = () => {
    try {
      const csv = [
        ['Nome', 'Telefone', 'Status', 'Enviado em', 'Entregue em', 'Erro'].join(','),
        ...filteredRecipients.map(r => [
          `"${(r.name || '').replace(/"/g, '""')}"`,
          r.phone_number,
          r.status,
          r.sent_at ? new Date(r.sent_at).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }) : '',
          r.delivered_at ? new Date(r.delivered_at).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }) : '',
          `"${(r.error_message || '').replace(/"/g, '""')}"`
        ].join(','))
      ].join('\n');

      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lista-contatos-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success("Lista exportada com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar lista:", error);
      toast.error("Erro ao exportar lista");
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      sent: { label: "Enviado", className: "bg-accent-cyan/20 text-accent-cyan" },
      delivered: { label: "Entregue", className: "bg-success/20 text-success" },
      failed: { label: "Erro", className: "bg-destructive/20 text-destructive" },
      pending: { label: "Pendente", className: "bg-warning/20 text-warning" },
    };
    return statusMap[status] || { label: status, className: "bg-muted/20 text-muted-foreground" };
  };

  const stats = useMemo(() => ({
    total: allRecipients.length,
    sent: allRecipients.filter(r => r.status === 'sent').length,
    delivered: allRecipients.filter(r => r.status === 'delivered').length,
    failed: allRecipients.filter(r => r.status === 'failed').length,
    pending: allRecipients.filter(r => r.status === 'pending').length,
  }), [allRecipients]);

  return (
    <div className="min-h-screen tech-grid-bg pb-24">
      <PageHeader
        title="Lista de Contatos"
        action={
          <Button variant="outline" size="sm" onClick={handleExport} className="hidden sm:flex">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        }
      />

      <div className={`${isDesktop ? 'max-w-5xl' : 'max-w-lg'} mx-auto px-4 sm:px-6 ${isDesktop ? 'space-y-3' : 'space-y-3 sm:space-y-4'}`}>
        {/* Estatísticas */}
        <div className={`grid grid-cols-3 ${isDesktop ? 'gap-2' : 'gap-2'}`}>
          <GlassCard className={`text-center relative overflow-hidden ${isDesktop ? 'p-3' : 'p-3'}`}>
            <div className="absolute top-0 right-0 w-20 h-20 bg-accent-purple/10 rounded-full blur-xl" />
            <div className="relative">
              <div className={`${isDesktop ? 'text-2xl' : 'text-2xl'} font-bold gradient-text mb-1`}>{stats.total}</div>
              <div className={`${isDesktop ? 'text-[10px]' : 'text-xs'} text-muted-foreground mb-2`}>Total</div>
              <AnimatedStatChart color="purple" />
            </div>
          </GlassCard>
          <GlassCard className={`text-center relative overflow-hidden ${isDesktop ? 'p-3' : 'p-3'}`}>
            <div className="absolute top-0 right-0 w-20 h-20 bg-warning/10 rounded-full blur-xl" />
            <div className="relative">
              <div className={`${isDesktop ? 'text-2xl' : 'text-2xl'} font-bold text-warning mb-1`}>{stats.sent}</div>
              <div className={`${isDesktop ? 'text-[10px]' : 'text-xs'} text-muted-foreground mb-2`}>Enviado</div>
              <AnimatedStatChart color="orange" />
            </div>
          </GlassCard>
          <GlassCard className={`text-center relative overflow-hidden ${isDesktop ? 'p-3' : 'p-3'}`}>
            <div className="absolute top-0 right-0 w-20 h-20 bg-destructive/10 rounded-full blur-xl" />
            <div className="relative">
              <div className={`${isDesktop ? 'text-2xl' : 'text-2xl'} font-bold text-destructive mb-1`}>{stats.failed}</div>
              <div className={`${isDesktop ? 'text-[10px]' : 'text-xs'} text-muted-foreground mb-2`}>Erro</div>
              <AnimatedStatChart color="red" />
            </div>
          </GlassCard>
        </div>

        {/* Filtros */}
        <GlassCard className={isDesktop ? 'p-3' : ''}>
          <div className={isDesktop ? 'space-y-2' : 'space-y-3'}>
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${isDesktop ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-muted-foreground`} />
              <Input
                placeholder="Buscar por nome ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`pl-10 ${isDesktop ? 'h-9 text-xs' : ''}`}
              />
            </div>
            <div className={`flex ${isDesktop ? 'gap-1.5' : 'gap-2'}`}>
              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("all")}
                className={`flex-1 ${isDesktop ? 'h-8 text-xs' : ''}`}
              >
                Todos
              </Button>
              <Button
                variant={statusFilter === "sent" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("sent")}
                className={`flex-1 ${isDesktop ? 'h-8 text-xs' : ''}`}
              >
                Enviado
              </Button>
              <Button
                variant={statusFilter === "failed" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("failed")}
                className={`flex-1 ${isDesktop ? 'h-8 text-xs' : ''}`}
              >
                Erro
              </Button>
            </div>
          </div>
        </GlassCard>

        {/* Lista de Contatos */}
        {loading ? (
          <SkeletonList count={5} />
        ) : filteredRecipients.length === 0 ? (
          <EmptyState
            icon={<Search className="w-16 h-16 mx-auto text-muted-foreground" />}
            title="Nenhum contato encontrado"
            description={
              allRecipients.length === 0
                ? "Você ainda não tem contatos cadastrados"
                : "Nenhum contato corresponde aos filtros aplicados"
            }
          />
        ) : (
          <div className={isDesktop ? 'space-y-1.5' : 'space-y-2'}>
            {filteredRecipients.map((recipient) => {
              const statusBadge = getStatusBadge(recipient.status);
              return (
                <GlassCard key={recipient.id} hover className={isDesktop ? 'p-2.5' : ''}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className={`flex items-center gap-2 ${isDesktop ? 'mb-0.5' : 'mb-1'}`}>
                        <span className={`${isDesktop ? 'text-xs' : 'font-semibold'}`}>
                          {recipient.name || recipient.phone_number}
                        </span>
                        <span className={`${isDesktop ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5'} rounded-full ${statusBadge.className}`}>
                          {statusBadge.label}
                        </span>
                      </div>
                      <p className={`${isDesktop ? 'text-[11px]' : 'text-sm'} text-muted-foreground`}>{recipient.phone_number}</p>
                      {recipient.sent_at && (
                        <p className={`${isDesktop ? 'text-[10px]' : 'text-xs'} text-muted-foreground ${isDesktop ? 'mt-0.5' : 'mt-1'}`}>
                          Enviado: {new Date(recipient.sent_at).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      )}
                      {recipient.delivered_at && (
                        <p className={`${isDesktop ? 'text-[10px]' : 'text-xs'} text-success ${isDesktop ? 'mt-0.5' : 'mt-1'}`}>
                          Entregue: {new Date(recipient.delivered_at).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      )}
                      {recipient.error_message && (
                        <p className={`${isDesktop ? 'text-[10px]' : 'text-xs'} text-destructive ${isDesktop ? 'mt-0.5' : 'mt-1'}`}>
                          Erro: {recipient.error_message}
                        </p>
                      )}
                    </div>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default memo(Lista);

