import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { CampaignCard } from "@/components/CampaignCard";
import { CampaignDetailsModal } from "@/components/CampaignDetailsModal";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonList } from "@/components/Skeleton";
import { GlassCard } from "@/components/GlassCard";
import { useDisparos } from "@/hooks/useDisparos";
import { Search, Filter, AlertCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BottomNav } from "@/components/BottomNav";
import { toast } from "sonner";
import { Disparo } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";

const Campaigns = memo(() => {
  const { disparos, loading, cancelDisparo, deleteDisparo, getDisparoRecipients, pauseDisparo, startDisparo } = useDisparos();
  const [selectedCampaign, setSelectedCampaign] = useState<Disparo | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [deliveredCounts, setDeliveredCounts] = useState<Record<string, number>>({});
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<string>("today");
  const navigate = useNavigate();
  
  // Detectar modo desktop
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;

  // Status map memoizado
  const statusMap = useMemo<Record<string, 'scheduled' | 'active' | 'paused' | 'completed' | 'cancelled'>>(() => ({
    'scheduled': 'scheduled',
    'in_progress': 'active',
    'paused': 'paused',
    'completed': 'completed',
    'failed': 'completed',
    'cancelled': 'cancelled',
  }), []);

  // Filtrar disparos baseado nos filtros
  const filteredDisparos = useMemo(() => {
    // Garantir que disparos seja sempre um array
    if (!disparos || !Array.isArray(disparos)) {
      return [];
    }
    let filtered = [...disparos];

    // Filtro de status
    if (statusFilter !== 'all') {
      const statusFilterMap: Record<string, string[]> = {
        'active': ['in_progress'],
        'completed': ['completed', 'failed'],
        'scheduled': ['scheduled'],
      };
      const statuses = statusFilterMap[statusFilter] || [];
      filtered = filtered.filter(d => statuses.includes(d.status));
    }

    // Filtro de período
    if (periodFilter !== 'today') {
      const now = new Date();
      const filterDate = new Date();
      
      if (periodFilter === 'week') {
        filterDate.setDate(now.getDate() - 7);
      } else if (periodFilter === 'month') {
        filterDate.setMonth(now.getMonth() - 1);
      }
      
      filtered = filtered.filter(d => {
        if (!d.created_at) return false;
        const createdDate = new Date(d.created_at);
        return createdDate >= filterDate;
      });
    }

    return filtered;
  }, [disparos, statusFilter, periodFilter]);

  // Calcular delivered_count a partir dos recipients (otimizado com debounce)
  useEffect(() => {
    if (filteredDisparos.length === 0) {
      setDeliveredCounts({});
      return;
    }
    
    let cancelled = false;
    const calculateDeliveredCounts = async () => {
      const counts: Record<string, number> = {};
      // Processar em paralelo com limite
      const batchSize = 5;
      for (let i = 0; i < filteredDisparos.length; i += batchSize) {
        if (cancelled) return;
        const batch = filteredDisparos.slice(i, i + batchSize);
        await Promise.all(batch.map(async (disparo) => {
          try {
            const recipients = await getDisparoRecipients(disparo.id);
            const delivered = recipients.filter(r => r.status === 'delivered' || r.status === 'sent').length;
            counts[disparo.id] = delivered > 0 ? delivered : (disparo.sent_count || 0);
          } catch (error) {
            counts[disparo.id] = disparo.delivered_count || disparo.sent_count || 0;
          }
        }));
      }
      if (!cancelled) setDeliveredCounts(counts);
    };
    
    // Debounce para evitar cálculos excessivos
    const timeoutId = setTimeout(calculateDeliveredCounts, 300);
    return () => { 
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [filteredDisparos, getDisparoRecipients]);

  // Handlers memoizados
  const handleShowDetails = useCallback((disparo: Disparo) => {
    setSelectedCampaign(disparo);
    setShowDetails(true);
  }, []);

  const handleCloseDetails = useCallback(() => {
    setShowDetails(false);
    setSelectedCampaign(null);
  }, []);


  const handleCancel = useCallback((disparoId: string) => {
    cancelDisparo(disparoId);
  }, [cancelDisparo]);

  const handleDelete = useCallback(async (disparoId: string) => {
    if (confirm('Tem certeza que deseja deletar esta campanha?')) {
      try {
        await deleteDisparo(disparoId);
      } catch (error) {
        // Erro já é tratado no deleteDisparo
      }
    }
  }, [deleteDisparo]);

  const handlePause = useCallback(async (disparoId: string) => {
    try {
      await pauseDisparo(disparoId);
      // Atualizar campanha selecionada se for a mesma
      if (selectedCampaign?.id === disparoId) {
        setSelectedCampaign(prev => prev ? { ...prev, status: 'paused' } : null);
      }
    } catch (error) {
      // Erro já é tratado no pauseDisparo
    }
  }, [pauseDisparo, selectedCampaign]);

  const handleResume = useCallback(async (disparoId: string) => {
    try {
      await startDisparo(disparoId);
      // Atualizar campanha selecionada se for a mesma
      if (selectedCampaign?.id === disparoId) {
        setSelectedCampaign(prev => prev ? { ...prev, status: 'in_progress' } : null);
      }
    } catch (error) {
      // Erro já é tratado no startDisparo
    }
  }, [startDisparo, selectedCampaign]);

  const handleExport = useCallback(async (disparo: Disparo) => {
    try {
      const recipients = await getDisparoRecipients(disparo.id);
      
      // Garantir que recipients seja um array
      if (!recipients || !Array.isArray(recipients)) {
        toast.error("Nenhum destinatário encontrado para exportar");
        return;
      }
      
      const csv = [
        ['Nome', 'Telefone', 'Status', 'Enviado em', 'Entregue em', 'Erro'].join(','),
        ...recipients.map(r => [
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
      a.download = `campanha-${disparo.campaign_name}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success("Relatório exportado com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar relatório:", error);
      toast.error("Erro ao exportar relatório");
    }
  }, [getDisparoRecipients]);

  // Converter disparo para campaign format (memoizado)
  const convertDisparoToCampaign = useCallback((disparo: Disparo) => {
    return {
      id: disparo.id,
      title: disparo.campaign_name,
      status: statusMap[disparo.status] || 'paused',
      progress: disparo.total_recipients > 0 
        ? Math.round((disparo.sent_count / disparo.total_recipients) * 100)
        : 0,
      sent: disparo.sent_count,
      total: disparo.total_recipients,
      delivered: deliveredCounts[disparo.id] || disparo.sent_count || 0,
      errors: disparo.failed_count,
      timeRemaining: disparo.status === 'in_progress' ? '~10 min' : undefined,
      scheduledDate: disparo.scheduled_at 
        ? new Date(disparo.scheduled_at).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        : undefined,
      completedDate: disparo.completed_at 
        ? new Date(disparo.completed_at).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        : undefined,
      messages: disparo.message_variations?.length || 0,
      contacts: disparo.total_recipients || 0,
    };
  }, [statusMap, deliveredCounts]);

  return (
    <div className="min-h-screen bg-[hsl(var(--bg-primary))] pb-24">
      <PageHeader
        title="Campanhas"
        action={
          <div className="flex gap-2">
            <button 
              onClick={() => toast.info("Buscar campanhas")}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>
            <button 
              onClick={() => toast.info("Filtrar campanhas")}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <Filter className="w-5 h-5" />
            </button>
          </div>
        }
      />

      <div className={`${isDesktop ? 'max-w-5xl' : 'max-w-lg'} mx-auto px-4 sm:px-6 ${isDesktop ? 'space-y-3' : 'space-y-3 sm:space-y-4'} py-3`}>
        {/* Aviso sobre Exclusão Automática */}
        <GlassCard className={`border-warning/50 bg-warning/5 ${isDesktop ? 'p-2.5' : 'p-3'}`}>
          <div className={`flex items-start ${isDesktop ? 'gap-2' : 'gap-3'}`}>
            <AlertCircle className={`${isDesktop ? 'w-4 h-4' : 'w-5 h-5'} text-warning flex-shrink-0 mt-0.5`} />
            <div className="flex-1">
              <h3 className={`font-semibold ${isDesktop ? 'text-xs' : 'text-sm'} mb-0.5 text-warning`}>
                ⚠️ Exclusão Automática
              </h3>
              <p className={`${isDesktop ? 'text-[10px]' : 'text-xs'} text-muted-foreground leading-relaxed`}>
                Campanhas com mais de <strong>5 dias</strong> são excluídas automaticamente. 
                Exporte relatórios importantes antes do prazo.
              </p>
            </div>
          </div>
        </GlassCard>

        {/* Filtros */}
        <div className={`flex ${isDesktop ? 'gap-2' : 'gap-3'} flex-wrap sm:flex-nowrap`}>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className={`w-full sm:flex-1 ${isDesktop ? 'h-9 text-xs' : ''}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="active">Em Andamento</SelectItem>
              <SelectItem value="completed">Concluídas</SelectItem>
              <SelectItem value="scheduled">Agendadas</SelectItem>
            </SelectContent>
          </Select>

          <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger className={`w-full sm:flex-1 ${isDesktop ? 'h-9 text-xs' : ''}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="week">Esta Semana</SelectItem>
              <SelectItem value="month">Este Mês</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Lista de Campanhas */}
        {loading ? (
          <SkeletonList count={3} />
        ) : filteredDisparos.length === 0 ? (
          <EmptyState
            icon="📦"
            title="Nenhuma campanha ainda"
            description={(!disparos || disparos.length === 0)
              ? "Crie sua primeira campanha e comece a enviar mensagens!"
              : "Nenhuma campanha encontrada com os filtros selecionados."}
            actionLabel="Criar Campanha"
            onAction={() => navigate("/create")}
          />
        ) : (
          <div className={isDesktop ? 'space-y-2' : 'space-y-4'}>
            {filteredDisparos.map((disparo) => {
              const campaign = convertDisparoToCampaign(disparo);

              return (
                <CampaignCard
                  key={disparo.id}
                  campaign={campaign}
                  onDetails={() => handleShowDetails(disparo)}
                  onView={() => handleShowDetails(disparo)}
                  onExport={() => handleExport(disparo)}
                  onCancel={() => handleCancel(disparo.id)}
                  onDelete={() => handleDelete(disparo.id)}
                />
              );
            })}
          </div>
        )}

        <CampaignDetailsModal
          open={showDetails}
          onClose={handleCloseDetails}
          campaign={selectedCampaign}
          onPause={selectedCampaign?.status === 'in_progress' ? () => handlePause(selectedCampaign.id) : undefined}
          onResume={selectedCampaign?.status === 'paused' ? () => handleResume(selectedCampaign.id) : undefined}
        />
      </div>

      <BottomNav />
    </div>
  );
});

Campaigns.displayName = 'Campaigns';

export default Campaigns;
