import { useState, useEffect, useCallback, memo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Bot, Plus, Edit, Trash2, Play, Pause, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useConnections } from "@/hooks/useConnections";
import { useAuth } from "@/hooks/useAuth";
import { BottomNav } from "@/components/BottomNav";
import { FlowBuilder } from "@/components/FlowBuilder";
import { Node, Edge } from "reactflow";

interface ChatbotFlow {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  trigger_type: string;
  trigger_keywords: string[] | null;
  connection_id: string | null;
  flow_data?: any;
  connection?: {
    name: string;
  };
  created_at: string;
  updated_at: string;
}

const ChatbotFlows = memo(() => {
  const [flows, setFlows] = useState<ChatbotFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditorDialog, setShowEditorDialog] = useState(false);
  const [editingFlow, setEditingFlow] = useState<ChatbotFlow | null>(null);
  const [editorNodes, setEditorNodes] = useState<Node[]>([]);
  const [editorEdges, setEditorEdges] = useState<Edge[]>([]);
  const { connections } = useConnections();
  const { user } = useAuth();

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    connection_id: "",
    trigger_type: "keyword",
    trigger_keywords: "",
    exit_keyword: "", // Palavra-chave para finalizar fluxo (ex: #Sair)
    transfer_keyword: "", // Palavra-chave para transferir para humano (ex: atendente)
    webhook_events: ["Message"], // Eventos do webhook (padrão: Message)
    is_active: false,
  });

  const loadFlows = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("chatbot_flows")
        .select(`
          *,
          connections:connection_id (
            id,
            name
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Transformar dados para incluir connection name
      const transformedData = (data || []).map((flow: any) => ({
        ...flow,
        connection: flow.connections ? { name: flow.connections.name } : null,
      }));

      setFlows(transformedData);
    } catch (error: any) {
      console.error("Erro ao carregar fluxos:", error);
      toast.error("Erro ao carregar fluxos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFlows();
  }, [loadFlows]);

  const handleCreateFlow = async () => {
    try {
      if (!formData.name || !formData.connection_id) {
        toast.error("Preencha nome e instância");
        return;
      }

      // Criar fluxo básico
      const flowData = {
        user_id: user?.id, // Adicionar user_id para passar na política RLS
        name: formData.name,
        description: formData.description || null,
        connection_id: formData.connection_id,
        is_active: formData.is_active,
        trigger_type: formData.trigger_type,
        trigger_keywords: formData.trigger_keywords
          ? formData.trigger_keywords.split(",").map((k) => k.trim())
          : null,
        settings: {
          exit_keyword: formData.exit_keyword.trim() || null, // Palavra-chave para finalizar fluxo
          transfer_keyword: formData.transfer_keyword.trim() || null, // Palavra-chave para transferir para humano
          webhook_events: formData.webhook_events, // Eventos do webhook
        },
        flow_data: {
          nodes: [
            {
              id: "node_1",
              type: "message",
              data: { text: "Olá! Como posso ajudar?" },
              next: ["node_2"],
            },
            {
              id: "node_2",
              type: "wait",
              data: {},
              next: ["node_3"],
            },
            {
              id: "node_3",
              type: "message",
              data: { text: "Recebi sua mensagem: {{user_message}}" },
              next: ["node_4"],
            },
            {
              id: "node_4",
              type: "end",
              data: {},
            },
          ],
          edges: [
            { id: "edge_1", from: "node_1", to: "node_2" },
            { id: "edge_2", from: "node_2", to: "node_3" },
            { id: "edge_3", from: "node_3", to: "node_4" },
          ],
          startNode: "node_1",
        },
      };

      const { error } = await supabase.from("chatbot_flows").insert(flowData);

      if (error) throw error;

      // Se está ativando o fluxo, configurar webhook automaticamente
      if (formData.is_active && formData.connection_id) {
        console.log("🔄 Configurando webhook automaticamente...");
        
        // Buscar dados da conexão
        const { data: connection, error: connError } = await supabase
          .from("connections")
          .select("api_instance_token")
          .eq("id", formData.connection_id)
          .single();

        if (connError || !connection) {
          console.error("Erro ao buscar conexão:", connError);
          toast.warning("Fluxo criado, mas não foi possível configurar webhook automaticamente");
        } else {
          // Construir URL do webhook
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
          const webhookUrl = `${supabaseUrl}/functions/v1/whatsapp-chatbot`;
          
          // Eventos configurados para o chatbot
          const events = formData.webhook_events && formData.webhook_events.length > 0 
            ? formData.webhook_events 
            : ["Message"]; // Fallback para Message se não houver eventos selecionados

          console.log("📡 Configurando webhook:", {
            url: webhookUrl,
            events,
            instance: connection.api_instance_token.substring(0, 10) + "..."
          });

          // Importar e usar o serviço de WhatsApp API
          const { WhatsAppApiService } = await import("@/lib/whatsapp-api");
          const whatsappApi = new WhatsAppApiService();
          
          console.log("🔧 Chamando updateWebhook com:", {
            method: "PUT",
            endpoint: "/webhook",
            active: true,
            eventsCount: events.length
          });

          // Usar updateWebhook (PUT) em vez de setWebhook (POST)
          // PUT atualiza webhook existente e ativa automaticamente
          const webhookResult = await whatsappApi.updateWebhook(
            connection.api_instance_token,
            webhookUrl,
            events,
            true // Active: true
          );

          console.log("📨 Resposta do webhook:", webhookResult);

          if (webhookResult.success) {
            console.log("✅ Webhook configurado com sucesso!", {
              url: webhookUrl,
              events: events,
              active: true
            });
            toast.success("Fluxo criado e webhook configurado automaticamente!");
          } else {
            console.error("❌ Erro ao configurar webhook:", webhookResult.error);
            toast.warning(`Fluxo criado, mas houve erro ao configurar webhook: ${webhookResult.error || "Erro desconhecido"}`);
          }
        }
      } else {
        toast.success("Fluxo criado com sucesso!");
      }

      setShowCreateDialog(false);
      resetForm();
      loadFlows();
    } catch (error: any) {
      console.error("Erro ao criar fluxo:", error);
      toast.error("Erro ao criar fluxo: " + (error.message || "Erro desconhecido"));
    }
  };

  const handleUpdateFlow = async () => {
    if (!editingFlow) return;
    
    try {
      const { error } = await supabase
        .from("chatbot_flows")
        .update({
          name: formData.name,
          description: formData.description || null,
          trigger_type: formData.trigger_type,
          trigger_keywords: formData.trigger_keywords
            ? formData.trigger_keywords.split(",").map((k) => k.trim())
            : null,
          settings: {
            exit_keyword: formData.exit_keyword.trim() || null,
            transfer_keyword: formData.transfer_keyword.trim() || null,
            webhook_events: formData.webhook_events,
          },
        })
        .eq("id", editingFlow.id);

      if (error) throw error;

      toast.success("Configurações do fluxo atualizadas!");
      setShowCreateDialog(false);
      resetForm();
      loadFlows();
    } catch (error: any) {
      console.error("Erro ao atualizar fluxo:", error);
      toast.error("Erro ao atualizar fluxo: " + (error.message || "Erro desconhecido"));
    }
  };

  const handleToggleActive = async (flow: ChatbotFlow) => {
    try {
      const newActiveStatus = !flow.is_active;

      // Atualizar status do fluxo
      const { error } = await supabase
        .from("chatbot_flows")
        .update({ is_active: newActiveStatus })
        .eq("id", flow.id);

      if (error) throw error;

      // Se está ativando o fluxo, configurar webhook automaticamente
      if (newActiveStatus && flow.connection_id) {
        console.log("🔄 Configurando webhook automaticamente...");
        
        // Buscar dados da conexão
        const { data: connection, error: connError } = await supabase
          .from("connections")
          .select("api_instance_token")
          .eq("id", flow.connection_id)
          .single();

        if (connError || !connection) {
          console.error("Erro ao buscar conexão:", connError);
          toast.warning("Fluxo ativado, mas não foi possível configurar webhook automaticamente");
        } else {
          // Construir URL do webhook
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
          const webhookUrl = `${supabaseUrl}/functions/v1/whatsapp-chatbot`;
          
          // Eventos padrão para o chatbot (usar Message como padrão)
          const events = ["Message"];

          console.log("📡 Configurando webhook:", {
            url: webhookUrl,
            events,
            instance: connection.api_instance_token.substring(0, 10) + "..."
          });

          // Importar e usar o serviço de WhatsApp API
          const { WhatsAppApiService } = await import("@/lib/whatsapp-api");
          const whatsappApi = new WhatsAppApiService();
          
          console.log("🔧 Chamando updateWebhook com:", {
            method: "PUT",
            endpoint: "/webhook",
            active: true,
            eventsCount: events.length
          });

          // Usar updateWebhook (PUT) em vez de setWebhook (POST)
          // PUT atualiza webhook existente e ativa automaticamente
          const webhookResult = await whatsappApi.updateWebhook(
            connection.api_instance_token,
            webhookUrl,
            events,
            true // Active: true
          );

          console.log("📨 Resposta do webhook:", webhookResult);

          if (webhookResult.success) {
            console.log("✅ Webhook configurado com sucesso!", {
              url: webhookUrl,
              events: events,
              active: true
            });
            toast.success("Fluxo ativado e webhook configurado automaticamente!");
          } else {
            console.error("❌ Erro ao configurar webhook:", webhookResult.error);
            toast.warning(`Fluxo ativado, mas houve erro ao configurar webhook: ${webhookResult.error || "Erro desconhecido"}`);
          }
        }
      } else {
        toast.success(flow.is_active ? "Fluxo desativado" : "Fluxo ativado");
      }

      loadFlows();
    } catch (error: any) {
      console.error("Erro ao atualizar fluxo:", error);
      toast.error("Erro ao atualizar fluxo");
    }
  };

  const handleDeleteFlow = async (flowId: string) => {
    if (!confirm("Tem certeza que deseja excluir este fluxo?")) return;

    try {
      const { error } = await supabase.from("chatbot_flows").delete().eq("id", flowId);

      if (error) throw error;

      toast.success("Fluxo excluído com sucesso!");
      loadFlows();
    } catch (error: any) {
      console.error("Erro ao excluir fluxo:", error);
      toast.error("Erro ao excluir fluxo");
    }
  };

  const handleOpenEditor = (flow: ChatbotFlow) => {
    setEditingFlow(flow);
    
    // Converter flow_data do banco para nodes e edges do React Flow
    const flowData = flow.flow_data as any;
    if (flowData && flowData.nodes) {
      const nodes: Node[] = flowData.nodes.map((node: any) => ({
        id: node.id,
        type: node.type,
        // Usar posição salva ou posição padrão
        position: node.position || { x: Math.random() * 600 + 200, y: Math.random() * 400 + 200 },
        data: node.data,
      }));
      
      const edges: Edge[] = flowData.edges.map((edge: any, index: number) => {
        console.log('📥 Carregando edge:', {
          id: edge.id,
          from: edge.from,
          to: edge.to,
          sourceHandle: edge.sourceHandle,
        });
        
        return {
          id: edge.id || `edge_${index}`,
          source: edge.from,
          target: edge.to,
          sourceHandle: edge.sourceHandle || undefined, // IMPORTANTE: Preservar sourceHandle ao carregar
        };
      });
      
      setEditorNodes(nodes);
      setEditorEdges(edges);
    } else {
      // Fluxo vazio - criar nó inicial
      setEditorNodes([
        {
          id: "node_1",
          type: "message",
          position: { x: 400, y: 300 },
          data: { text: "Olá! Como posso ajudar?" },
        },
      ]);
      setEditorEdges([]);
    }
    
    setShowEditorDialog(true);
  };

  const handleSaveFlow = async (nodes: Node[], edges: Edge[]) => {
    if (!editingFlow) return;

    try {
      // Converter nodes e edges para o formato do banco (INCLUINDO POSIÇÕES)
      const flowData = {
        nodes: nodes.map((node) => ({
          id: node.id,
          type: node.type,
          position: node.position, // SALVAR POSIÇÃO
          data: node.data,
          next: edges.filter((e) => e.source === node.id).map((e) => e.target),
        })),
        edges: edges.map((edge) => {
          console.log('💾 Salvando edge:', {
            id: edge.id,
            from: edge.source,
            to: edge.target,
            sourceHandle: edge.sourceHandle,
          });
          
          return {
            id: edge.id,
            from: edge.source,
            to: edge.target,
            sourceHandle: edge.sourceHandle || null, // IMPORTANTE: Preservar sourceHandle (true/false para condições)
          };
        }),
        startNode: nodes.find((n) => n.type === "message")?.id || nodes[0]?.id,
      };

      const { error } = await supabase
        .from("chatbot_flows")
        .update({ flow_data: flowData })
        .eq("id", editingFlow.id);

      if (error) throw error;

      toast.success("Fluxo salvo com sucesso!");
      setShowEditorDialog(false);
      setEditingFlow(null);
      loadFlows();
    } catch (error: any) {
      console.error("Erro ao salvar fluxo:", error);
      toast.error("Erro ao salvar fluxo: " + (error.message || "Erro desconhecido"));
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      connection_id: "",
      trigger_type: "keyword",
      trigger_keywords: "",
      exit_keyword: "",
      transfer_keyword: "",
      webhook_events: ["Message"],
      is_active: false,
    });
    setEditingFlow(null);
  };

  const getTriggerLabel = (type: string) => {
    const labels: Record<string, string> = {
      keyword: "Palavra-chave",
      campaign_response: "Resposta a Campanha",
      first_message: "Primeira Mensagem",
      time_based: "Baseado em Horário",
      manual: "Manual",
    };
    return labels[type] || type;
  };

  return (
    <div className="min-h-screen tech-grid-bg pb-20 lg:pb-0">
      <PageHeader
        title="Fluxos de Chatbot"
        description="Crie e gerencie fluxos automatizados de conversa (tipo Typebot)"
        icon={Bot}
      />

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Botão Criar */}
        <div className="flex justify-end">
          <Button
            onClick={() => {
              resetForm();
              setShowCreateDialog(true);
            }}
            className="bg-gradient-to-r from-accent-purple to-accent-cyan"
          >
            <Plus className="w-4 h-4 mr-2" />
            Criar Novo Fluxo
          </Button>
        </div>

        {/* Lista de Fluxos */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-accent-purple border-t-transparent rounded-full animate-spin" />
          </div>
        ) : flows.length === 0 ? (
          <GlassCard className="p-12 text-center">
            <Bot className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">Nenhum fluxo criado</h3>
            <p className="text-muted-foreground mb-6">
              Crie seu primeiro fluxo de chatbot para automatizar conversas
            </p>
            <Button
              onClick={() => {
                resetForm();
                setShowCreateDialog(true);
              }}
              className="bg-gradient-to-r from-accent-purple to-accent-cyan"
            >
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeiro Fluxo
            </Button>
          </GlassCard>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {flows.map((flow) => (
              <GlassCard key={flow.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">{flow.name}</h3>
                    {flow.description && (
                      <p className="text-sm text-muted-foreground mb-2">{flow.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEditor(flow)}
                      className="h-8 w-8 p-0"
                      title="Editar fluxo"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(flow)}
                      className="h-8 w-8 p-0"
                      title={flow.is_active ? "Desativar" : "Ativar"}
                    >
                      {flow.is_active ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteFlow(flow.id)}
                      className="h-8 w-8 p-0 text-destructive"
                      title="Excluir fluxo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge
                      variant={flow.is_active ? "default" : "secondary"}
                      className={flow.is_active ? "bg-green-500" : ""}
                    >
                      {flow.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Trigger:</span>
                    <span className="font-medium">{getTriggerLabel(flow.trigger_type)}</span>
                  </div>

                  {flow.trigger_keywords && flow.trigger_keywords.length > 0 && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Palavras-chave: </span>
                      <span className="font-medium">{flow.trigger_keywords.join(", ")}</span>
                    </div>
                  )}

                  {flow.connection && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Instância:</span>
                      <span className="font-medium">{flow.connection.name}</span>
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground pt-2 border-t border-white/10">
                    Criado em {new Date(flow.created_at).toLocaleDateString("pt-BR")}
                  </div>

                  <div className="mt-3 pt-3 border-t border-white/10 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        const flowSettings = (flow as any).settings || {};
                        setFormData({
                          name: flow.name,
                          description: flow.description || "",
                          connection_id: flow.connection_id || "",
                          trigger_type: flow.trigger_type,
                          trigger_keywords: flow.trigger_keywords?.join(", ") || "",
                          exit_keyword: flowSettings.exit_keyword || "",
                          transfer_keyword: flowSettings.transfer_keyword || "",
                          webhook_events: flowSettings.webhook_events || ["Message"],
                          is_active: flow.is_active,
                        });
                        setEditingFlow(flow);
                        setShowCreateDialog(true);
                      }}
                    >
                      Configurações
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleOpenEditor(flow)}
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Editar Fluxo
                    </Button>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>

      {/* Dialog Criar/Editar */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => {
        setShowCreateDialog(open);
        if (!open) {
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingFlow ? "Editar Configurações do Fluxo" : "Criar Novo Fluxo"}</DialogTitle>
            <DialogDescription>
              {editingFlow 
                ? "Edite as configurações do fluxo. Use o botão 'Editar Fluxo' para modificar o fluxo visual."
                : "Configure seu fluxo de chatbot. Um fluxo básico será criado e você poderá editá-lo visualmente depois."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nome do Fluxo *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Atendimento Inicial"
              />
            </div>

            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva o propósito deste fluxo"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="connection_id">Instância WhatsApp *</Label>
              <Select
                value={formData.connection_id}
                onValueChange={(value) => setFormData({ ...formData, connection_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma instância" />
                </SelectTrigger>
                <SelectContent>
                  {connections
                    .filter((c) => c.status === "online")
                    .map((conn) => (
                      <SelectItem key={conn.id} value={conn.id}>
                        {conn.name} ({conn.status})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="trigger_type">Tipo de Trigger</Label>
              <Select
                value={formData.trigger_type}
                onValueChange={(value) => setFormData({ ...formData, trigger_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="keyword">Palavra-chave</SelectItem>
                  <SelectItem value="campaign_response">Resposta a Campanha</SelectItem>
                  <SelectItem value="first_message">Primeira Mensagem</SelectItem>
                  <SelectItem value="time_based">Baseado em Horário</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.trigger_type === "keyword" && (
              <div>
                <Label htmlFor="trigger_keywords">
                  Palavras-chave (separadas por vírgula) *
                </Label>
                <Input
                  id="trigger_keywords"
                  value={formData.trigger_keywords}
                  onChange={(e) =>
                    setFormData({ ...formData, trigger_keywords: e.target.value })
                  }
                  placeholder="oi, olá, teste"
                />
              </div>
            )}

            <div>
              <Label htmlFor="exit_keyword">
                Palavra-chave de Saída (opcional)
              </Label>
              <Input
                id="exit_keyword"
                value={formData.exit_keyword}
                onChange={(e) =>
                  setFormData({ ...formData, exit_keyword: e.target.value })
                }
                placeholder="Ex: #Sair, sair, encerrar"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Quando o lead digitar esta palavra, o fluxo será finalizado imediatamente
              </p>
            </div>

            <div>
              <Label htmlFor="transfer_keyword">
                Palavra-chave para Transferir para Humano (opcional)
              </Label>
              <Input
                id="transfer_keyword"
                value={formData.transfer_keyword || ""}
                onChange={(e) =>
                  setFormData({ ...formData, transfer_keyword: e.target.value })
                }
                placeholder="Ex: atendente, humano, falar com alguém"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Quando o lead digitar esta palavra, será transferido para atendimento humano
              </p>
            </div>

            <div>
              <Label className="mb-2 block">Eventos do Webhook</Label>
              <div className="space-y-2">
                {["Message", "ReadReceipt"].map((event) => (
                  <div key={event} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`event_${event}`}
                      checked={formData.webhook_events.includes(event)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            webhook_events: [...formData.webhook_events, event],
                          });
                        } else {
                          setFormData({
                            ...formData,
                            webhook_events: formData.webhook_events.filter((ev) => ev !== event),
                          });
                        }
                      }}
                      className="w-4 h-4 rounded border-white/20 bg-white/5 text-accent-purple focus:ring-accent-purple"
                    />
                    <Label htmlFor={`event_${event}`} className="cursor-pointer font-normal">
                      {event === "Message" ? "Mensagens" : "Confirmação de Leitura"}
                    </Label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Eventos que serão monitorados pelo webhook do chatbot
              </p>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Ativar fluxo imediatamente</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancelar
              </Button>
              <Button
                onClick={editingFlow ? handleUpdateFlow : handleCreateFlow}
                className="bg-gradient-to-r from-accent-purple to-accent-cyan"
              >
                {editingFlow ? "Salvar" : "Criar Fluxo"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Editor Visual - Fullscreen */}
      {showEditorDialog && (
        <div 
          className="fixed inset-0 z-[9999] bg-black flex flex-col"
          style={{ 
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh'
          }}
        >
          <div className="flex-shrink-0 p-3 border-b border-white/10 bg-black">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Editor de Fluxo - {editingFlow?.name}</h2>
                <p className="text-xs text-gray-400 mt-1">
                  Arraste e conecte os blocos. Clique no X vermelho ou pressione Delete para deletar.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowEditorDialog(false);
                  setEditingFlow(null);
                }}
                className="text-white hover:bg-white/10"
              >
                ✕ Fechar
              </Button>
            </div>
          </div>
          <div className="flex-1 w-full overflow-hidden" style={{ height: 'calc(100vh - 80px)' }}>
            <FlowBuilder
              initialNodes={editorNodes}
              initialEdges={editorEdges}
              onSave={handleSaveFlow}
              onClose={() => {
                setShowEditorDialog(false);
                setEditingFlow(null);
              }}
            />
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
});

ChatbotFlows.displayName = "ChatbotFlows";

export default ChatbotFlows;

