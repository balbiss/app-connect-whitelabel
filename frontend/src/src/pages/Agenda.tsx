import { useState, useMemo, useCallback, memo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
import { EmptyState } from "@/components/EmptyState";
import { Calendar, Clock, Users, MessageSquare, Play, X } from "lucide-react";
import { useDisparos } from "@/hooks/useDisparos";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Disparo } from "@/lib/supabase";

const Agenda = memo(() => {
  const { disparos, cancelDisparo } = useDisparos();
  const navigate = useNavigate();

  // Filtrar apenas campanhas agendadas (memoizado)
  const scheduledDisparos = useMemo(() => {
    return disparos
      .filter(d => d.status === 'scheduled' && d.scheduled_at)
      .sort((a, b) => {
        const dateA = new Date(a.scheduled_at!).getTime();
        const dateB = new Date(b.scheduled_at!).getTime();
        return dateA - dateB;
      });
  }, [disparos]);

  // Agrupar por data (memoizado)
  const groupedByDate = useMemo(() => {
    return scheduledDisparos.reduce((acc, disparo) => {
      if (!disparo.scheduled_at) return acc;
      const date = new Date(disparo.scheduled_at);
      date.setHours(0, 0, 0, 0);
      const dateKey = date.toISOString().split('T')[0];
      
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(disparo);
      return acc;
    }, {} as Record<string, typeof scheduledDisparos>);
  }, [scheduledDisparos]);

  // Estatísticas (memoizado)
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return {
      total: scheduledDisparos.length,
      today: scheduledDisparos.filter(d => {
        if (!d.scheduled_at) return false;
        const scheduledDate = new Date(d.scheduled_at);
        return scheduledDate.toDateString() === today.toDateString();
      }).length,
      tomorrow: scheduledDisparos.filter(d => {
        if (!d.scheduled_at) return false;
        const scheduledDate = new Date(d.scheduled_at);
        return scheduledDate.toDateString() === tomorrow.toDateString();
      }).length,
    };
  }, [scheduledDisparos]);

  const handleCancel = useCallback(async (disparoId: string, campaignName: string) => {
    if (!confirm(`Tem certeza que deseja cancelar a campanha "${campaignName}"?`)) {
      return;
    }

    try {
      await cancelDisparo(disparoId);
      toast.success("Campanha cancelada com sucesso!");
    } catch (error) {
      toast.error("Erro ao cancelar campanha");
    }
  }, [cancelDisparo]);

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    date.setHours(0, 0, 0, 0);
    
    if (date.getTime() === today.getTime()) {
      return "Hoje";
    } else if (date.getTime() === tomorrow.getTime()) {
      return "Amanhã";
    } else {
      return date.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    }
  }, []);

  const formatTime = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  const sortedDates = useMemo(() => Object.keys(groupedByDate).sort(), [groupedByDate]);

  const handleNavigateToCreate = useCallback(() => {
    navigate("/create");
  }, [navigate]);

  const handleNavigateToCampaigns = useCallback(() => {
    navigate("/campaigns");
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[hsl(var(--bg-primary))] pb-24">
      <PageHeader
        title="Agenda"
        action={
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleNavigateToCreate}
            className="hover:opacity-90 transition-opacity active:scale-[0.98]"
          >
            + Nova Campanha
          </Button>
        }
      />

      <div className="max-w-lg mx-auto px-4 sm:px-6 space-y-3 sm:space-y-4 py-4">
        {/* Estatísticas */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <GlassCard className="text-center p-2 sm:p-3">
            <div className="text-base sm:text-lg font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Agendadas</div>
          </GlassCard>
          <GlassCard className="text-center p-2 sm:p-3">
            <div className="text-base sm:text-lg font-bold text-accent-cyan">{stats.today}</div>
            <div className="text-xs text-muted-foreground">Hoje</div>
          </GlassCard>
          <GlassCard className="text-center p-2 sm:p-3">
            <div className="text-base sm:text-lg font-bold text-accent-purple">{stats.tomorrow}</div>
            <div className="text-xs text-muted-foreground">Amanhã</div>
          </GlassCard>
        </div>

        {/* Lista de Agendamentos */}
        {scheduledDisparos.length === 0 ? (
          <EmptyState
            icon={<Calendar className="w-16 h-16 mx-auto text-muted-foreground" />}
            title="Nenhum agendamento"
            description="Você ainda não tem campanhas agendadas. Crie uma nova campanha para começar!"
            actionLabel="Criar Campanha"
            onAction={handleNavigateToCreate}
          />
        ) : (
          <div className="space-y-6">
            {sortedDates.map((dateKey) => {
              const disparosForDate = groupedByDate[dateKey];
              return (
                <div key={dateKey}>
                  <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-accent-purple" />
                    {formatDate(dateKey)}
                  </h3>
                  
                  <div className="space-y-3">
                    {disparosForDate.map((disparo) => (
                      <GlassCard key={disparo.id} hover>
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold mb-1">{disparo.campaign_name}</h4>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  {formatTime(disparo.scheduled_at!)}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Users className="w-4 h-4" />
                                  {disparo.total_recipients} contatos
                                </div>
                                <div className="flex items-center gap-1">
                                  <MessageSquare className="w-4 h-4" />
                                  {disparo.message_variations.length} mensagem{disparo.message_variations.length > 1 ? 's' : ''}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleNavigateToCampaigns}
                              className="flex-1 hover:opacity-90 transition-opacity active:scale-[0.98]"
                            >
                              Ver Detalhes
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCancel(disparo.id, disparo.campaign_name)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10 active:scale-[0.98] transition-all"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </GlassCard>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
});

Agenda.displayName = 'Agenda';

export default Agenda;

