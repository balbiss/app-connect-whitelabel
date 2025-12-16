import { useState, useEffect, memo, useCallback, useMemo } from "react";
import { Link2, Trash2, Save, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { GradientButton } from "@/components/GradientButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { whatsappApi } from "@/lib/whatsapp-api";

interface WebhookModalProps {
  open: boolean;
  onClose: () => void;
  instanceToken: string;
  instanceName: string;
}

const EVENT_TYPES = [
  { id: "Message", label: "Message" },
  { id: "ReadReceipt", label: "Read Receipt" },
  { id: "Presence", label: "Presence" },
  { id: "HistorySync", label: "History Sync" },
  { id: "ChatPresence", label: "Chat Presence" },
  { id: "All", label: "All (Todos os eventos)" },
] as const;

export const WebhookModal = memo(({ 
  open, 
  onClose, 
  instanceToken,
  instanceName 
}: WebhookModalProps) => {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [active, setActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingGet, setLoadingGet] = useState(false);

  const loadWebhook = useCallback(async () => {
    setLoadingGet(true);
    try {
      const result = await whatsappApi.getWebhook(instanceToken);
      
      if (result.success && result.data) {
        setWebhookUrl(result.data.webhook || "");
        setSelectedEvents(result.data.subscribe || []);
        setActive(result.data.active !== false);
      } else {
        // Se não houver webhook configurado, limpar campos
        setWebhookUrl("");
        setSelectedEvents([]);
        setActive(true);
      }
    } catch (error) {
      console.error("Erro ao carregar webhook:", error);
      toast.error("Erro ao carregar configuração do webhook");
    } finally {
      setLoadingGet(false);
    }
  }, [instanceToken]);

  // Carregar webhook atual ao abrir o modal
  useEffect(() => {
    if (open && instanceToken) {
      loadWebhook();
    }
  }, [open, instanceToken, loadWebhook]);

  const handleEventToggle = useCallback((eventId: string) => {
    if (eventId === "All") {
      // Se "All" for selecionado, desmarcar todos os outros
      setSelectedEvents(["All"]);
    } else {
      // Se outro evento for selecionado, remover "All"
      const newEvents = selectedEvents.includes(eventId)
        ? selectedEvents.filter(e => e !== eventId)
        : [...selectedEvents.filter(e => e !== "All"), eventId];
      setSelectedEvents(newEvents);
    }
  }, [selectedEvents]);

  const handleSetWebhook = useCallback(async () => {
    if (!webhookUrl.trim()) {
      toast.error("Por favor, informe a URL do webhook");
      return;
    }

    if (selectedEvents.length === 0) {
      toast.error("Por favor, selecione pelo menos um tipo de evento");
      return;
    }

    setLoading(true);
    try {
      const result = await whatsappApi.setWebhook(instanceToken, webhookUrl, selectedEvents);
      
      if (result.success) {
        toast.success("Webhook configurado com sucesso!");
        onClose();
      } else {
        toast.error(result.error || "Erro ao configurar webhook");
      }
    } catch (error) {
      console.error("Erro ao configurar webhook:", error);
      toast.error("Erro ao configurar webhook");
    } finally {
      setLoading(false);
    }
  }, [instanceToken, webhookUrl, selectedEvents, onClose]);

  const handleUpdateWebhook = useCallback(async () => {
    if (!webhookUrl.trim()) {
      toast.error("Por favor, informe a URL do webhook");
      return;
    }

    if (selectedEvents.length === 0) {
      toast.error("Por favor, selecione pelo menos um tipo de evento");
      return;
    }

    setLoading(true);
    try {
      const result = await whatsappApi.updateWebhook(instanceToken, webhookUrl, selectedEvents, active);
      
      if (result.success) {
        toast.success("Webhook atualizado com sucesso!");
        onClose();
      } else {
        toast.error(result.error || "Erro ao atualizar webhook");
      }
    } catch (error) {
      console.error("Erro ao atualizar webhook:", error);
      toast.error("Erro ao atualizar webhook");
    } finally {
      setLoading(false);
    }
  }, [instanceToken, webhookUrl, selectedEvents, active, onClose]);

  const handleDeleteWebhook = useCallback(async () => {
    if (!confirm("Tem certeza que deseja deletar o webhook?")) {
      return;
    }

    setLoading(true);
    try {
      const result = await whatsappApi.deleteWebhook(instanceToken);
      
      if (result.success) {
        toast.success("Webhook deletado com sucesso!");
        setWebhookUrl("");
        setSelectedEvents([]);
        setActive(true);
        onClose();
      } else {
        toast.error(result.error || "Erro ao deletar webhook");
      }
    } catch (error) {
      console.error("Erro ao deletar webhook:", error);
      toast.error("Erro ao deletar webhook");
    } finally {
      setLoading(false);
    }
  }, [instanceToken, onClose]);

  const hasExistingWebhook = useMemo(() => webhookUrl.trim() !== "", [webhookUrl]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-full p-0 bg-[hsl(var(--bg-primary))] border-border/50 max-h-[90vh] overflow-y-auto">
        <DialogTitle className="sr-only">Configurar Webhook</DialogTitle>
        <DialogDescription className="sr-only">
          Configure a URL do webhook e os tipos de eventos para receber notificações do WhatsApp
        </DialogDescription>
        <div className="glass rounded-2xl p-6 space-y-6">
          {/* Header */}
          <div>
            <h2 className="text-xl font-bold">Configurar Webhook</h2>
            <p className="text-sm text-muted-foreground mt-1">{instanceName}</p>
          </div>

          {loadingGet ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-accent-cyan" />
              <span className="ml-2 text-sm text-muted-foreground">Carregando configuração...</span>
            </div>
          ) : (
            <>
              {/* URL do Webhook */}
              <div className="space-y-2">
                <Label htmlFor="webhook-url" className="text-sm font-medium">
                  URL do Webhook
                </Label>
                <div className="flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-muted-foreground" />
                  <Input
                    id="webhook-url"
                    type="url"
                    placeholder="https://example.com/webhook"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  URL que receberá os eventos do WhatsApp
                </p>
              </div>

              {/* Tipos de Eventos */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Tipos de Eventos</Label>
                <div className="grid grid-cols-2 gap-3">
                  {EVENT_TYPES.map((event) => (
                    <div key={event.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`event-${event.id}`}
                        checked={selectedEvents.includes(event.id)}
                        onCheckedChange={() => handleEventToggle(event.id)}
                      />
                      <label
                        htmlFor={`event-${event.id}`}
                        className="text-sm cursor-pointer select-none"
                      >
                        {event.label}
                      </label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Selecione os tipos de eventos que deseja receber no webhook
                </p>
              </div>

              {/* Ativo (apenas para update) */}
              {hasExistingWebhook && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="webhook-active"
                    checked={active}
                    onCheckedChange={(checked) => setActive(checked === true)}
                  />
                  <label
                    htmlFor="webhook-active"
                    className="text-sm cursor-pointer select-none"
                  >
                    Webhook ativo
                  </label>
                </div>
              )}

              {/* Botões */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border/30">
                {hasExistingWebhook ? (
                  <>
                    <GradientButton
                      onClick={handleUpdateWebhook}
                      disabled={loading}
                      className="flex-1"
                      variant="pink-red"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {loading ? "Atualizando..." : "Atualizar Webhook"}
                    </GradientButton>
                    <GradientButton
                      onClick={handleDeleteWebhook}
                      disabled={loading}
                      className="flex-1"
                      variant="pink-red"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {loading ? "Deletando..." : "Deletar Webhook"}
                    </GradientButton>
                  </>
                ) : (
                  <GradientButton
                    onClick={handleSetWebhook}
                    disabled={loading}
                    className="w-full"
                    variant="pink-red"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {loading ? "Configurando..." : "Configurar Webhook"}
                  </GradientButton>
                )}
                <GradientButton
                  onClick={loadWebhook}
                  disabled={loadingGet}
                  className="w-full sm:w-auto"
                  variant="pink-red"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${loadingGet ? 'animate-spin' : ''}`} />
                  Atualizar
                </GradientButton>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
});
WebhookModal.displayName = 'WebhookModal';

