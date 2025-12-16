import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useConnections } from "@/hooks/useConnections";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/Skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, MessageSquare, Play, Pause, Trash2, Edit, Settings, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { whatsappApi } from "@/lib/whatsapp-api";
import { FlowBuilder } from "@/components/FlowBuilder";
import { useNavigate } from "react-router-dom";
import type { Node, Edge } from "reactflow";

interface ChatbotFlow {
  id: string;
  name: string;
  description?: string;
  connection_id: string;
  is_active: boolean;
  trigger_type: 'campaign_response' | 'keyword' | 'first_message' | 'time_based' | 'manual';
  trigger_keywords?: string[];
  trigger_campaign_id?: string;
  trigger_schedule?: any;
  flow_data: { nodes: Node[]; edges: Edge[] };
  settings: {
    timeout?: number;
    max_conversations?: number;
    greeting_message?: string;
    fallback_message?: string;
    transfer_to_human_keyword?: string;
    exit_keyword?: string;
  };
  created_at: string;
  updated_at: string;
}

const ChatbotFlows = () => {
  const { profile } = useAuth();
  const { connections, loading: connectionsLoading } = useConnections();
  const navigate = useNavigate();
  const [flows, setFlows] = useState<ChatbotFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingFlow, setEditingFlow] = useState<ChatbotFlow | null>(null);
  const [showFlowEditor, setShowFlowEditor] = useState(false);
  const [currentFlowId, setCurrentFlowId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    connection_id: "",
    trigger_type: 'keyword' as ChatbotFlow['trigger_type'],
    trigger_keywords: "",
    exit_keyword: "",
    transfer_to_human_keyword: "",
    is_active: false,
  });

  // Carregar flows
  useEffect(() => {
    if (!profile?.id) return;

    const loadFlows = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("chatbot_flows")
          .select("*")
          .eq("user_id", profile.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setFlows(data || []);
      } catch (error: any) {
        console.error("Erro ao carregar flows:", error);
        toast.error("Erro ao carregar fluxos de chatbot");
      } finally {
        setLoading(false);
      }
    };

    loadFlows();
  }, [profile?.id]);

  const handleCreateFlow = async () => {
    if (!formData.name || !formData.connection_id) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (formData.trigger_type === 'keyword' && !formData.trigger_keywords) {
      toast.error("Informe pelo menos uma palavra-chave");
      return;
    }

    try {
      // Processar palavras-chave
      const keywords = formData.trigger_keywords
        ? formData.trigger_keywords.split(',').map(k => k.trim()).filter(k => k)
        : [];

      const { data, error } = await supabase
        .from("chatbot_flows")
        .insert({
          user_id: profile?.id,
          name: formData.name,
          description: formData.description || null,
          connection_id: formData.connection_id,
          trigger_type: formData.trigger_type,
          trigger_keywords: formData.trigger_type === 'keyword' ? keywords : null,
          is_active: formData.is_active,
          flow_data: { nodes: [], edges: [] },
          settings: {
            timeout: 300,
            max_conversations: 100,
            fallback_message: "Desculpe, não entendi. Pode repetir?",
            transfer_to_human_keyword: formData.transfer_to_human_keyword || null,
            exit_keyword: formData.exit_keyword || null,
          },
        })
        .select()
        .single();

      if (error) throw error;

      setFlows([data, ...flows]);
      setShowCreateModal(false);
      setFormData({
        name: "",
        description: "",
        connection_id: "",
        trigger_type: 'keyword',
        trigger_keywords: "",
        exit_keyword: "",
        transfer_to_human_keyword: "",
        is_active: false,
      });
      toast.success("Fluxo criado com sucesso!");
      
      // Abrir editor visual
      setCurrentFlowId(data.id);
      setShowFlowEditor(true);
    } catch (error: any) {
      console.error("Erro ao criar flow:", error);
      toast.error("Erro ao criar fluxo: " + (error.message || "Erro desconhecido"));
    }
  };

  const handleToggleActive = async (flow: ChatbotFlow) => {
    try {
      const { error } = await supabase
        .from("chatbot_flows")
        .update({ is_active: !flow.is_active })
        .eq("id", flow.id);

      if (error) throw error;

      setFlows(flows.map((f) => (f.id === flow.id ? { ...f, is_active: !f.is_active } : f)));
      toast.success(`Fluxo ${!flow.is_active ? "ativado" : "desativado"} com sucesso!`);
    } catch (error: any) {
      console.error("Erro ao atualizar flow:", error);
      toast.error("Erro ao atualizar fluxo");
    }
  };

  const handleDeleteFlow = async (flowId: string) => {
    if (!confirm("Tem certeza que deseja excluir este fluxo?")) return;

    try {
      const { error } = await supabase.from("chatbot_flows").delete().eq("id", flowId);

      if (error) throw error;

      setFlows(flows.filter((f) => f.id !== flowId));
      toast.success("Fluxo excluído com sucesso!");
    } catch (error: any) {
      console.error("Erro ao excluir flow:", error);
      toast.error("Erro ao excluir fluxo");
    }
  };

  const handleOpenEditor = (flow: ChatbotFlow) => {
    setCurrentFlowId(flow.id);
    setEditingFlow(flow);
    setShowFlowEditor(true);
  };

  const handleSaveFlow = useCallback(async (nodes: Node[], edges: Edge[]) => {
    if (!currentFlowId) return;

    try {
      const { error } = await supabase
        .from("chatbot_flows")
        .update({
          flow_data: { nodes, edges },
          updated_at: new Date().toISOString(),
        })
        .eq("id", currentFlowId);

      if (error) throw error;

      setFlows(flows.map((f) =>
        f.id === currentFlowId
          ? { ...f, flow_data: { nodes, edges }, updated_at: new Date().toISOString() }
          : f
      ));
      toast.success("Fluxo salvo com sucesso!");
      setShowFlowEditor(false);
      setCurrentFlowId(null);
      setEditingFlow(null);
    } catch (error: any) {
      console.error("Erro ao salvar flow:", error);
      toast.error("Erro ao salvar fluxo");
    }
  }, [currentFlowId, flows]);

  if (loading || connectionsLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <PageHeader title="Fluxos de Chatbot" description="Gerencie seus fluxos de chatbot automatizados." />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          <Skeleton className="h-[200px]" />
          <Skeleton className="h-[200px]" />
          <Skeleton className="h-[200px]" />
        </div>
      </div>
    );
  }

  const currentFlow = editingFlow || flows.find(f => f.id === currentFlowId);

  return (
    <div className="container mx-auto py-8 px-4">
      <PageHeader title="Fluxos de Chatbot" description="Gerencie seus fluxos de chatbot automatizados." />

      <div className="flex justify-end mb-6">
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Criar Novo Fluxo
        </Button>
      </div>

      {flows.length === 0 ? (
        <Card className="glass">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              Nenhum fluxo de chatbot criado ainda. Crie seu primeiro fluxo para começar!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {flows.map((flow) => {
            const connection = connections.find((c) => c.id === flow.connection_id);
            return (
              <Card key={flow.id} className="glass">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{flow.name}</CardTitle>
                    <Badge variant={flow.is_active ? "default" : "secondary"}>
                      {flow.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  <CardDescription>
                    {connection?.name || "Conexão não encontrada"}
                  </CardDescription>
                  {flow.description && (
                    <CardDescription className="mt-1">{flow.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(flow)}
                    >
                      {flow.is_active ? (
                        <>
                          <Pause className="w-4 h-4 mr-2" />
                          Desativar
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Ativar
                        </>
                      )}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleOpenEditor(flow)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Editar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteFlow(flow.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal de criação */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Criar Novo Fluxo</DialogTitle>
            <DialogDescription>
              Configure seu fluxo de chatbot. Um fluxo básico será criado e você poderá editá-lo visualmente depois.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
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
                <SelectTrigger id="connection_id">
                  <SelectValue placeholder="Selecione uma instância" />
                </SelectTrigger>
                <SelectContent>
                  {connections.map((conn) => (
                    <SelectItem key={conn.id} value={conn.id}>
                      {conn.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="trigger_type">Tipo de Trigger</Label>
              <Select
                value={formData.trigger_type}
                onValueChange={(value: ChatbotFlow['trigger_type']) => setFormData({ ...formData, trigger_type: value })}
              >
                <SelectTrigger id="trigger_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="keyword">Palavra-chave</SelectItem>
                  <SelectItem value="first_message">Primeira Mensagem</SelectItem>
                  <SelectItem value="campaign_response">Resposta a Campanha</SelectItem>
                  <SelectItem value="time_based">Baseado em Horário</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.trigger_type === 'keyword' && (
              <div>
                <Label htmlFor="trigger_keywords">Palavras-chave (separadas por vírgula) *</Label>
                <Input
                  id="trigger_keywords"
                  value={formData.trigger_keywords}
                  onChange={(e) => setFormData({ ...formData, trigger_keywords: e.target.value })}
                  placeholder="Ex: oi, olá, teste"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Quando o lead enviar uma dessas palavras, o fluxo será ativado
                </p>
              </div>
            )}
            <div>
              <Label htmlFor="exit_keyword">Palavra-chave de Saída (opcional)</Label>
              <Input
                id="exit_keyword"
                value={formData.exit_keyword}
                onChange={(e) => setFormData({ ...formData, exit_keyword: e.target.value })}
                placeholder="Ex: #Sair, sair, encerrar"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Quando o lead digitar esta palavra, o fluxo será finalizado imediatamente
              </p>
            </div>
            <div>
              <Label htmlFor="transfer_to_human_keyword">Palavra-chave para Transferir para Humano (opcional)</Label>
              <Input
                id="transfer_to_human_keyword"
                value={formData.transfer_to_human_keyword}
                onChange={(e) => setFormData({ ...formData, transfer_to_human_keyword: e.target.value })}
                placeholder="Ex: atendente, humano, falar com alguém"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Quando o lead digitar esta palavra, será transferido para atendimento humano
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4"
              />
              <Label htmlFor="is_active">Ativar imediatamente</Label>
            </div>
            <div className="flex gap-2 pt-4">
              <Button onClick={handleCreateFlow} className="flex-1">
                Criar e Editar
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateModal(false);
                  setFormData({
                    name: "",
                    description: "",
                    connection_id: "",
                    trigger_type: 'keyword',
                    trigger_keywords: "",
                    exit_keyword: "",
                    transfer_to_human_keyword: "",
                    is_active: false,
                  });
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Editor Visual de Fluxo */}
      {showFlowEditor && currentFlow && (
        <div className="fixed inset-0 z-50 bg-background">
          <FlowBuilder
            initialNodes={currentFlow.flow_data?.nodes || []}
            initialEdges={currentFlow.flow_data?.edges || []}
            onSave={handleSaveFlow}
            onClose={() => {
              setShowFlowEditor(false);
              setCurrentFlowId(null);
              setEditingFlow(null);
            }}
          />
        </div>
      )}
    </div>
  );
};

export default ChatbotFlows;
