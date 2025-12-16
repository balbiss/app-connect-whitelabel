import { useState, useEffect } from "react";
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
import { toast } from "sonner";
import { Plus, MessageSquare, Play, Pause, Trash2, Edit, Settings } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { whatsappApi } from "@/lib/whatsapp-api";

interface ChatbotFlow {
  id: string;
  name: string;
  connection_id: string;
  is_active: boolean;
  settings: any;
  created_at: string;
  updated_at: string;
}

const ChatbotFlows = () => {
  const { profile } = useAuth();
  const { connections, loading: connectionsLoading } = useConnections();
  const [flows, setFlows] = useState<ChatbotFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingFlow, setEditingFlow] = useState<ChatbotFlow | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    connection_id: "",
    is_active: false,
    settings: {},
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

    try {
      const { data, error } = await supabase
        .from("chatbot_flows")
        .insert({
          user_id: profile?.id,
          name: formData.name,
          connection_id: formData.connection_id,
          is_active: formData.is_active,
          settings: formData.settings,
        })
        .select()
        .single();

      if (error) throw error;

      setFlows([data, ...flows]);
      setShowCreateModal(false);
      setFormData({ name: "", connection_id: "", is_active: false, settings: {} });
      toast.success("Fluxo criado com sucesso!");
    } catch (error: any) {
      console.error("Erro ao criar flow:", error);
      toast.error("Erro ao criar fluxo");
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
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
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
                    <Button variant="outline" size="sm" onClick={() => setEditingFlow(flow)}>
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
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md glass">
            <CardHeader>
              <CardTitle>Criar Novo Fluxo</CardTitle>
              <CardDescription>Configure um novo fluxo de chatbot</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Nome do Fluxo</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Atendimento Inicial"
                />
              </div>
              <div>
                <Label htmlFor="connection_id">Conexão WhatsApp</Label>
                <select
                  id="connection_id"
                  value={formData.connection_id}
                  onChange={(e) => setFormData({ ...formData, connection_id: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md"
                >
                  <option value="">Selecione uma conexão</option>
                  {connections.map((conn) => (
                    <option key={conn.id} value={conn.id}>
                      {conn.name}
                    </option>
                  ))}
                </select>
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
              <div className="flex gap-2">
                <Button onClick={handleCreateFlow} className="flex-1">
                  Criar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormData({ name: "", connection_id: "", is_active: false, settings: {} });
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ChatbotFlows;
