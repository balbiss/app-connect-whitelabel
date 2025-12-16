import { useState, useMemo, useCallback, memo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { GlassCard } from "@/components/GlassCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ChevronRight, LogOut, Crown, Shield } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { useConnections } from "@/hooks/useConnections";
import { useConnectionLimit } from "@/hooks/useConnectionLimit";
import { useSettings } from "@/hooks/useSettings";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { sounds, setSoundsEnabled } from "@/lib/sounds";
import { supabase } from "@/lib/supabase";

const Settings = memo(() => {
  const navigate = useNavigate();
  const { profile, signOut, user } = useAuth();
  const { isAdmin } = useAdmin();
  const { connections } = useConnections();
  const { limitStatus } = useConnectionLimit();
  const { settings, updateSetting, requestNotificationPermission } = useSettings();
  const { isSupported: pushSupported, isSubscribed: pushSubscribed, isLoading: pushLoading, subscribe: subscribePush, unsubscribe: unsubscribePush } = usePushNotifications();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editingName, setEditingName] = useState("");
  const [editingPhone, setEditingPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  
  // Detectar modo desktop
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;

  const handleLogout = useCallback(async () => {
    try {
      sounds.delete();
      await signOut();
      toast.success("Saindo da conta...");
    } catch (error) {
      toast.error("Erro ao sair");
    }
  }, [signOut]);

  const handleToggleSetting = useCallback(async (key: keyof typeof settings, value: boolean) => {
    sounds.click();
    const success = await updateSetting(key, value);
    if (success) {
      if (key === 'sounds') {
        setSoundsEnabled(value);
      }
      if (key === 'notifications' && value) {
        requestNotificationPermission();
      }
    }
  }, [updateSetting, requestNotificationPermission]);

  const handleChangePassword = useCallback(async () => {
    if (!newPassword || !confirmPassword) {
      toast.error("Preencha todos os campos");
      sounds.error();
      return;
    }

    if (newPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      sounds.error();
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      sounds.error();
      return;
    }

    setChangingPassword(true);
    try {
      // Verificar senha atual (se não for OAuth)
      if (user && !user.app_metadata?.provider && currentPassword) {
        // Tentar fazer login com a senha atual para verificar
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: user.email!,
          password: currentPassword,
        });

        if (signInError) {
          toast.error("Senha atual incorreta");
          sounds.error();
          setChangingPassword(false);
          return;
        }
      }

      // Atualizar senha
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw error;
      }

      toast.success("Senha alterada com sucesso!");
      sounds.success();
      setShowChangePassword(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error("Erro ao alterar senha:", error);
      toast.error(error.message || "Erro ao alterar senha");
      sounds.error();
    } finally {
      setChangingPassword(false);
    }
  }, [user, newPassword, confirmPassword, currentPassword]);

  // Função para enviar notificação de teste
  const sendTestNotification = useCallback(() => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Connect', {
        body: 'Esta é uma notificação de teste!',
        icon: 'https://i.postimg.cc/zfK0BqB7/Gemini-Generated-Image-urlh0ourlh0ourlh-1.png',
      });
      sounds.notification();
      toast.success("Notificação de teste enviada!");
    } else {
      toast.warning("Permissão de notificações não concedida");
    }
  }, []);

  const getPlanName = useCallback((plan: string) => {
    switch (plan) {
      case 'pro': return 'PRO';
      case 'super_pro': return 'SUPER PRO';
      default: return 'PRO';
    }
  }, []);

  const getSubscriptionStatusBadge = useCallback((status: string | null) => {
    switch (status) {
      case 'active': return <Badge className="bg-success">Ativa</Badge>;
      case 'past_due': return <Badge className="bg-warning">Atrasada</Badge>;
      case 'canceled': return <Badge className="bg-destructive">Cancelada</Badge>;
      case 'trialing': return <Badge className="bg-accent-cyan">Teste</Badge>;
      default: return <Badge variant="secondary">N/A</Badge>;
    }
  }, []);

  const handleEditProfile = useCallback(() => {
    setEditingName(profile?.name || "");
    setEditingPhone(profile?.phone || "");
    setShowEditProfile(true);
    sounds.click();
  }, [profile]);

  const handleSaveProfile = useCallback(async () => {
    if (!profile?.id) return;
    
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: editingName.trim() || null,
          phone: editingPhone.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

      if (error) throw error;

      toast.success("Perfil atualizado com sucesso!");
      sounds.success();
      setShowEditProfile(false);
      // Limpar cache local
      if (user?.id) {
        localStorage.removeItem(`profile_${user.id}`);
        // Recarregar página após um pequeno delay
        setTimeout(() => window.location.reload(), 500);
      }
    } catch (error: any) {
      console.error("Erro ao atualizar perfil:", error);
      toast.error(error.message || "Erro ao atualizar perfil");
      sounds.error();
    } finally {
      setSavingProfile(false);
    }
  }, [profile, editingName, editingPhone, user]);

  const handleOpenChangePassword = useCallback(() => {
    if (user?.app_metadata?.provider === 'google') {
      toast.info("Usuários do Google não precisam de senha");
      return;
    }
    setShowChangePassword(true);
    sounds.click();
  }, [user]);

  const handleNavigateToAdmin = useCallback(() => {
    navigate("/admin");
    sounds.click();
  }, [navigate]);

  const handleNavigateToPlans = useCallback(() => {
    // OCULTO TEMPORARIAMENTE
    toast.info("Planos temporariamente indisponíveis. Entre em contato com o suporte.");
    // navigate("/plans");
  }, []);

  // Calcular progresso de conexões (memoizado)
  const connectionProgress = useMemo(() => {
    if (!limitStatus) return 0;
    return (limitStatus.currentConnections / limitStatus.maxConnections) * 100;
  }, [limitStatus]);

  return (
    <div className="min-h-screen bg-[hsl(var(--bg-primary))] pb-24">
      <PageHeader title="Configurações" showBack />

      <div className={`${isDesktop ? 'max-w-6xl' : 'max-w-lg'} mx-auto px-4 sm:px-6 ${isDesktop ? 'space-y-3' : 'space-y-3 sm:space-y-4'} py-3`}>
        {/* Perfil */}
        <GlassCard className={isDesktop ? 'p-3' : ''}>
          <div className="flex items-center gap-3">
            <div className={`${isDesktop ? 'w-14 h-14' : 'w-20 h-20'} rounded-xl overflow-hidden animate-float flex-shrink-0`}>
              <img 
                src="https://i.postimg.cc/zfK0BqB7/Gemini-Generated-Image-urlh0ourlh0ourlh-1.png" 
                alt="VisitaIA Logo" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className={`font-semibold ${isDesktop ? 'text-sm' : 'text-lg'} truncate`}>{profile?.name || 'Usuário'}</h3>
              <p className={`${isDesktop ? 'text-xs' : 'text-sm'} text-muted-foreground truncate`}>{profile?.email || ''}</p>
            </div>
          </div>
          <div className="flex justify-center mt-3">
            <Button 
              variant="outline" 
              className={`${isDesktop ? 'w-auto px-6 h-8 text-xs' : 'w-full mt-4'} hover:opacity-90 transition-opacity active:scale-[0.98]`}
              onClick={handleEditProfile}
            >
              Editar Perfil
            </Button>
          </div>
        </GlassCard>

        {/* Grid de Cards - Plano Atual, Preferências, Segurança */}
        {isDesktop ? (
          <div className="grid grid-cols-3 gap-3">
            {/* Plano Atual */}
            <GlassCard className="p-3">
          {profile?.subscription_status === 'active' ? (
            <>
              <div className={`flex items-center justify-between ${isDesktop ? 'mb-2' : 'mb-3'}`}>
                <h3 className={`font-semibold ${isDesktop ? 'text-sm' : ''}`}>Plano Atual</h3>
                <Badge className={`bg-gradient-to-r from-accent-purple to-accent-cyan ${isDesktop ? 'text-[10px] px-2 py-0.5' : ''}`}>
                  <Crown className={`${isDesktop ? 'w-2.5 h-2.5 mr-0.5' : 'w-3 h-3 mr-1'}`} />
                  {getPlanName(profile?.plan || 'pro')}
                </Badge>
              </div>

              <div className={isDesktop ? 'mb-2' : 'mb-3'}>
                <div className={`flex items-center justify-between ${isDesktop ? 'text-xs' : 'text-sm'}`}>
                  <span className="text-muted-foreground">Status da Assinatura</span>
                  {getSubscriptionStatusBadge(profile.subscription_status)}
                </div>
                {profile.subscription_ends_at && (
                  <p className={`${isDesktop ? 'text-[10px]' : 'text-xs'} text-muted-foreground mt-1`}>
                    Expira em: {new Date(profile.subscription_ends_at).toLocaleDateString('pt-BR')}
                  </p>
                )}
              </div>

              <div className={isDesktop ? 'space-y-2' : 'space-y-3'}>
                <div>
                  <div className={`flex justify-between ${isDesktop ? 'text-xs mb-0.5' : 'text-sm mb-1'}`}>
                    <span className="text-muted-foreground">Instâncias</span>
                    <span className="font-medium">
                      {limitStatus?.currentConnections || connections.length} / {limitStatus?.maxConnections || profile?.max_connections || 2}
                    </span>
                  </div>
                  <Progress value={connectionProgress} className={isDesktop ? 'h-1.5' : ''} />
                </div>
              </div>

              {profile?.plan === 'pro' ? (
                <div className={`flex justify-center ${isDesktop ? 'mt-3' : 'mt-4'}`}>
                  <Button 
                    className={`${isDesktop ? 'w-auto px-6 h-8 text-xs' : 'w-full'} bg-gradient-to-r from-accent-purple to-accent-cyan hover:opacity-90 transition-opacity active:scale-[0.98]`}
                    onClick={handleNavigateToPlans}
                  >
                    Fazer Upgrade para SUPER PRO ⬆️
                  </Button>
                </div>
              ) : (
                <div className={`flex justify-center ${isDesktop ? 'mt-3' : 'mt-4'}`}>
                  <Button 
                    className={`${isDesktop ? 'w-auto px-6 h-8 text-xs' : 'w-full'} hover:opacity-90 transition-opacity active:scale-[0.98]`}
                    variant="outline"
                    onClick={handleNavigateToPlans}
                  >
                    Gerenciar Plano
                  </Button>
                </div>
              )}
            </>
          ) : (
            <>
              <div className={`flex items-center justify-between ${isDesktop ? 'mb-2' : 'mb-3'}`}>
                <h3 className={`font-semibold ${isDesktop ? 'text-sm' : ''}`}>Plano Atual</h3>
                <Badge variant="secondary" className={isDesktop ? 'text-[10px] px-2 py-0.5' : ''}>Sem Assinatura</Badge>
              </div>

              {profile?.subscription_status && (
                <div className={isDesktop ? 'mb-2' : 'mb-3'}>
                  <div className={`flex items-center justify-between ${isDesktop ? 'text-xs' : 'text-sm'}`}>
                    <span className="text-muted-foreground">Status da Assinatura</span>
                    {getSubscriptionStatusBadge(profile.subscription_status)}
                  </div>
                  {profile.subscription_ends_at && (
                    <p className={`${isDesktop ? 'text-[10px]' : 'text-xs'} text-muted-foreground mt-1`}>
                      Expirou em: {new Date(profile.subscription_ends_at).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>
              )}

              <div className={isDesktop ? 'space-y-2' : 'space-y-3'}>
                <div>
                  <div className={`flex justify-between ${isDesktop ? 'text-xs mb-0.5' : 'text-sm mb-1'}`}>
                    <span className="text-muted-foreground">Instâncias</span>
                    <span className="font-medium">
                      {limitStatus?.currentConnections || connections.length} / {limitStatus?.maxConnections || profile?.max_connections || 0}
                    </span>
                  </div>
                  <Progress value={connectionProgress} className={isDesktop ? 'h-1.5' : ''} />
                </div>
              </div>

              <div className={`${isDesktop ? 'mt-3 p-2' : 'mt-4 p-3'} rounded-lg bg-warning/10 border border-warning/20`}>
                <p className={`${isDesktop ? 'text-xs mb-2' : 'text-sm mb-3'} text-center text-muted-foreground`}>
                  Você não possui uma assinatura ativa. Assine um plano para desbloquear todas as funcionalidades!
                </p>
                <div className="flex justify-center">
                  <Button 
                    className={`${isDesktop ? 'w-auto px-6 h-8 text-xs' : 'w-full'} bg-gradient-to-r from-accent-purple to-accent-cyan hover:opacity-90 transition-opacity active:scale-[0.98]`}
                    onClick={handleNavigateToPlans}
                  >
                    <Crown className={`${isDesktop ? 'w-3 h-3 mr-1.5' : 'w-4 h-4 mr-2'}`} />
                    Assinar Plano
                  </Button>
                </div>
              </div>
            </>
          )}
            </GlassCard>

            {/* Preferências */}
            <GlassCard className="p-3">
              <h3 className="font-semibold mb-2 text-sm flex items-center gap-2">
                ⚙️ Preferências
              </h3>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs">Notificações</span>
                    {settings.notifications && (
                      <button
                        onClick={sendTestNotification}
                        className="text-[10px] text-accent-cyan hover:underline mt-0.5"
                      >
                        Testar notificação
                      </button>
                    )}
                  </div>
                  <Switch 
                    checked={settings.notifications} 
                    onCheckedChange={(checked) => handleToggleSetting('notifications', checked)}
                    className="scale-90"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs">Sons</span>
                  <Switch 
                    checked={settings.sounds} 
                    onCheckedChange={(checked) => handleToggleSetting('sounds', checked)}
                    className="scale-90"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs">Analytics</span>
                  <Switch 
                    checked={settings.analytics} 
                    onCheckedChange={(checked) => handleToggleSetting('analytics', checked)}
                    className="scale-90"
                  />
                </div>
                {pushSupported && (
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-xs">Notificações Push</span>
                      <span className="text-[10px] text-muted-foreground">
                        Receber notificações mesmo com app fechado
                      </span>
                    </div>
                    <Switch 
                      checked={pushSubscribed} 
                      onCheckedChange={async (checked) => {
                        if (checked) {
                          await subscribePush();
                        } else {
                          await unsubscribePush();
                        }
                      }}
                      disabled={pushLoading}
                      className="scale-90"
                    />
                  </div>
                )}
              </div>
            </GlassCard>

            {/* Segurança */}
            <GlassCard className="p-3">
              <h3 className="font-semibold mb-2 text-sm flex items-center gap-2">
                🔒 Segurança
              </h3>

              <div className="space-y-2">
                <button 
                  onClick={handleOpenChangePassword}
                  className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-white/5 active:bg-white/10 transition-colors"
                >
                  <span className="text-xs">Alterar Senha</span>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            </GlassCard>
          </div>
        ) : (
          <>
            {/* Plano Atual - Mobile */}
            <GlassCard className={isDesktop ? 'p-3' : ''}>
              {profile?.subscription_status === 'active' ? (
                <>
                  <div className={`flex items-center justify-between ${isDesktop ? 'mb-2' : 'mb-3'}`}>
                    <h3 className={`font-semibold ${isDesktop ? 'text-sm' : ''}`}>Plano Atual</h3>
                    <Badge className={`bg-gradient-to-r from-accent-purple to-accent-cyan ${isDesktop ? 'text-[10px] px-2 py-0.5' : ''}`}>
                      <Crown className={`${isDesktop ? 'w-2.5 h-2.5 mr-0.5' : 'w-3 h-3 mr-1'}`} />
                      {getPlanName(profile?.plan || 'pro')}
                    </Badge>
                  </div>

                  <div className={isDesktop ? 'mb-2' : 'mb-3'}>
                    <div className={`flex items-center justify-between ${isDesktop ? 'text-xs' : 'text-sm'}`}>
                      <span className="text-muted-foreground">Status da Assinatura</span>
                      {getSubscriptionStatusBadge(profile.subscription_status)}
                    </div>
                    {profile.subscription_ends_at && (
                      <p className={`${isDesktop ? 'text-[10px]' : 'text-xs'} text-muted-foreground mt-1`}>
                        Expira em: {new Date(profile.subscription_ends_at).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>

                  <div className={isDesktop ? 'space-y-2' : 'space-y-3'}>
                    <div>
                      <div className={`flex justify-between ${isDesktop ? 'text-xs mb-0.5' : 'text-sm mb-1'}`}>
                        <span className="text-muted-foreground">Instâncias</span>
                        <span className="font-medium">
                          {limitStatus?.currentConnections || connections.length} / {limitStatus?.maxConnections || profile?.max_connections || 2}
                        </span>
                      </div>
                      <Progress value={connectionProgress} className={isDesktop ? 'h-1.5' : ''} />
                    </div>
                  </div>

                  {profile?.plan === 'pro' ? (
                    <div className={`flex justify-center ${isDesktop ? 'mt-3' : 'mt-4'}`}>
                      <Button 
                        className={`${isDesktop ? 'w-auto px-6 h-8 text-xs' : 'w-full'} bg-gradient-to-r from-accent-purple to-accent-cyan hover:opacity-90 transition-opacity active:scale-[0.98]`}
                        onClick={handleNavigateToPlans}
                      >
                        Fazer Upgrade para SUPER PRO ⬆️
                      </Button>
                    </div>
                  ) : (
                    <div className={`flex justify-center ${isDesktop ? 'mt-3' : 'mt-4'}`}>
                      <Button 
                        className={`${isDesktop ? 'w-auto px-6 h-8 text-xs' : 'w-full'} hover:opacity-90 transition-opacity active:scale-[0.98]`}
                        variant="outline"
                        onClick={handleNavigateToPlans}
                      >
                        Gerenciar Plano
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className={`flex items-center justify-between ${isDesktop ? 'mb-2' : 'mb-3'}`}>
                    <h3 className={`font-semibold ${isDesktop ? 'text-sm' : ''}`}>Plano Atual</h3>
                    <Badge variant="secondary" className={isDesktop ? 'text-[10px] px-2 py-0.5' : ''}>Sem Assinatura</Badge>
                  </div>

                  {profile?.subscription_status && (
                    <div className={isDesktop ? 'mb-2' : 'mb-3'}>
                      <div className={`flex items-center justify-between ${isDesktop ? 'text-xs' : 'text-sm'}`}>
                        <span className="text-muted-foreground">Status da Assinatura</span>
                        {getSubscriptionStatusBadge(profile.subscription_status)}
                      </div>
                      {profile.subscription_ends_at && (
                        <p className={`${isDesktop ? 'text-[10px]' : 'text-xs'} text-muted-foreground mt-1`}>
                          Expirou em: {new Date(profile.subscription_ends_at).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                  )}

                  <div className={isDesktop ? 'space-y-2' : 'space-y-3'}>
                    <div>
                      <div className={`flex justify-between ${isDesktop ? 'text-xs mb-0.5' : 'text-sm mb-1'}`}>
                        <span className="text-muted-foreground">Instâncias</span>
                        <span className="font-medium">
                          {limitStatus?.currentConnections || connections.length} / {limitStatus?.maxConnections || profile?.max_connections || 0}
                        </span>
                      </div>
                      <Progress value={connectionProgress} className={isDesktop ? 'h-1.5' : ''} />
                    </div>
                  </div>

                  <div className={`${isDesktop ? 'mt-3 p-2' : 'mt-4 p-3'} rounded-lg bg-warning/10 border border-warning/20`}>
                    <p className={`${isDesktop ? 'text-xs mb-2' : 'text-sm mb-3'} text-center text-muted-foreground`}>
                      Você não possui uma assinatura ativa. Assine um plano para desbloquear todas as funcionalidades!
                    </p>
                    <div className="flex justify-center">
                      <Button 
                        className={`${isDesktop ? 'w-auto px-6 h-8 text-xs' : 'w-full'} bg-gradient-to-r from-accent-purple to-accent-cyan hover:opacity-90 transition-opacity active:scale-[0.98]`}
                        onClick={handleNavigateToPlans}
                      >
                        <Crown className={`${isDesktop ? 'w-3 h-3 mr-1.5' : 'w-4 h-4 mr-2'}`} />
                        Assinar Plano
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </GlassCard>

            {/* Preferências - Mobile */}
            <GlassCard className={isDesktop ? 'p-3' : ''}>
              <h3 className={`font-semibold ${isDesktop ? 'mb-2 text-sm' : 'mb-4'} flex items-center gap-2`}>
                ⚙️ Preferências
              </h3>

              <div className={isDesktop ? 'space-y-2.5' : 'space-y-4'}>
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className={isDesktop ? 'text-xs' : 'text-sm'}>Notificações</span>
                    {settings.notifications && (
                      <button
                        onClick={sendTestNotification}
                        className={`${isDesktop ? 'text-[10px]' : 'text-xs'} text-accent-cyan hover:underline mt-0.5`}
                      >
                        Testar notificação
                      </button>
                    )}
                  </div>
                  <Switch 
                    checked={settings.notifications} 
                    onCheckedChange={(checked) => handleToggleSetting('notifications', checked)}
                    className={isDesktop ? 'scale-90' : ''}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className={isDesktop ? 'text-xs' : 'text-sm'}>Sons</span>
                  <Switch 
                    checked={settings.sounds} 
                    onCheckedChange={(checked) => handleToggleSetting('sounds', checked)}
                    className={isDesktop ? 'scale-90' : ''}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className={isDesktop ? 'text-xs' : 'text-sm'}>Analytics</span>
                  <Switch 
                    checked={settings.analytics} 
                    onCheckedChange={(checked) => handleToggleSetting('analytics', checked)}
                    className={isDesktop ? 'scale-90' : ''}
                  />
                </div>
                {pushSupported && (
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className={isDesktop ? 'text-xs' : 'text-sm'}>Notificações Push</span>
                      <span className={`${isDesktop ? 'text-[10px]' : 'text-xs'} text-muted-foreground`}>
                        Receber notificações mesmo com app fechado
                      </span>
                    </div>
                    <Switch 
                      checked={pushSubscribed} 
                      onCheckedChange={async (checked) => {
                        if (checked) {
                          await subscribePush();
                        } else {
                          await unsubscribePush();
                        }
                      }}
                      disabled={pushLoading}
                      className={isDesktop ? 'scale-90' : ''}
                    />
                  </div>
                )}
              </div>
            </GlassCard>

            {/* Segurança - Mobile */}
            <GlassCard className={isDesktop ? 'p-3' : ''}>
              <h3 className={`font-semibold ${isDesktop ? 'mb-2 text-sm' : 'mb-4'} flex items-center gap-2`}>
                🔒 Segurança
              </h3>

              <div className={isDesktop ? 'space-y-2' : 'space-y-3'}>
                <button 
                  onClick={handleOpenChangePassword}
                  className={`w-full flex items-center justify-between ${isDesktop ? 'p-2' : 'p-3'} rounded-lg hover:bg-white/5 active:bg-white/10 transition-colors`}
                >
                  <span className={isDesktop ? 'text-xs' : 'text-sm'}>Alterar Senha</span>
                  <ChevronRight className={`${isDesktop ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-muted-foreground`} />
                </button>
              </div>
            </GlassCard>
          </>
        )}

        {/* Administração */}
        {isAdmin && (
          <GlassCard className={`border-accent-purple/50 bg-accent-purple/10 ${isDesktop ? 'p-3' : ''}`}>
            <h3 className={`font-semibold ${isDesktop ? 'mb-2 text-sm' : 'mb-4'} flex items-center gap-2`}>
              <Shield className={`${isDesktop ? 'w-4 h-4' : 'w-5 h-5'} text-accent-purple`} />
              Administração
            </h3>
            <div className="flex justify-center">
              <Button
                className={`${isDesktop ? 'w-auto px-6 h-8 text-xs' : 'w-full'} bg-gradient-to-r from-accent-purple to-accent-cyan hover:opacity-90 transition-opacity active:scale-[0.98]`}
                onClick={handleNavigateToAdmin}
              >
                <Shield className={`${isDesktop ? 'w-3 h-3 mr-1.5' : 'w-4 h-4 mr-2'}`} />
                Painel Administrativo
              </Button>
            </div>
            <p className={`${isDesktop ? 'text-[10px] mt-1.5' : 'text-xs mt-2'} text-muted-foreground text-center`}>
              Gerenciar usuários, planos e configurações do sistema
            </p>
          </GlassCard>
        )}


        {/* Botão Sair */}
        <div className="flex justify-center">
          <Button
            variant="destructive"
            className={`${isDesktop ? 'w-auto px-6 h-8 text-xs' : 'w-full'} hover:opacity-90 transition-opacity active:scale-[0.98]`}
            onClick={handleLogout}
          >
            <LogOut className={`${isDesktop ? 'w-3.5 h-3.5 mr-1.5' : 'w-4 h-4 mr-2'}`} />
            Sair da Conta 🚪
          </Button>
        </div>

        {/* Footer */}
        <div className={`text-center ${isDesktop ? 'text-xs py-2' : 'text-sm py-4'} text-muted-foreground`}>
          v1.0.0 • © 2024 Connect
        </div>
      </div>

      {/* Modal Editar Perfil */}
      <Dialog open={showEditProfile} onOpenChange={setShowEditProfile}>
        <DialogContent className="glass">
          <DialogHeader>
            <DialogTitle>Editar Perfil</DialogTitle>
            <DialogDescription>
              Atualize suas informações pessoais
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="edit-name">Nome</Label>
              <Input
                id="edit-name"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                placeholder="Seu nome"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="edit-phone">Telefone</Label>
              <Input
                id="edit-phone"
                value={editingPhone}
                onChange={(e) => setEditingPhone(e.target.value)}
                placeholder="(00) 00000-0000"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                value={profile?.email || ""}
                disabled
                className="mt-1 bg-muted"
              />
              <p className="text-xs text-muted-foreground mt-1">
                O email não pode ser alterado
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowEditProfile(false);
                  setEditingName("");
                  setEditingPhone("");
                }}
                disabled={savingProfile}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 hover:opacity-90 transition-opacity active:scale-[0.98]"
                onClick={handleSaveProfile}
                disabled={savingProfile}
              >
                {savingProfile ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Alterar Senha */}
      <Dialog open={showChangePassword} onOpenChange={setShowChangePassword}>
        <DialogContent className="glass">
          <DialogHeader>
            <DialogTitle>Alterar Senha</DialogTitle>
            <DialogDescription>
              Digite sua senha atual e a nova senha
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="current-password">Senha Atual</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Digite sua senha atual"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="new-password">Nova Senha</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Digite a nova senha (mín. 6 caracteres)"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirme a nova senha"
                className="mt-1"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowChangePassword(false);
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                }}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={handleChangePassword}
                disabled={changingPassword}
              >
                {changingPassword ? "Alterando..." : "Alterar Senha"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
});

Settings.displayName = 'Settings';

export default Settings;
