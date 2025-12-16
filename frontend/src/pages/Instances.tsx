import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { Plus, Search, RefreshCw, Settings as SettingsIcon, Trash2, Crown, Power, LogOut, MoreVertical, Webhook, X } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { GradientButton } from "@/components/GradientButton";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/PageHeader";
import { BottomNav } from "@/components/BottomNav";
import { QRCodeModal } from "@/components/QRCodeModal";
import { ConnectionMethodModal } from "@/components/ConnectionMethodModal";
import { WebhookModal } from "@/components/WebhookModal";
import { SkeletonList } from "@/components/Skeleton";
import { useDebounce } from "@/hooks/useDebounce";
import { toast } from "sonner";
import { useConnections } from "@/hooks/useConnections";
import { useConnectionLimit } from "@/hooks/useConnectionLimit";
import { useSubscription } from "@/hooks/useSubscription";
import { useNavigate } from "react-router-dom";
import { Connection } from "@/lib/supabase";
import { SubscriptionBlocked } from "@/components/SubscriptionBlocked";

const Instances = memo(() => {
  const navigate = useNavigate();
  const [showQRModal, setShowQRModal] = useState(false);
  const [showMethodModal, setShowMethodModal] = useState(false);
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<'qr' | 'phone'>('qr');
  const [selectedWebhookToken, setSelectedWebhookToken] = useState<string | null>(null);
  const [selectedWebhookName, setSelectedWebhookName] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const { connections, loading, deleteConnection, updateConnection, reconnect, disconnect, logout, checkStatus, refresh } = useConnections();
  const { limitStatus, loading: limitLoading } = useConnectionLimit();
  const { hasActiveSubscription, canCreate, message: subscriptionMessage, isExpired } = useSubscription();
  
  // Detectar modo desktop
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;

  // Memoizar funções de status
  const getStatusColor = useCallback((status: 'offline' | 'connecting' | 'online' | 'disconnected') => {
    switch (status) {
      case "online": return "text-success";
      case "offline": return "text-destructive";
      case "connecting": return "text-warning";
      default: return "text-muted-foreground";
    }
  }, []);

  const getStatusDot = useCallback((status: 'offline' | 'connecting' | 'online' | 'disconnected') => {
    switch (status) {
      case "online": return "bg-success";
      case "offline": return "bg-destructive";
      case "connecting": return "bg-warning animate-pulse";
      default: return "bg-muted";
    }
  }, []);

  // Filtrar conexões baseado na busca (memoizado)
  const filteredConnections = useMemo(() => {
    if (!debouncedSearchTerm.trim()) return connections;
    
    const searchLower = debouncedSearchTerm.toLowerCase();
    return connections.filter(connection => 
      connection.name.toLowerCase().includes(searchLower) ||
      (connection.phone && connection.phone.includes(debouncedSearchTerm))
    );
  }, [connections, debouncedSearchTerm]);

  // Verificar status periodicamente (apenas conexões ativas)
  useEffect(() => {
    const activeConnections = connections.filter(conn => 
      conn.status === 'connecting' || conn.status === 'online'
    );
    
    if (activeConnections.length === 0) return;
    
    const interval = setInterval(() => {
      // Verificar apenas uma conexão por vez para não sobrecarregar
      activeConnections.forEach((conn, index) => {
        setTimeout(() => {
          checkStatus(conn.id);
        }, index * 500); // Espaçar as verificações
      });
    }, 30000); // Verificar a cada 30 segundos (reduzido de 10s)

    return () => clearInterval(interval);
  }, [connections.length, checkStatus]); // Só recriar se o número de conexões mudar

  // Handlers memoizados
  const handleCreateInstance = useCallback(() => {
    // Verificar se tem assinatura ativa
    if (!hasActiveSubscription || !canCreate) {
      toast.error(subscriptionMessage || "Você precisa de uma assinatura ativa para criar conexões.");
      setTimeout(() => {
        navigate("/plans");
      }, 2000);
      return;
    }

    // Bloquear se ainda está carregando o limite
    if (limitLoading) {
      toast.info("Aguarde enquanto verificamos seu limite de conexões...");
      return;
    }
    
    // Bloquear se limite atingido
    if (limitStatus && !limitStatus.canCreateConnection) {
      toast.error(`Limite de conexões atingido! Seu plano permite ${limitStatus.maxConnections} conexão(ões).`);
      return;
    }
    
    setSelectedConnectionId(null);
    setShowQRModal(true);
  }, [hasActiveSubscription, canCreate, subscriptionMessage, limitLoading, limitStatus, navigate]);

  const handleCheckStatus = useCallback(async (connectionId: string) => {
    await checkStatus(connectionId);
    await refresh();
  }, [checkStatus, refresh]);

  const handleReconnect = useCallback(async (connectionId: string) => {
    const result = await reconnect(connectionId);
    await refresh();
    // Se precisar de QR code, abrir modal
    if (result.needsQRCode) {
      setSelectedConnectionId(connectionId);
      setSelectedMethod('qr');
      setShowMethodModal(true);
    }
  }, [reconnect, refresh]);

  const handleDelete = useCallback(async (connectionId: string, connectionName: string) => {
    if (confirm(`Tem certeza que deseja deletar ${connectionName}?`)) {
      try {
        await deleteConnection(connectionId);
        await refresh();
      } catch (error) {
        // Erro já tratado no hook
      }
    }
  }, [deleteConnection, refresh]);

  const handleDisconnect = useCallback(async (connectionId: string, connectionName: string) => {
    if (confirm(`Tem certeza que deseja desconectar ${connectionName}?`)) {
      try {
        await disconnect(connectionId);
        await refresh();
      } catch (error) {
        // Erro já tratado no hook
      }
    }
  }, [disconnect, refresh]);

  const handleLogout = useCallback(async (connectionId: string, connectionName: string) => {
    if (confirm(`Tem certeza que deseja deslogar ${connectionName}? Será necessário escanear QR code novamente.`)) {
      try {
        await logout(connectionId);
        await refresh();
      } catch (error) {
        // Erro já tratado no hook
      }
    }
  }, [logout, refresh]);

  const handleOpenWebhook = useCallback((connection: Connection) => {
    setSelectedWebhookToken(connection.api_instance_token);
    setSelectedWebhookName(connection.name);
    setShowWebhookModal(true);
  }, []);

  const handleCloseQRModal = useCallback(() => {
    setShowQRModal(false);
    setSelectedConnectionId(null);
    refresh();
  }, [refresh]);

  const handleCloseMethodModal = useCallback(() => {
    setShowMethodModal(false);
    setSelectedConnectionId(null);
  }, []);

  const handleSelectMethod = useCallback((method: 'qr' | 'phone') => {
    setSelectedMethod(method);
    setShowMethodModal(false);
    // Aguardar um pouco antes de abrir o QRCodeModal para garantir que o método foi selecionado
    setTimeout(() => {
      setShowQRModal(true);
    }, 100);
  }, []);

  const handleCloseWebhookModal = useCallback(() => {
    setShowWebhookModal(false);
    setSelectedWebhookToken(null);
    setSelectedWebhookName("");
  }, []);

  return (
    <div className="min-h-screen bg-[hsl(var(--bg-primary))] pb-24">
      <PageHeader 
        title="Instâncias" 
        action={
          <div className="flex items-center gap-2">
            {/* Alerta de limite no header */}
            {(limitLoading || (limitStatus && !limitStatus.canCreateConnection)) && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-warning/50 bg-warning/10">
                <Crown className="w-4 h-4 text-warning flex-shrink-0" />
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-warning">
                    {limitLoading ? 'Verificando...' : `Limite: ${limitStatus?.currentConnections || 0}/${limitStatus?.maxConnections || 0}`}
                  </span>
                  {!limitLoading && limitStatus && !limitStatus.canCreateConnection && (
                    <GradientButton 
                      size="sm"
                      onClick={() => navigate("/plans")}
                      variant="pink-red"
                      className="h-7 px-3 text-xs"
                    >
                      Upgrade
                    </GradientButton>
                  )}
                </div>
              </div>
            )}
            <div className="animate-float">
              <img 
                src="https://i.postimg.cc/zfK0BqB7/Gemini-Generated-Image-urlh0ourlh0ourlh-1.png" 
                alt="Connect Logo" 
                className="w-10 h-10 rounded-full object-cover cursor-pointer hover:scale-105 transition-transform"
              />
            </div>
          </div>
        }
      />

      <SubscriptionBlocked featureName="criar e gerenciar instâncias">
        <div className={`${isDesktop ? 'max-w-7xl' : 'max-w-lg'} mx-auto px-4 sm:px-6 space-y-3 sm:space-y-4 py-4`}>
          {/* Aviso de Assinatura Necessária - Compacto */}
          {!hasActiveSubscription && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-warning/50 bg-warning/10 animate-slide-up">
              <Crown className="w-4 h-4 text-warning flex-shrink-0" />
              <p className="text-xs text-warning flex-1">Assinatura necessária para criar conexões</p>
              <GradientButton
                onClick={() => navigate("/plans")}
                size="sm"
                className="h-7 px-3 text-xs"
              >
                Ver Planos
              </GradientButton>
            </div>
          )}

        {/* Search */}
        <div className={`${isDesktop ? 'max-w-md' : 'w-full'} relative`}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
          <Input
            placeholder="Buscar instância..."
            className="pl-11 h-11 bg-bg-input border-border/50 focus:border-accent-purple transition-colors"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Instances List */}
        {loading ? (
          <SkeletonList count={3} />
        ) : connections.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">Nenhuma instância conectada</p>
            <GradientButton 
              onClick={handleCreateInstance}
              disabled={!hasActiveSubscription || !canCreate || limitLoading || !limitStatus || (limitStatus && !limitStatus.canCreateConnection)}
            >
              {limitLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : !hasActiveSubscription || !canCreate ? (
                <>
                  <Crown className="w-4 h-4 mr-2" />
                  Assine um Plano
                </>
              ) : (
                "+ Conectar Primeira Instância"
              )}
            </GradientButton>
          </div>
        ) : (
          <div className={`${isDesktop ? 'grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4' : 'space-y-3'} animate-slide-up`}>
            {filteredConnections.length === 0 ? (
              <div className="text-center py-12 col-span-full">
                <p className="text-muted-foreground">Nenhuma instância encontrada com "{searchTerm}"</p>
              </div>
            ) : (
              filteredConnections.map((connection, index) => (
                <GlassCard 
                  key={connection.id} 
                  hover
                  className="animate-slide-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${getStatusDot(connection.status)}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-base truncate">{connection.name}</h3>
                            <span className={`text-xs uppercase font-bold px-2 py-0.5 rounded ${getStatusColor(connection.status)} ${connection.status === 'online' ? 'bg-success/20' : connection.status === 'offline' ? 'bg-destructive/20' : 'bg-warning/20'}`}>
                              {connection.status === "online" ? "ONLINE" : 
                               connection.status === "offline" ? "OFFLINE" : "CONECTANDO"}
                            </span>
                          </div>
                          {connection.phone && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">{connection.phone}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button 
                          onClick={() => handleCheckStatus(connection.id)}
                          className="p-2 rounded-lg hover:bg-accent-purple/20 active:bg-accent-purple/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Verificar Status"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        {connection.status === 'offline' && (
                          <button 
                            onClick={() => handleReconnect(connection.id)}
                            className="p-2 rounded-lg hover:bg-accent-cyan/20 active:bg-accent-cyan/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Conectar"
                          >
                            <SettingsIcon className="w-4 h-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => handleDelete(connection.id, connection.name)}
                          className="p-2 rounded-lg hover:bg-destructive/20 active:bg-destructive/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Deletar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {connection.status === "online" && (
                      <div className="space-y-3 pt-3 border-t border-border/30">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-2 rounded-lg bg-white/5">
                            <p className="text-xs text-muted-foreground mb-1">Mensagens</p>
                            <p className="text-base font-bold">📊 {connection.messages_sent && connection.messages_sent > 0 
                              ? (connection.messages_sent > 1000 ? `${(connection.messages_sent / 1000).toFixed(1)}k` : connection.messages_sent)
                              : 0}
                            </p>
                          </div>
                          <div className="text-center p-2 rounded-lg bg-white/5">
                            <p className="text-xs text-muted-foreground mb-1">Ativo há</p>
                            <p className="text-base font-bold">⏱️ {connection.active_days && connection.active_days > 0 
                              ? `${connection.active_days} ${connection.active_days === 1 ? 'dia' : 'dias'}`
                              : '1 dia'}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <GradientButton 
                            size="sm" 
                            className="flex-1 min-w-[100px]" 
                            variant="pink-red"
                            onClick={() => handleDisconnect(connection.id, connection.name)}
                          >
                            <Power className="w-4 h-4 mr-1.5" />
                            <span className="text-xs">Desconectar</span>
                          </GradientButton>
                          <GradientButton 
                            size="sm" 
                            className="flex-1 min-w-[100px]" 
                            variant="pink-red"
                            onClick={() => handleLogout(connection.id, connection.name)}
                          >
                            <LogOut className="w-4 h-4 mr-1.5" />
                            <span className="text-xs">Logout</span>
                          </GradientButton>
                          <GradientButton 
                            size="sm" 
                            className="flex-1 min-w-[100px]" 
                            variant="pink-red"
                            onClick={() => handleOpenWebhook(connection)}
                          >
                            <Webhook className="w-4 h-4 mr-1.5" />
                            <span className="text-xs">Webhook</span>
                          </GradientButton>
                        </div>
                      </div>
                    )}

                    {connection.status === "offline" && (
                      <div className="pt-3 border-t border-border/30">
                        <GradientButton 
                          size="sm" 
                          className="w-full max-w-xs mx-auto" 
                          variant="pink-red"
                          onClick={() => handleReconnect(connection.id)}
                        >
                          🔌 Conectar
                        </GradientButton>
                      </div>
                    )}

                    {connection.status === "connecting" && (
                      <div className="pt-2 border-t border-border/30 space-y-2">
                        <div className="flex items-center justify-center gap-2 py-2">
                          <div className="w-2 h-2 bg-warning rounded-full animate-pulse" />
                          <span className="text-sm text-warning font-medium">Conectando...</span>
                        </div>
                        <GradientButton 
                          size="sm" 
                          className="w-full" 
                          variant="pink-red"
                          onClick={async () => {
                            try {
                              // Resetar status para offline
                              await updateConnection(connection.id, { status: 'offline' });
                              toast.success("Conexão cancelada. Você pode tentar novamente.");
                              await refresh();
                            } catch (error) {
                              console.error('Erro ao cancelar conexão:', error);
                              toast.error("Erro ao cancelar conexão");
                            }
                          }}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Cancelar Conexão
                        </GradientButton>
                      </div>
                    )}
                  </div>
                </GlassCard>
              ))
            )}
          </div>
        )}

        {/* Alerta de limite mobile - mostrar apenas em mobile */}
        {(limitLoading || (limitStatus && !limitStatus.canCreateConnection)) && (
          <div className="sm:hidden flex items-center gap-2 px-4 py-2 rounded-lg border border-warning/50 bg-warning/10">
            <Crown className="w-4 h-4 text-warning flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-warning">
                {limitLoading ? 'Verificando limite...' : `Limite: ${limitStatus?.currentConnections || 0}/${limitStatus?.maxConnections || 0}`}
              </p>
            </div>
            {!limitLoading && limitStatus && !limitStatus.canCreateConnection && (
              <GradientButton 
                size="sm"
                onClick={() => navigate("/plans")}
                variant="pink-red"
                className="h-7 px-3 text-xs"
              >
                Upgrade
              </GradientButton>
            )}
          </div>
        )}

        <GradientButton 
          className={`${isDesktop ? 'max-w-xs' : 'w-full'} mx-auto`}
          size="sm"
          onClick={handleCreateInstance}
          disabled={!hasActiveSubscription || !canCreate || limitLoading || !limitStatus || (limitStatus && !limitStatus.canCreateConnection)}
        >
          {limitLoading ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Verificando...
            </>
          ) : !hasActiveSubscription || !canCreate ? (
            <>
              <Crown className="w-4 h-4 mr-2" />
              Assine um Plano para Criar
            </>
          ) : (
            <>
              + Nova Instância
              {limitStatus && (
                <span className="ml-2 text-xs opacity-75">
                  ({limitStatus.currentConnections}/{limitStatus.maxConnections})
                </span>
              )}
            </>
          )}
        </GradientButton>
        </div>
      </SubscriptionBlocked>

      {/* Modal de seleção de método (para instâncias existentes) */}
      <ConnectionMethodModal
        open={showMethodModal}
        onClose={handleCloseMethodModal}
        onSelectMethod={handleSelectMethod}
        instanceName={selectedConnectionId ? (connections.find(c => c.id === selectedConnectionId)?.name || 'Instância') : 'Instância'}
      />

      {/* Modal de conexão (criação ou conexão de instância existente) */}
      {/* Só renderizar se showQRModal for true E não estiver mostrando o modal de método */}
      <QRCodeModal 
        open={showQRModal && !showMethodModal} 
        onClose={handleCloseQRModal}
        initialConnectionId={selectedConnectionId}
        initialMethod={selectedMethod}
      />

      {/* Modal de Webhook */}
      <WebhookModal
        open={showWebhookModal}
        onClose={handleCloseWebhookModal}
        instanceToken={selectedWebhookToken || ""}
        instanceName={selectedWebhookName}
      />

      <BottomNav />
    </div>
  );
});

Instances.displayName = 'Instances';

export default Instances;
