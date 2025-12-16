import { memo, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Play, Pause, Check, X, Clock, Calendar, Trash2 } from "lucide-react";
import { Campaign } from "@/stores/useCampaignStore";

interface CampaignCardProps {
  campaign: Campaign;
  onDetails?: () => void;
  onView?: () => void;
  onExport?: () => void;
  onCancel?: () => void;
  onDelete?: () => void;
}

export const CampaignCard = memo(({
  campaign,
  onDetails,
  onView,
  onExport,
  onCancel,
  onDelete,
}: CampaignCardProps) => {
  const config = useMemo(() => {
    switch (campaign.status) {
      case 'active':
        return {
          badge: 'EM ANDAMENTO',
          icon: Play,
          borderColor: 'border-accent-purple/30',
          badgeVariant: 'default' as const,
        };
      case 'completed':
        return {
          badge: 'CONCLUÍDA',
          icon: Check,
          borderColor: 'border-success/30',
          badgeVariant: 'default' as const,
        };
      case 'scheduled':
        return {
          badge: 'AGENDADA',
          icon: Clock,
          borderColor: 'border-accent-blue/30',
          badgeVariant: 'secondary' as const,
        };
      case 'cancelled':
        return {
          badge: 'CANCELADA',
          icon: X,
          borderColor: 'border-muted/30',
          badgeVariant: 'secondary' as const,
        };
      default:
        return {
          badge: 'PAUSADA',
          icon: Pause,
          borderColor: 'border-warning/30',
          badgeVariant: 'secondary' as const,
        };
    }
  }, [campaign.status]);

  const StatusIcon = config.icon;

  return (
    <div className={cn("glass rounded-2xl p-4 sm:p-5 border-2", config.borderColor)}>
      <div className="flex items-center justify-between mb-3">
        <Badge variant={config.badgeVariant} className="gap-1 text-xs sm:text-sm">
          <StatusIcon className="w-3 h-3" />
          {config.badge}
        </Badge>
      </div>

      <h3 className="text-base sm:text-lg font-semibold mb-3">{campaign.title}</h3>

      {campaign.status !== 'cancelled' && (
        <Progress value={campaign.progress} className="mb-3" />
      )}

      <div className="space-y-1 text-sm text-muted-foreground mb-4">
        {campaign.status === 'active' && (
          <>
            <div className="flex items-center justify-between">
              <p className="font-semibold text-foreground">📊 Progresso</p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="bg-accent-purple/10 rounded-lg p-2 border border-accent-purple/20">
                <p className="text-xs text-muted-foreground mb-0.5">✅ Enviadas</p>
                <p className="text-base font-bold text-accent-purple">{(Number(campaign.sent) || 0).toLocaleString('pt-BR')}</p>
              </div>
              <div className="bg-warning/10 rounded-lg p-2 border border-warning/20">
                <p className="text-xs text-muted-foreground mb-0.5">⏳ Faltam</p>
                <p className="text-base font-bold text-warning">{Math.max(0, (Number(campaign.total) || 0) - (Number(campaign.sent) || 0)).toLocaleString('pt-BR')}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs">Total: <span className="font-semibold">{campaign.total.toLocaleString('pt-BR')}</span></p>
              </div>
              <div>
                <p className="text-xs">Entregues: <span className="font-semibold text-success">{campaign.delivered.toLocaleString('pt-BR')}</span></p>
              </div>
            </div>
            <p className="flex items-center gap-1 text-xs pt-1">
              <Clock className="w-3 h-3" />
              {campaign.timeRemaining} restantes
            </p>
          </>
        )}

        {campaign.status === 'completed' && (
          <>
            <div className="flex items-center justify-between">
              <p className="font-semibold text-foreground">📊 Resultado Final</p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="bg-success/10 rounded-lg p-2 border border-success/20">
                <p className="text-xs text-muted-foreground mb-0.5">✅ Enviadas</p>
                <p className="text-base font-bold text-success">{campaign.sent.toLocaleString('pt-BR')}</p>
              </div>
              <div className="bg-accent-cyan/10 rounded-lg p-2 border border-accent-cyan/20">
                <p className="text-xs text-muted-foreground mb-0.5">📨 Entregues</p>
                <p className="text-base font-bold text-accent-cyan">{(campaign.delivered || 0).toLocaleString('pt-BR')}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs">Total: <span className="font-semibold">{campaign.total.toLocaleString('pt-BR')}</span></p>
              </div>
              {campaign.errors > 0 && (
                <div>
                  <p className="text-xs text-destructive">Erros: <span className="font-semibold">{campaign.errors.toLocaleString('pt-BR')}</span></p>
                </div>
              )}
            </div>
            <p className="flex items-center gap-1 text-xs pt-1">
              <Calendar className="w-3 h-3" />
              {campaign.completedDate}
            </p>
          </>
        )}

        {campaign.status === 'scheduled' && (
          <>
            <p className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {campaign.scheduledDate}
            </p>
            <p>👥 {campaign.contacts} contatos</p>
            <p>💬 {campaign.messages} mensagens</p>
          </>
        )}

        {campaign.status === 'cancelled' && (
          <>
            <p>Cancelada pelo usuário</p>
            {campaign.completedDate && <p>{campaign.completedDate}</p>}
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {campaign.status === 'active' && (
          <>
            <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={onDetails}>
              Detalhes
            </Button>
          </>
        )}

        {campaign.status === 'completed' && (
          <>
            <Button variant="outline" size="sm" onClick={onView}>
              Ver
            </Button>
            <Button variant="outline" size="sm" onClick={onExport}>
              Exportar
            </Button>
            {onDelete && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onDelete}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </>
        )}

        {campaign.status === 'paused' && (
          <>
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold text-foreground text-sm">📊 Progresso</p>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-accent-purple/10 rounded-lg p-2 border border-accent-purple/20">
                <p className="text-xs text-muted-foreground mb-0.5">✅ Enviadas</p>
                <p className="text-base font-bold text-accent-purple">{(Number(campaign.sent) || 0).toLocaleString('pt-BR')}</p>
              </div>
              <div className="bg-warning/10 rounded-lg p-2 border border-warning/20">
                <p className="text-xs text-muted-foreground mb-0.5">⏳ Faltam</p>
                <p className="text-base font-bold text-warning">{Math.max(0, (Number(campaign.total) || 0) - (Number(campaign.sent) || 0)).toLocaleString('pt-BR')}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={onDetails}>
              Detalhes
            </Button>
            {onDelete && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onDelete}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </>
        )}

        {campaign.status === 'scheduled' && (
          <>
            <Button variant="outline" size="sm" onClick={onCancel}>
              Cancelar
            </Button>
            {onDelete && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onDelete}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </>
        )}

        {campaign.status === 'cancelled' && onDelete && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onDelete}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
});

CampaignCard.displayName = 'CampaignCard';
