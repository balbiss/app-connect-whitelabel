import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { GlassCard } from "@/components/GlassCard";
import { ArrowLeft, Download, Pause, Play, Check, Clock, X } from "lucide-react";
import { Disparo, DisparoRecipient } from "@/lib/supabase";
import { toast } from "sonner";
import { useDisparos } from "@/hooks/useDisparos";

interface CampaignDetailsModalProps {
  open: boolean;
  onClose: () => void;
  campaign: Disparo | null;
  onPause?: () => void;
  onResume?: () => void;
}


export const CampaignDetailsModal = memo(({ open, onClose, campaign, onPause, onResume }: CampaignDetailsModalProps) => {
  const { getDisparoRecipients } = useDisparos();
  const [recipients, setRecipients] = useState<DisparoRecipient[]>([]);
  const [loading, setLoading] = useState(false);

  const loadRecipients = useCallback(async () => {
    if (!campaign) return;
    setLoading(true);
    try {
      const data = await getDisparoRecipients(campaign.id);
      setRecipients(data);
    } catch (error) {
      console.error("Erro ao carregar recipients:", error);
    } finally {
      setLoading(false);
    }
  }, [campaign, getDisparoRecipients]);

  useEffect(() => {
    if (open && campaign) {
      loadRecipients();
    }
  }, [open, campaign, loadRecipients]);


  const progress = useMemo(() => {
    if (!campaign) return 0;
    return campaign.total_recipients > 0 
      ? Math.round((campaign.sent_count / campaign.total_recipients) * 100)
      : 0;
  }, [campaign]);

  const handleExport = useCallback(() => {
    if (!campaign) return;
    
    try {
      // Exportar para CSV
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

      // Criar blob com BOM para Excel reconhecer UTF-8 corretamente
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `campanha-${campaign.campaign_name}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success("Relatório exportado com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar relatório:", error);
      toast.error("Erro ao exportar relatório");
    }
  }, [campaign, recipients]);

  const handlePause = useCallback(() => {
    if (onPause) onPause();
  }, [onPause]);

  const handleResume = useCallback(() => {
    if (onResume) onResume();
  }, [onResume]);

  if (!campaign) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-full p-0 bg-[hsl(var(--bg-primary))] border-border/50 max-h-[90vh] overflow-y-auto">
        <div className="glass rounded-2xl p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold flex-1">{campaign.campaign_name}</h2>
          </div>

          {/* Status Card */}
          <GlassCard glow>
            <div className="flex items-center justify-between mb-3">
              <Badge variant={campaign.status === "in_progress" ? "default" : "secondary"}>
                {campaign.status === "in_progress" ? (
                  <>
                    <Clock className="w-3 h-3 mr-1" />
                    EM ANDAMENTO
                  </>
                ) : campaign.status === "completed" ? (
                  <>
                    <Check className="w-3 h-3 mr-1" />
                    CONCLUÍDA
                  </>
                ) : campaign.status === "scheduled" ? (
                  <>
                    <Clock className="w-3 h-3 mr-1" />
                    AGENDADA
                  </>
                ) : (
                  <>
                    <X className="w-3 h-3 mr-1" />
                    {campaign.status.toUpperCase()}
                  </>
                )}
              </Badge>
            </div>
            <Progress value={progress} className="mb-4" />
            
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <GlassCard className="text-center p-2 sm:p-3">
                <div className="text-base sm:text-lg font-bold gradient-text">{campaign.sent_count}</div>
                <div className="text-xs text-muted-foreground">Enviou</div>
              </GlassCard>
              <GlassCard className="text-center p-2 sm:p-3">
                <div className="text-base sm:text-lg font-bold text-success">
                  {campaign.delivered_count > 0 ? campaign.delivered_count : campaign.sent_count || 0}
                </div>
                <div className="text-xs text-muted-foreground">Entrega</div>
              </GlassCard>
              <GlassCard className="text-center p-2 sm:p-3">
                <div className="text-base sm:text-lg font-bold text-destructive">{campaign.failed_count}</div>
                <div className="text-xs text-muted-foreground">Erro</div>
              </GlassCard>
            </div>
          </GlassCard>

          {/* Detalhes do Envio */}
          <GlassCard>
            <h3 className="font-semibold mb-4">Detalhes do Envio</h3>
            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Carregando...</p>
              </div>
            ) : recipients.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Nenhum destinatário encontrado</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {recipients.map((recipient) => (
                  <div
                    key={recipient.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-[hsl(var(--bg-input))]"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {/* Verificar status: se foi enviado (sent_at ou status sent/delivered), mostrar check, senão relógio */}
                        {recipient.status === "failed" ? (
                          <X className="w-4 h-4 text-destructive" />
                        ) : recipient.sent_at || recipient.status === "sent" || recipient.status === "delivered" || recipient.delivered_at ? (
                          <Check className="w-4 h-4 text-success" />
                        ) : (
                          <Clock className="w-4 h-4 text-warning" />
                        )}
                        <span className="text-sm font-medium">{recipient.name || recipient.phone_number}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{recipient.phone_number}</p>
                      {recipient.error_message && (
                        <p className="text-xs text-destructive mt-1">{recipient.error_message}</p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {recipient.sent_at 
                        ? new Date(recipient.sent_at).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : '-'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          {/* Botões */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={handleExport}
              className="flex-1 w-full sm:w-auto"
            >
              <Download className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Exportar Relatório</span>
              <span className="sm:hidden">Exportar</span>
            </Button>
            {campaign.status === "in_progress" && onPause && (
              <Button
                onClick={handlePause}
                className="flex-1 w-full sm:w-auto bg-gradient-to-r from-warning to-destructive"
              >
                <Pause className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">PAUSAR CAMPANHA</span>
                <span className="sm:hidden">PAUSAR</span>
              </Button>
            )}
            {campaign.status === "paused" && onResume && (
              <Button
                onClick={handleResume}
                className="flex-1 w-full sm:w-auto bg-gradient-to-r from-accent-purple to-accent-cyan"
              >
                <Play className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">RETOMAR CAMPANHA</span>
                <span className="sm:hidden">RETOMAR</span>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});
CampaignDetailsModal.displayName = 'CampaignDetailsModal';

