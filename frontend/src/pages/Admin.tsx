import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { GlassCard } from "@/components/GlassCard";
import { GradientButton } from "@/components/GradientButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Settings, 
  Crown, 
  Ban, 
  CheckCircle, 
  XCircle, 
  Edit, 
  Save, 
  X,
  Calendar,
  DollarSign,
  Mail,
  Phone,
  Search,
  RefreshCw,
  Plus,
  Trash2
} from "lucide-react";
import { useAdmin } from "@/hooks/useAdmin";
import { useResellers } from "@/hooks/useResellers";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Skeleton, SkeletonList } from "@/components/Skeleton";
import { Copy, UserPlus } from "lucide-react";

interface UserProfile {
  id: string;
  email: string | null;
  name: string | null;
  plan: string | null;
  subscription_status: string | null;
  subscription_ends_at: string | null;
  is_blocked: boolean;
  max_connections: number;
  created_at: string;
}

interface PlanConfig {
  id: string;
  name: string;
  description: string | null;
  price: number;
  checkout_url: string | null;
  max_connections: number;
  features: string[];
  active: boolean;
}

interface SystemSettings {
  support_email: string;
  support_phone: string;
  support_whatsapp: string;
  company_name: string;
  company_url: string;
}

const Admin = memo(() => {
  const navigate = useNavigate();
  const { isAdmin, profile } = useAdmin();
  const [activeTab, setActiveTab] = useState("users");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [plans, setPlans] = useState<PlanConfig[]>([]);
  const [settings, setSettings] = useState<SystemSettings>({
    support_email: "",
    support_phone: "",
    support_whatsapp: "",
    company_name: "",
    company_url: "",
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  const [creatingPlan, setCreatingPlan] = useState(false);
  const [editingSettings, setEditingSettings] = useState(false);
  
  // Verificação de admin é feita pelo ProtectedAdminRoute
  // Não precisa verificar novamente aqui para evitar redirecionamento duplo

  // Carregar dados
  const loadData = useCallback(async () => {
    if (!isAdmin) return;

    setLoading(true);
    try {
      // Carregar usuários
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;
      setUsers(usersData || []);

      // Carregar planos
      const { data: plansData, error: plansError } = await supabase
        .from('plans_config')
        .select('*')
        .order('display_order', { ascending: true });

      if (plansError) throw plansError;
      setPlans(plansData || []);

      // Carregar configurações
      const { data: settingsData, error: settingsError } = await supabase
        .from('system_settings')
        .select('*');

      if (settingsError) throw settingsError;
      
      const settingsObj: SystemSettings = {
        support_email: "",
        support_phone: "",
        support_whatsapp: "",
        company_name: "",
        company_url: "",
      };

      settingsData?.forEach((item: any) => {
        if (item.key === 'support_email') settingsObj.support_email = item.value as string;
        if (item.key === 'support_phone') settingsObj.support_phone = item.value as string;
        if (item.key === 'support_whatsapp') settingsObj.support_whatsapp = item.value as string;
        if (item.key === 'company_name') settingsObj.company_name = item.value as string;
        if (item.key === 'company_url') settingsObj.company_url = item.value as string;
      });

      setSettings(settingsObj);
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
      toast.error(error.message || "Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Ativar própria assinatura (admin)
  const activateOwnSubscription = useCallback(async () => {
    if (!profile?.id) return;
    
    try {
      const plan = plans.find(p => p.id === 'super_pro') || plans[0];
      if (!plan) {
        toast.error("Nenhum plano encontrado");
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          subscription_status: 'active',
          plan: plan.id,
          max_connections: plan.max_connections,
          subscription_ends_at: null, // Sem expiração para admin
        })
        .eq('id', profile.id);

      if (error) throw error;

      toast.success("Sua assinatura foi ativada com sucesso!");
      // Recarregar dados
      loadData();
      // Recarregar página para atualizar o perfil
      setTimeout(() => window.location.reload(), 1000);
    } catch (error: any) {
      toast.error(error.message || "Erro ao ativar assinatura");
    }
  }, [profile, plans, loadData]);

  // Filtrar usuários
  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users;
    const term = searchTerm.toLowerCase();
    return users.filter(user => 
      user.email?.toLowerCase().includes(term) ||
      user.name?.toLowerCase().includes(term)
    );
  }, [users, searchTerm]);

  // Bloquear/Desbloquear usuário
  const toggleBlockUser = useCallback(async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_blocked: !currentStatus })
        .eq('id', userId);

      if (error) throw error;

      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, is_blocked: !currentStatus } : u
      ));

      toast.success(`Usuário ${!currentStatus ? 'bloqueado' : 'desbloqueado'} com sucesso!`);
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar usuário");
    }
  }, []);

  // Excluir usuário completamente (do banco de dados e do Supabase Auth)
  const deleteUser = useCallback(async (userId: string, userName: string) => {
    // Confirmação
    const confirmed = window.confirm(
      `⚠️ ATENÇÃO: Exclusão Permanente\n\n` +
      `Tem certeza que deseja excluir o usuário "${userName}"?\n\n` +
      `Esta ação é IRREVERSÍVEL e irá:\n` +
      `• Excluir o usuário do banco de dados\n` +
      `• Excluir a conta de autenticação\n` +
      `• Excluir todos os dados relacionados (campanhas, conexões, etc.)\n\n` +
      `Esta ação NÃO pode ser desfeita!`
    );

    if (!confirmed) return;

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Sessão não encontrada');
      }

      // Chamar Edge Function para excluir completamente
      const response = await fetch(
        `${supabaseUrl}/functions/v1/delete-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ user_id: userId }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Erro ao excluir usuário');
      }

      // Remover da lista local
      setUsers(prev => prev.filter(u => u.id !== userId));

      // Se estava editando este usuário, cancelar edição
      if (editingUser === userId) {
        setEditingUser(null);
      }

      toast.success(`Usuário "${userName}" excluído permanentemente!`);
    } catch (error: any) {
      console.error('Erro ao excluir usuário:', error);
      toast.error(error.message || "Erro ao excluir usuário");
    }
  }, [editingUser]);

  // Ativar assinatura manualmente
  const activateSubscription = useCallback(async (userId: string, planId: string, expiresAt?: string) => {
    try {
      // Buscar perfil do usuário para obter email
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('email, name')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Erro ao buscar perfil:', profileError);
      }

      // Preparar dados de atualização baseado no plano
      const updateData: any = {
        subscription_status: 'active',
        plan: planId,
      };

      // Configurar limites baseado no plano
      if (planId === 'pro') {
        updateData.max_connections = 2;
        updateData.daily_disparos_limit = null; // Ilimitado
        updateData.subscription_ends_at = expiresAt || null;
      } else if (planId === 'super_pro') {
        updateData.max_connections = 4;
        updateData.daily_disparos_limit = null; // Ilimitado
        updateData.subscription_ends_at = expiresAt || null;
      } else if (planId === 'teste') {
        updateData.max_connections = 1;
        updateData.daily_disparos_limit = 20; // 20 disparos por dia
        updateData.daily_disparos_count = 0; // Resetar contador
        updateData.last_disparos_reset_date = new Date().toISOString().split('T')[0]; // Data atual
        // Definir expiração em 3 dias (ou usar a data fornecida)
        if (expiresAt) {
          updateData.trial_ends_at = expiresAt;
          updateData.subscription_ends_at = expiresAt;
        } else {
          const trialEndDate = new Date();
          trialEndDate.setDate(trialEndDate.getDate() + 3);
          updateData.trial_ends_at = trialEndDate.toISOString();
          updateData.subscription_ends_at = trialEndDate.toISOString();
        }
      } else {
        // Plano padrão (pro)
        updateData.max_connections = 2;
        updateData.daily_disparos_limit = null;
        updateData.subscription_ends_at = expiresAt || null;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId);

      if (error) throw error;

      // Atualizar estado local
      const maxConnections = planId === 'pro' ? 2 : planId === 'super_pro' ? 4 : planId === 'teste' ? 1 : 2;
      const trialEndsAt = planId === 'teste' && !expiresAt 
        ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
        : expiresAt || null;

      setUsers(prev => prev.map(u => 
        u.id === userId ? {
          ...u,
          subscription_status: 'active',
          plan: planId,
          max_connections: maxConnections,
          subscription_ends_at: trialEndsAt,
        } : u
      ));

      // Enviar email de confirmação
      if (userProfile?.email) {
        try {
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
          const { data: { session } } = await supabase.auth.getSession();
          
          console.log('📧 Tentando enviar email para:', userProfile.email);
          console.log('📧 URL da função:', `${supabaseUrl}/functions/v1/send-subscription-email`);
          
          const headers: HeadersInit = {
            'Content-Type': 'application/json',
          };
          
          // Adicionar token de autenticação se disponível
          if (session?.access_token) {
            headers['Authorization'] = `Bearer ${session.access_token}`;
            console.log('📧 Token de autenticação adicionado');
          } else {
            console.warn('⚠️ Token de autenticação não encontrado, tentando sem autenticação');
          }
          
          const response = await fetch(`${supabaseUrl}/functions/v1/send-subscription-email`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              user_id: userId,
              email: userProfile.email,
              name: userProfile.name || 'Usuário',
              plan: planId,
              expires_at: expiresAt || null,
            }),
          });

          console.log('📧 Status da resposta:', response.status);
          
          if (response.ok) {
            const result = await response.json();
            console.log('✅ Email de confirmação enviado:', result);
            toast.success("Email de confirmação enviado!");
          } else {
            const errorText = await response.text();
            console.error('❌ Erro ao enviar email:', errorText);
            console.error('❌ Status:', response.status);
            toast.warning("Assinatura ativada, mas email não foi enviado. Verifique os logs.");
          }
        } catch (emailError) {
          console.error('❌ Erro ao enviar email de confirmação:', emailError);
          toast.warning("Assinatura ativada, mas email não foi enviado. Verifique o console.");
          // Não falhar a ativação se o email falhar
        }
      } else {
        console.warn('⚠️ Email do usuário não encontrado, não foi possível enviar email');
      }

      toast.success("Assinatura ativada com sucesso!");
      setEditingUser(null);
    } catch (error: any) {
      toast.error(error.message || "Erro ao ativar assinatura");
    }
  }, [plans]);

  // Salvar plano
  const savePlan = useCallback(async (planId: string, planData: Partial<PlanConfig>) => {
    try {
      // Validar dados obrigatórios
      if (!planData.name || planData.name.trim() === '') {
        toast.error("O nome do plano é obrigatório");
        return;
      }
      if (planData.price === undefined || planData.price < 0) {
        toast.error("O preço deve ser um valor válido");
        return;
      }
      if (planData.max_connections === undefined || planData.max_connections < 1) {
        toast.error("O número de conexões deve ser pelo menos 1");
        return;
      }

      const updateData: any = {
        name: planData.name.trim(),
        description: planData.description?.trim() || null,
        price: planData.price,
        checkout_url: planData.checkout_url?.trim() || null,
        max_connections: planData.max_connections,
        active: planData.active !== undefined ? planData.active : true,
        features: Array.isArray(planData.features) && planData.features.length > 0 
          ? planData.features.filter((f: string) => f.trim().length > 0)
          : null,
        updated_by: profile?.id,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('plans_config')
        .update(updateData)
        .eq('id', planId);

      if (error) throw error;

      // Recarregar planos para garantir sincronização
      const { data: updatedPlans, error: reloadError } = await supabase
        .from('plans_config')
        .select('*')
        .order('display_order', { ascending: true });

      if (!reloadError && updatedPlans) {
        setPlans(updatedPlans);
      } else {
        // Fallback: atualizar estado local
        setPlans(prev => prev.map(p => 
          p.id === planId ? { ...p, ...updateData } : p
        ));
      }

      toast.success("Plano atualizado com sucesso!");
      setEditingPlan(null);
    } catch (error: any) {
      console.error('Erro ao atualizar plano:', error);
      toast.error(error.message || "Erro ao atualizar plano");
    }
  }, [profile?.id]);

  // Criar novo plano
  const createPlan = useCallback(async (planData: Partial<PlanConfig>) => {
    try {
      // Validar dados obrigatórios
      if (!planData.name || planData.name.trim() === '') {
        toast.error("O nome do plano é obrigatório");
        return;
      }
      if (planData.price === undefined || planData.price < 0) {
        toast.error("O preço deve ser um valor válido");
        return;
      }
      if (planData.max_connections === undefined || planData.max_connections < 1) {
        toast.error("O número de conexões deve ser pelo menos 1");
        return;
      }

      // Gerar ID único baseado no nome (lowercase, sem espaços, com underscore)
      const planId = planData.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .replace(/[^a-z0-9]/g, '_') // Substitui caracteres especiais por underscore
        .replace(/_+/g, '_') // Remove underscores duplicados
        .replace(/^_|_$/g, ''); // Remove underscores no início/fim

      // Verificar se o ID já existe
      const existingPlan = plans.find(p => p.id === planId);
      if (existingPlan) {
        toast.error("Já existe um plano com esse nome. Escolha outro nome.");
        return;
      }

      const insertData: any = {
        id: planId,
        name: planData.name.trim(),
        description: planData.description?.trim() || null,
        price: planData.price,
        checkout_url: planData.checkout_url?.trim() || null,
        max_connections: planData.max_connections,
        active: planData.active !== undefined ? planData.active : true,
        features: Array.isArray(planData.features) && planData.features.length > 0 
          ? planData.features.filter((f: string) => f.trim().length > 0)
          : null,
        display_order: plans.length + 1, // Adicionar no final
        updated_by: profile?.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('plans_config')
        .insert(insertData);

      if (error) throw error;

      // Recarregar planos
      const { data: updatedPlans, error: reloadError } = await supabase
        .from('plans_config')
        .select('*')
        .order('display_order', { ascending: true });

      if (!reloadError && updatedPlans) {
        setPlans(updatedPlans);
      }

      toast.success("Plano criado com sucesso!");
      setCreatingPlan(false);
    } catch (error: any) {
      console.error('Erro ao criar plano:', error);
      toast.error(error.message || "Erro ao criar plano");
    }
  }, [profile?.id, plans]);

  // Salvar configurações
  const saveSettings = useCallback(async () => {
    try {
      const updates = [
        { key: 'support_email', value: settings.support_email },
        { key: 'support_phone', value: settings.support_phone },
        { key: 'support_whatsapp', value: settings.support_whatsapp },
        { key: 'company_name', value: settings.company_name },
        { key: 'company_url', value: settings.company_url },
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from('system_settings')
          .upsert({
            key: update.key,
            value: update.value,
            updated_by: profile?.id,
          }, {
            onConflict: 'key'
          });

        if (error) throw error;
      }

      toast.success("Configurações salvas com sucesso!");
      setEditingSettings(false);
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar configurações");
    }
  }, [settings, profile]);

  if (!isAdmin) {
    return null;
  }

  // Verificar se admin tem assinatura ativa
  const adminHasSubscription = profile?.subscription_status === 'active';

  return (
    <div className="min-h-screen bg-[hsl(var(--bg-primary))] pb-24">
      <PageHeader title="Painel Administrativo" showBack />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {/* Aviso se admin não tem assinatura ativa */}
        {!adminHasSubscription && (
          <GlassCard className="border-warning/50 bg-warning/10 mb-4">
            <div className="flex items-start gap-3">
              <Crown className="w-6 h-6 text-warning flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-warning mb-1">Ativar Sua Assinatura</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Como administrador, você pode ativar sua própria assinatura para ter acesso completo ao sistema.
                </p>
                <Button
                  onClick={activateOwnSubscription}
                  className="bg-gradient-to-r from-accent-purple to-accent-cyan"
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Ativar Minha Assinatura
                </Button>
              </div>
            </div>
          </GlassCard>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="users" className="text-xs sm:text-sm">
              <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Usuários</span>
              <span className="sm:hidden">Users</span>
            </TabsTrigger>
            <TabsTrigger value="resellers" className="text-xs sm:text-sm">
              <UserPlus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Vendedores</span>
              <span className="sm:hidden">Vend</span>
            </TabsTrigger>
            <TabsTrigger value="plans" className="text-xs sm:text-sm">
              <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Planos</span>
              <span className="sm:hidden">Planos</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-xs sm:text-sm">
              <Settings className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Configurações</span>
              <span className="sm:hidden">Config</span>
            </TabsTrigger>
          </TabsList>

          {/* TAB: USUÁRIOS */}
          <TabsContent value="users" className="space-y-4">
            <GlassCard>
              <div className="flex items-center gap-4 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar usuários..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button onClick={loadData} variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Atualizar
                </Button>
              </div>

              {loading ? (
                <SkeletonList count={5} />
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {filteredUsers.map((user) => (
                    <GlassCard key={user.id} className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold truncate">{user.name || "Sem nome"}</h3>
                            {user.is_blocked && (
                              <Badge variant="destructive">Bloqueado</Badge>
                            )}
                            {user.subscription_status === 'active' && (
                              <Badge variant="default">Ativo</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{user.email}</p>
                          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                            <span>Plano: {user.plan || "Nenhum"}</span>
                            <span>•</span>
                            <span>Status: {user.subscription_status || "Nenhum"}</span>
                            <span>•</span>
                            <span>Conexões: {user.max_connections}</span>
                            {user.plan === 'teste' && (
                              <>
                                <span>•</span>
                                <span className="text-warning font-semibold">
                                  ⚠️ Plano Teste (3 dias)
                                </span>
                              </>
                            )}
                            {user.subscription_ends_at && (
                              <>
                                <span>•</span>
                                <span>
                                  {user.plan === 'teste' ? 'Expira' : 'Expira'}: {new Date(user.subscription_ends_at).toLocaleDateString('pt-BR')}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingUser(editingUser === user.id ? null : user.id)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant={user.is_blocked ? "default" : "destructive"}
                            size="sm"
                            onClick={() => toggleBlockUser(user.id, user.is_blocked)}
                          >
                            {user.is_blocked ? <CheckCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteUser(user.id, user.name || user.email || 'Usuário')}
                            title="Excluir usuário permanentemente"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {editingUser === user.id && (
                        <div className="mt-4 pt-4 border-t border-border space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <Label>Plano</Label>
                              <select
                                className="w-full h-10 px-3 rounded-lg bg-[hsl(var(--bg-input))] border border-border"
                                value={user.plan || ""}
                                onChange={(e) => {
                                  const planId = e.target.value;
                                  if (planId) {
                                    activateSubscription(user.id, planId);
                                  }
                                }}
                              >
                                <option value="">Selecione um plano</option>
                                <option value="teste">Plano Teste (R$ 12,00 - 3 dias)</option>
                                <option value="pro">PRO (R$ 64,90/mês)</option>
                                <option value="super_pro">SUPER PRO (R$ 99,90/mês)</option>
                                {plans.map(plan => (
                                  <option key={plan.id} value={plan.id}>{plan.name}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <Label>Data de Expiração</Label>
                              <Input
                                type="datetime-local"
                                value={user.subscription_ends_at ? new Date(user.subscription_ends_at).toISOString().slice(0, 16) : ""}
                                onChange={(e) => {
                                  const newDate = e.target.value ? new Date(e.target.value).toISOString() : null;
                                  if (newDate && user.plan) {
                                    activateSubscription(user.id, user.plan, newDate);
                                  }
                                }}
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => {
                                if (user.plan) {
                                  activateSubscription(user.id, user.plan, user.subscription_ends_at || undefined);
                                }
                              }}
                            >
                              <Save className="w-4 h-4 mr-2" />
                              Salvar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingUser(null)}
                            >
                              <X className="w-4 h-4 mr-2" />
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      )}
                    </GlassCard>
                  ))}
                </div>
              )}
            </GlassCard>
          </TabsContent>

          {/* TAB: VENDEDORES */}
          <TabsContent value="resellers" className="space-y-4">
            <ResellersTab />
          </TabsContent>

          {/* TAB: PLANOS */}
          <TabsContent value="plans" className="space-y-4">
            <div className="flex justify-end mb-4">
              <GradientButton
                onClick={() => setCreatingPlan(true)}
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Criar Novo Plano
              </GradientButton>
            </div>

            {creatingPlan && (
              <GlassCard className="p-6 border-accent-purple/30">
                <PlanEditor
                  plan={{
                    id: '',
                    name: '',
                    description: '',
                    price: 0,
                    checkout_url: '',
                    max_connections: 1,
                    features: [],
                    active: true,
                  }}
                  onSave={(data) => createPlan(data)}
                  onCancel={() => setCreatingPlan(false)}
                  isNew={true}
                />
              </GlassCard>
            )}

            {loading ? (
              <SkeletonList count={2} />
            ) : (
              plans.map((plan) => (
                <GlassCard key={plan.id} className="p-6">
                  {editingPlan === plan.id ? (
                    <PlanEditor
                      plan={plan}
                      onSave={(data) => savePlan(plan.id, data)}
                      onCancel={() => setEditingPlan(null)}
                    />
                  ) : (
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-xl font-bold">{plan.name}</h3>
                          {!plan.active && <Badge variant="secondary">Inativo</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Preço:</span>
                            <span className="ml-2 font-semibold">R$ {plan.price.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Conexões:</span>
                            <span className="ml-2 font-semibold">{plan.max_connections}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Checkout URL:</span>
                            <p className="text-xs break-all mt-1">{plan.checkout_url || "Não configurado"}</p>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingPlan(plan.id)}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Editar
                      </Button>
                    </div>
                  )}
                </GlassCard>
              ))
            )}
          </TabsContent>

          {/* TAB: CONFIGURAÇÕES */}
          <TabsContent value="settings" className="space-y-4">
            <GlassCard className="p-6">
              <div className="space-y-4">
                <div>
                  <Label>Email de Suporte</Label>
                  <Input
                    value={settings.support_email}
                    onChange={(e) => setSettings({ ...settings, support_email: e.target.value })}
                    placeholder="suporte@exemplo.com"
                    disabled={!editingSettings}
                  />
                </div>
                <div>
                  <Label>Telefone de Suporte</Label>
                  <Input
                    value={settings.support_phone}
                    onChange={(e) => setSettings({ ...settings, support_phone: e.target.value })}
                    placeholder="(00) 00000-0000"
                    disabled={!editingSettings}
                  />
                </div>
                <div>
                  <Label>WhatsApp de Suporte</Label>
                  <Input
                    value={settings.support_whatsapp}
                    onChange={(e) => setSettings({ ...settings, support_whatsapp: e.target.value })}
                    placeholder="5511999999999"
                    disabled={!editingSettings}
                  />
                </div>
                <div>
                  <Label>Nome da Empresa</Label>
                  <Input
                    value={settings.company_name}
                    onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                    placeholder="Connect"
                    disabled={!editingSettings}
                  />
                </div>
                <div>
                  <Label>URL da Empresa</Label>
                  <Input
                    value={settings.company_url}
                    onChange={(e) => setSettings({ ...settings, company_url: e.target.value })}
                    placeholder="https://connect.inoovaweb.com.br"
                    disabled={!editingSettings}
                  />
                </div>
                <div className="flex gap-2">
                  {editingSettings ? (
                    <>
                      <Button onClick={saveSettings}>
                        <Save className="w-4 h-4 mr-2" />
                        Salvar
                      </Button>
                      <Button variant="outline" onClick={() => setEditingSettings(false)}>
                        <X className="w-4 h-4 mr-2" />
                        Cancelar
                      </Button>
                    </>
                  ) : (
                    <Button onClick={() => setEditingSettings(true)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Editar Configurações
                    </Button>
                  )}
                </div>
              </div>
            </GlassCard>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
});

Admin.displayName = 'Admin';

// Componente para gerenciar Vendedores
const ResellersTab = memo(() => {
  const { resellers, resellerStats, isLoading, statsLoading, createReseller, updateReseller, deleteReseller, getResellerUsers } = useResellers();
  const [creatingReseller, setCreatingReseller] = useState(false);
  const [editingReseller, setEditingReseller] = useState<string | null>(null);
  const [viewingUsers, setViewingUsers] = useState<string | null>(null);
  const [resellerUsers, setResellerUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    commission_percentage: 10,
    referral_code: '',
    active: true,
    notes: '',
  });

  const handleCreateReseller = useCallback(async () => {
    try {
      if (!formData.name || !formData.email) {
        toast.error('Nome e email são obrigatórios');
        return;
      }

      await createReseller.mutateAsync({
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        commission_percentage: formData.commission_percentage,
        referral_code: formData.referral_code || '',
        referral_link: null,
        active: formData.active,
        notes: formData.notes || null,
      });

      toast.success('Vendedor cadastrado com sucesso!');
      setCreatingReseller(false);
      setFormData({
        name: '',
        email: '',
        phone: '',
        commission_percentage: 10,
        referral_code: '',
        active: true,
        notes: '',
      });
    } catch (error: any) {
      toast.error(error.message || 'Erro ao cadastrar vendedor');
    }
  }, [formData, createReseller]);

  const handleUpdateReseller = useCallback(async (id: string) => {
    try {
      await updateReseller.mutateAsync({
        id,
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        commission_percentage: formData.commission_percentage,
        active: formData.active,
        notes: formData.notes || null,
      });

      toast.success('Vendedor atualizado com sucesso!');
      setEditingReseller(null);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar vendedor');
    }
  }, [formData, updateReseller]);

  const handleDeleteReseller = useCallback(async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar este vendedor?')) return;

    try {
      await deleteReseller.mutateAsync(id);
      toast.success('Vendedor deletado com sucesso!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao deletar vendedor');
    }
  }, [deleteReseller]);

  const handleViewUsers = useCallback(async (resellerId: string) => {
    setViewingUsers(resellerId);
    setLoadingUsers(true);
    try {
      const users = await getResellerUsers(resellerId);
      setResellerUsers(users);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao carregar usuários');
    } finally {
      setLoadingUsers(false);
    }
  }, [getResellerUsers]);

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado para a área de transferência!');
  }, []);

  if (isLoading || statsLoading) {
    return <SkeletonList count={3} />;
  }

  return (
    <div className="space-y-4">
      {/* Botão para criar novo vendedor */}
      <div className="flex justify-end mb-4">
        <GradientButton
          onClick={() => setCreatingReseller(true)}
          size="sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Cadastrar Vendedor
        </GradientButton>
      </div>

      {/* Formulário de criação */}
      {creatingReseller && (
        <GlassCard className="p-6 border-accent-purple/30">
          <h3 className="text-lg font-bold mb-4">Cadastrar Novo Vendedor</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Nome *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nome do vendedor"
                />
              </div>
              <div>
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div>
                <Label>Comissão (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.commission_percentage}
                  onChange={(e) => setFormData({ ...formData, commission_percentage: parseFloat(e.target.value) || 0 })}
                  placeholder="10"
                />
              </div>
              <div>
                <Label>Código de Referência (opcional)</Label>
                <Input
                  value={formData.referral_code}
                  onChange={(e) => setFormData({ ...formData, referral_code: e.target.value.toUpperCase() })}
                  placeholder="Deixe vazio para gerar automaticamente"
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="active"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label htmlFor="active" className="cursor-pointer">Vendedor Ativo</Label>
              </div>
            </div>
            <div>
              <Label>Notas</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Observações sobre o vendedor..."
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreateReseller} disabled={createReseller.isPending}>
                {createReseller.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
              <Button variant="outline" onClick={() => {
                setCreatingReseller(false);
                setFormData({
                  name: '',
                  email: '',
                  phone: '',
                  commission_percentage: 10,
                  referral_code: '',
                  active: true,
                  notes: '',
                });
              }}>
                Cancelar
              </Button>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Lista de Vendedores com Estatísticas */}
      <div className="space-y-4">
        {resellerStats.length === 0 ? (
          <GlassCard>
            <p className="text-center text-muted-foreground py-8">
              Nenhum vendedor cadastrado ainda
            </p>
          </GlassCard>
        ) : (
          resellerStats.map((stat) => {
            const reseller = resellers.find(r => r.id === stat.id);
            const isEditing = editingReseller === stat.id;
            
            return (
              <GlassCard key={stat.id} className="p-6">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-xl font-bold">{stat.name}</h3>
                        {stat.active ? (
                          <Badge className="bg-success/20 text-success">Ativo</Badge>
                        ) : (
                          <Badge variant="secondary">Inativo</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{stat.email}</p>
                      {reseller?.phone && (
                        <p className="text-sm text-muted-foreground">📞 {reseller.phone}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (isEditing) {
                            setEditingReseller(null);
                            setFormData({
                              name: '',
                              email: '',
                              phone: '',
                              commission_percentage: 10,
                              referral_code: '',
                              active: true,
                              notes: '',
                            });
                          } else {
                            setEditingReseller(stat.id);
                            setFormData({
                              name: reseller?.name || '',
                              email: reseller?.email || '',
                              phone: reseller?.phone || '',
                              commission_percentage: reseller?.commission_percentage || 10,
                              referral_code: reseller?.referral_code || '',
                              active: reseller?.active ?? true,
                              notes: reseller?.notes || '',
                            });
                          }
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteReseller(stat.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Estatísticas */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-accent-purple/10 rounded-lg p-3 border border-accent-purple/20">
                      <p className="text-xs text-muted-foreground mb-1">Total de Usuários</p>
                      <p className="text-2xl font-bold text-accent-purple">{stat.total_users}</p>
                    </div>
                    <div className="bg-success/10 rounded-lg p-3 border border-success/20">
                      <p className="text-xs text-muted-foreground mb-1">Usuários Ativos</p>
                      <p className="text-2xl font-bold text-success">{stat.active_users}</p>
                    </div>
                    <div className="bg-accent-cyan/10 rounded-lg p-3 border border-accent-cyan/20">
                      <p className="text-xs text-muted-foreground mb-1">Receita Total</p>
                      <p className="text-2xl font-bold text-accent-cyan">
                        R$ {stat.total_revenue.toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-warning/10 rounded-lg p-3 border border-warning/20">
                      <p className="text-xs text-muted-foreground mb-1">Comissão</p>
                      <p className="text-2xl font-bold text-warning">
                        {stat.commission_percentage}%
                      </p>
                    </div>
                  </div>

                  {/* Detalhes dos Planos */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">PRO:</span>
                      <span className="ml-2 font-semibold">{stat.pro_users}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">SUPER PRO:</span>
                      <span className="ml-2 font-semibold">{stat.super_pro_users}</span>
                    </div>
                  </div>

                  {/* Link de Referência */}
                  <div className="bg-accent-purple/5 rounded-lg p-3 border border-accent-purple/20">
                    <Label className="text-xs text-muted-foreground mb-1">Link de Referência</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={reseller?.referral_link || `${window.location.origin}/register?ref=${stat.referral_code}`}
                        readOnly
                        className="flex-1 text-xs"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(reseller?.referral_link || `${window.location.origin}/register?ref=${stat.referral_code}`)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Código: <code className="bg-white/10 px-1.5 py-0.5 rounded">{stat.referral_code}</code>
                    </p>
                  </div>

                  {/* Formulário de Edição */}
                  {isEditing && (
                    <div className="pt-4 border-t border-border space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label>Nome *</Label>
                          <Input
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Email *</Label>
                          <Input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Telefone</Label>
                          <Input
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Comissão (%)</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={formData.commission_percentage}
                            onChange={(e) => setFormData({ ...formData, commission_percentage: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`active-${stat.id}`}
                            checked={formData.active}
                            onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                            className="w-4 h-4"
                          />
                          <Label htmlFor={`active-${stat.id}`} className="cursor-pointer">Ativo</Label>
                        </div>
                      </div>
                      <div>
                        <Label>Notas</Label>
                        <Textarea
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          rows={3}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => handleUpdateReseller(stat.id)} disabled={updateReseller.isPending}>
                          {updateReseller.isPending ? 'Salvando...' : 'Salvar'}
                        </Button>
                        <Button variant="outline" onClick={() => {
                          setEditingReseller(null);
                          setFormData({
                            name: '',
                            email: '',
                            phone: '',
                            commission_percentage: 10,
                            referral_code: '',
                            active: true,
                            notes: '',
                          });
                        }}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Botão para ver usuários */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (viewingUsers === stat.id) {
                          setViewingUsers(null);
                        } else {
                          handleViewUsers(stat.id);
                        }
                      }}
                    >
                      <Users className="w-4 h-4 mr-2" />
                      {viewingUsers === stat.id ? 'Ocultar' : 'Ver'} Usuários ({stat.total_users})
                    </Button>
                  </div>

                  {/* Lista de Usuários */}
                  {viewingUsers === stat.id && (
                    <div className="pt-4 border-t border-border">
                      {loadingUsers ? (
                        <SkeletonList count={3} />
                      ) : resellerUsers.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Nenhum usuário encontrado
                        </p>
                      ) : (
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {resellerUsers.map((user) => (
                            <div key={user.id} className="flex items-center justify-between p-2 bg-bg-input rounded-lg">
                              <div>
                                <p className="font-semibold text-sm">{user.name || 'Sem nome'}</p>
                                <p className="text-xs text-muted-foreground">{user.email}</p>
                                <div className="flex gap-2 mt-1">
                                  <Badge variant={user.subscription_status === 'active' ? 'default' : 'secondary'}>
                                    {user.plan || 'Sem plano'}
                                  </Badge>
                                  {user.subscription_status === 'active' && (
                                    <Badge className="bg-success/20 text-success">Ativo</Badge>
                                  )}
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {new Date(user.created_at).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </GlassCard>
            );
          })
        )}
      </div>
    </div>
  );
});
ResellersTab.displayName = 'ResellersTab';

// Componente para editar/criar plano
const PlanEditor = memo(({ plan, onSave, onCancel, isNew = false }: { plan: PlanConfig; onSave: (data: Partial<PlanConfig>) => void; onCancel: () => void; isNew?: boolean }) => {
  const [formData, setFormData] = useState({
    name: plan.name,
    description: plan.description || "",
    price: plan.price,
    checkout_url: plan.checkout_url || "",
    max_connections: plan.max_connections,
    active: plan.active,
    features: Array.isArray(plan.features) ? [...plan.features] : (plan.description ? [plan.description] : []),
  });
  
  const [newFeature, setNewFeature] = useState("");

  // Gerar preview do ID quando for novo plano
  const previewId = formData.name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '') || 'gerado_automaticamente';

  return (
    <div className="space-y-4">
      {isNew && (
        <div className="p-3 rounded-lg bg-accent-purple/10 border border-accent-purple/30 mb-4">
          <p className="text-sm text-accent-purple font-semibold">
            Criando novo plano
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            O ID do plano será gerado automaticamente baseado no nome
          </p>
        </div>
      )}
      <div>
        <Label>Nome do Plano *</Label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Ex: PRO, SUPER PRO, etc."
        />
        <p className="text-xs text-muted-foreground mt-1">
          Nome que será exibido na página de planos
          {isNew && formData.name && (
            <span className="text-accent-purple block mt-1">
              ID gerado: <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs">{previewId}</code>
            </span>
          )}
        </p>
      </div>
      <div>
        <Label>Descrição do Plano *</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
          placeholder="Descreva os benefícios e recursos do plano..."
        />
        <p className="text-xs text-muted-foreground mt-1">Descrição que será exibida na página de planos</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Preço (R$) *</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={formData.price}
            onChange={(e) => {
              const value = e.target.value;
              setFormData({ ...formData, price: value ? parseFloat(value) : 0 });
            }}
            placeholder="0.00"
          />
          <p className="text-xs text-muted-foreground mt-1">Valor mensal do plano</p>
        </div>
        <div>
          <Label>Máximo de Conexões *</Label>
          <Input
            type="number"
            min="1"
            value={formData.max_connections}
            onChange={(e) => {
              const value = e.target.value;
              setFormData({ ...formData, max_connections: value ? parseInt(value) : 1 });
            }}
            placeholder="1"
          />
          <p className="text-xs text-muted-foreground mt-1">Número máximo de conexões WhatsApp</p>
        </div>
      </div>
      <div>
        <Label>URL de Checkout (Cakto) *</Label>
        <Input
          value={formData.checkout_url}
          onChange={(e) => setFormData({ ...formData, checkout_url: e.target.value })}
          placeholder="https://pay.cakto.com.br/..."
        />
        <p className="text-xs text-muted-foreground mt-1">Link de pagamento gerado no Cakto</p>
      </div>
      <div>
        <Label>Features (Benefícios) *</Label>
        <div className="space-y-2 mt-2">
          {formData.features.map((feature, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={feature}
                onChange={(e) => {
                  const newFeatures = [...formData.features];
                  newFeatures[index] = e.target.value;
                  setFormData({ ...formData, features: newFeatures });
                }}
                placeholder="Ex: 2 conexões WhatsApp"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const newFeatures = formData.features.filter((_, i) => i !== index);
                  setFormData({ ...formData, features: newFeatures });
                }}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <Input
              value={newFeature}
              onChange={(e) => setNewFeature(e.target.value)}
              placeholder="Adicionar nova feature..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newFeature.trim()) {
                  e.preventDefault();
                  setFormData({ ...formData, features: [...formData.features, newFeature.trim()] });
                  setNewFeature("");
                }
              }}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (newFeature.trim()) {
                  setFormData({ ...formData, features: [...formData.features, newFeature.trim()] });
                  setNewFeature("");
                }
              }}
              disabled={!newFeature.trim()}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Lista de benefícios que aparecerão na página de planos (uma por linha)
        </p>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id={`active-${plan.id}`}
          checked={formData.active}
          onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
          className="w-4 h-4"
        />
        <Label htmlFor={`active-${plan.id}`} className="cursor-pointer">Plano Ativo</Label>
      </div>
      <div className="flex gap-2">
        <Button 
          onClick={() => onSave(formData)}
          disabled={!formData.name.trim() || formData.price <= 0 || formData.max_connections < 1 || formData.features.length === 0}
        >
          <Save className="w-4 h-4 mr-2" />
          {isNew ? 'Criar Plano' : 'Salvar Alterações'}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          <X className="w-4 h-4 mr-2" />
          Cancelar
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        * Campos obrigatórios
      </p>
    </div>
  );
});

PlanEditor.displayName = 'PlanEditor';

export default Admin;

