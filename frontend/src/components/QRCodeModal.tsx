import { useState, useEffect, useRef, useCallback, memo, useMemo } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, RefreshCw, Phone } from "lucide-react";
import { useConnections } from "@/hooks/useConnections";
import { useConnectionLimit } from "@/hooks/useConnectionLimit";
import { Connection } from "@/lib/supabase";
import { whatsappApi } from "@/lib/whatsapp-api";
import { toast } from "sonner";

interface QRCodeModalProps {
  open: boolean;
  onClose: () => void;
  initialConnectionId?: string | null; // ID da conexão se já existir
  initialMethod?: 'qr' | 'phone'; // Método pré-selecionado
}

export const QRCodeModal = memo(({ open, onClose, initialConnectionId = null, initialMethod = 'qr' }: QRCodeModalProps) => {
  const [instanceName, setInstanceName] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState(""); // Número do WhatsApp para criar instância
  const [qrCode, setQrCode] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  const [connectionId, setConnectionId] = useState<string | null>(initialConnectionId);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [connectionMethod, setConnectionMethod] = useState<'qr' | 'phone'>(initialMethod);
  const [phoneNumber, setPhoneNumber] = useState(""); // Número para pareamento
  const [pairCode, setPairCode] = useState("");
  const [isPairing, setIsPairing] = useState(false);
  const [qrRefreshTimer, setQrRefreshTimer] = useState<number | null>(null); // Timer de 25 segundos para atualizar QR code
  const qrCodeRef = useRef<string>(""); // Ref para preservar QR code durante atualizações
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null); // Ref para o intervalo de polling
  const isPollingRef = useRef<boolean>(false); // Ref para controlar se está fazendo polling
  const hasNotifiedRef = useRef<boolean>(false); // Ref para controlar se já notificou sucesso
  const { createConnection, getQRCode, checkStatus, refresh, connections: connectionsData = [], updateConnection } = useConnections();
  const { limitStatus, loading: limitLoading } = useConnectionLimit();
  const connections = (connectionsData as Connection[]) || [];

  // useEffect para inicializar quando o modal abre
  useEffect(() => {
    if (open) {
      if (initialConnectionId) {
        // Se veio com uma conexão existente, usar ela
        setConnectionId(initialConnectionId);
        setConnectionMethod(initialMethod);
        // Buscar dados da conexão
        const connection = connections.find(c => c.id === initialConnectionId);
        if (connection) {
          setInstanceName(connection.name);
          setWhatsappNumber(connection.phone || '');
        }
        // Sempre limpar QR Code - ele tem validade e sempre deve ser gerado via requisição
        setQrCode("");
        setPairCode("");
        setPhoneNumber("");
        setIsCheckingStatus(false);
        hasNotifiedRef.current = false; // Resetar flag de notificação
      } else {
        // Resetar tudo quando abrir o modal para criar nova
        setQrCode("");
        setInstanceName("");
        setWhatsappNumber("");
        setPhoneNumber("");
        setPairCode("");
        setConnectionMethod('qr');
        setConnectionId(null);
        setIsCheckingStatus(false);
        hasNotifiedRef.current = false; // Resetar flag de notificação
      }
    } else {
      // Quando fechar, resetar tudo e resetar status da conexão se estiver em "connecting"
      setQrCode("");
      setPairCode("");
      setPhoneNumber("");
      setIsCheckingStatus(false);
      
      // Resetar status da conexão para "offline" se estiver em "connecting"
      if (connectionId) {
        const connection = connections.find(c => c.id === connectionId);
        if (connection && connection.status === 'connecting') {
          // Resetar status para offline quando fechar o modal durante conexão
          updateConnection(connectionId, { status: 'offline' }).catch((error) => {
            console.error('Erro ao resetar status da conexão:', error);
          });
        }
      }
      
      // Limpar polling quando fechar
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      isPollingRef.current = false;
      hasNotifiedRef.current = false; // Resetar flag de notificação
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialConnectionId, initialMethod]); // Não incluir 'connections' e 'qrCode' para evitar resetar quando não necessário

  // Polling invisível para verificar status da conexão quando há QR code ou código de pareamento
  useEffect(() => {
    // Verificar se há condições para fazer polling: precisa ter connectionId, modal aberto, e (QR code OU código de pareamento)
    const hasQRCode = connectionMethod === 'qr' && qrCode && qrCode.trim() !== '';
    const hasPairCode = connectionMethod === 'phone' && pairCode && pairCode.trim() !== '';
    
    if (!connectionId || !open || (!hasQRCode && !hasPairCode)) {
      // Limpar polling se não há condições
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      isPollingRef.current = false;
      return;
    }

    const checkConnectionStatus = async () => {
      // Evitar múltiplas verificações simultâneas
      if (isPollingRef.current) return;
      isPollingRef.current = true;

      try {
        // Buscar conexão atualizada
        const connection = connections.find(c => c.id === connectionId);
        if (!connection) {
          isPollingRef.current = false;
          return;
        }

        // Verificar status via API diretamente
        const statusResponse = await whatsappApi.getStatus(connection.api_instance_token);
        
        // Log apenas em desenvolvimento e se ainda não notificou
        if (process.env.NODE_ENV === 'development' && !hasNotifiedRef.current) {
          console.log('🔍 Polling - Status verificado:', {
            connected: statusResponse.data?.Connected ?? statusResponse.data?.connected ?? false,
            loggedIn: statusResponse.data?.LoggedIn ?? statusResponse.data?.loggedIn ?? false,
          });
        }
        
        if (statusResponse.success && statusResponse.data) {
          const connected = statusResponse.data.Connected ?? statusResponse.data.connected ?? false;
          const loggedIn = statusResponse.data.LoggedIn ?? statusResponse.data.loggedIn ?? false;
          
          // Se estiver conectado E logado, significa que o QR code foi lido com sucesso
          if (connected && loggedIn) {
            // Verificar se já notificou para evitar notificações duplicadas
            if (hasNotifiedRef.current) {
              return; // Já notificou, não fazer nada
            }
            
            // Marcar como notificado ANTES de fazer qualquer coisa
            hasNotifiedRef.current = true;
            
            // Log apenas em desenvolvimento
            if (process.env.NODE_ENV === 'development') {
              const methodName = connectionMethod === 'qr' ? 'QR Code' : 'código de pareamento';
              console.log(`✅ Conectado com sucesso via ${methodName}! Instância conectada e logada.`);
            }
            
            // Parar o polling
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
            isPollingRef.current = false;
            
            // Atualizar status no banco usando checkStatus que já faz isso corretamente
            await checkStatus(connectionId);
            await refresh();
            
            // Mostrar mensagem de sucesso APENAS UMA VEZ
            toast.success("Instância conectada com sucesso!");
            
            // Fechar modal após um pequeno delay
            setTimeout(() => {
              onClose();
            }, 500);
            
            return;
          }
          
          // Se estiver conectado mas não logado, ainda está aguardando conexão (QR code ou código de pareamento)
          // Usar checkStatus para atualizar o status corretamente
          await checkStatus(connectionId);
        }
      } catch (error) {
        console.error('Erro ao verificar status no polling:', error);
        // Não interromper o polling em caso de erro
      } finally {
        isPollingRef.current = false;
      }
    };

    // Verificar imediatamente na primeira vez
    checkConnectionStatus();

    // Configurar polling a cada 2 segundos
    pollingIntervalRef.current = setInterval(checkConnectionStatus, 2000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      isPollingRef.current = false;
    };
  }, [connectionId, open, connectionMethod, qrCode, pairCode, connections, checkStatus, refresh, onClose]);

  // Atualizar QR code (chamado automaticamente pelo timer)
  const handleRefreshQRCode = useCallback(async () => {
    if (!connectionId || connectionMethod !== 'qr') return;
    
    // Resetar timer
    setQrRefreshTimer(null);
    
    // Chamar a função de gerar QR code novamente
    setIsGeneratingQR(true);
    try {
      const connection = connections.find(c => c.id === connectionId);
      if (!connection) {
        toast.error("Conexão não encontrada");
        setIsGeneratingQR(false);
        return;
      }

      // Conectar instância novamente
      await whatsappApi.connectInstance(connection.api_instance_token);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Obter novo QR code
      const qr = await getQRCode(connectionId);
      
      if (qr && qr.trim() !== '') {
        setQrCode(qr);
        qrCodeRef.current = qr;
        // Reiniciar timer de 25 segundos
        setQrRefreshTimer(25);
        toast.info("QR Code atualizado!");
      } else {
        toast.warning("Não foi possível gerar novo QR code");
      }
    } catch (error) {
      console.error("Erro ao atualizar QR Code:", error);
      toast.error("Erro ao atualizar QR Code");
    } finally {
      setIsGeneratingQR(false);
    }
  }, [connectionId, connectionMethod, connections, getQRCode]);

  // Timer de 25 segundos para atualizar QR code automaticamente
  useEffect(() => {
    if (qrRefreshTimer === null || qrRefreshTimer <= 0) return;

    const interval = setInterval(() => {
      setQrRefreshTimer((prev) => {
        if (prev === null || prev <= 1) {
          // Timer chegou a 0, atualizar QR code
          if (connectionId && connectionMethod === 'qr' && qrCode) {
            // Chamar handleRefreshQRCode de forma assíncrona
            handleRefreshQRCode();
          }
          return null;
        }
        return prev - 1;
      });
    }, 1000); // Atualizar a cada 1 segundo

    return () => clearInterval(interval);
  }, [qrRefreshTimer, connectionId, connectionMethod, qrCode, handleRefreshQRCode]);

  // Criar instância (primeira etapa)
  const handleCreateInstance = async () => {
    // VALIDAÇÃO CRÍTICA: Verificar limite ANTES de qualquer coisa
    if (limitLoading || !limitStatus) {
      toast.error("Aguarde enquanto verificamos seu limite de conexões...");
      return;
    }

    if (!limitStatus.canCreateConnection) {
      toast.error(
        `Limite de conexões atingido! Seu plano ${limitStatus.plan} permite ${limitStatus.maxConnections} conexão(ões). ` +
        `Você já possui ${limitStatus.currentConnections} conexão(ões). Faça upgrade para conectar mais números.`
      );
      return;
    }

    if (!instanceName.trim()) {
      toast.error("Digite um nome para a instância");
      return;
    }

    if (!whatsappNumber.trim()) {
      toast.error("Digite o número do WhatsApp (ex: 559192724395)");
      return;
    }

    setIsCreating(true);

    try {
      // Criar conexão (sem conectar ainda)
      // A função createConnection já valida o limite novamente no backend
      const connection = await createConnection(instanceName, whatsappNumber);
      setConnectionId(connection.id);
      toast.success("Instância criada com sucesso! Agora escolha o método de conexão.");
    } catch (error) {
      console.error("Erro ao criar instância:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao criar instância");
    } finally {
      setIsCreating(false);
    }
  };

  // Gerar QR Code (segunda etapa)
  const handleGenerateQRCode = async () => {
    if (!connectionId) {
      toast.error("Instância não encontrada");
      return;
    }

    setIsGeneratingQR(true);

    try {
      // Buscar conexão existente
      let connection = connections.find(c => c.id === connectionId);
      if (!connection) {
        await refresh();
        connection = connections.find(c => c.id === connectionId);
        if (!connection) {
          throw new Error('Conexão não encontrada. Tente novamente.');
        }
      }

      // Primeiro: Conectar instância usando /session/connect
      toast.info("Conectando à instância...");
      const connectResult = await whatsappApi.connectInstance(connection.api_instance_token);
      
      // Se já estiver conectado (mesmo com erro 500), não é erro fatal - pode continuar
      if (connectResult.alreadyConnected || connectResult.success) {
        console.log('Instância conectada (ou já estava conectada), continuando para obter QR code...');
        // Continuar para obter QR code
      } else if (!connectResult.success) {
        // Verificar se o erro é "already connected" - nesse caso, pode continuar
        const errorMessage = connectResult.error || '';
        const errorStr = errorMessage.toString().toLowerCase();
        
        // Se o erro for "already connected", pode continuar (pode estar conectado mas não logado)
        if (errorStr.includes('already connected') || 
            errorStr.includes('alreadyconnected') ||
            errorStr.includes('already logged in')) {
          console.log('Instância já conectada (detectado no erro), tentando obter QR code...');
          // Continuar para obter QR code
        } else {
          // Outro erro - lançar exceção
          throw new Error(connectResult.error || 'Erro ao conectar instância');
        }
      }

      // Aguardar um pouco para a conexão ser estabelecida (ou se já estava conectado)
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Segundo: Obter QR Code
      toast.info("Gerando QR Code...");
      try {
        let qr = await getQRCode(connectionId);
        
        // Se o QR code estiver vazio, pode ser que a instância esteja conectada mas não logada
        // Nesse caso, precisamos desconectar primeiro para gerar um novo QR code
        if (!qr || qr.trim() === '') {
          console.log('QR Code vazio, verificando status...');
          
          try {
            // Verificar status da conexão
            const statusResponse = await whatsappApi.getStatus(connection.api_instance_token);
            if (statusResponse.success && statusResponse.data) {
              const connected = statusResponse.data.Connected ?? statusResponse.data.connected ?? false;
              const loggedIn = statusResponse.data.LoggedIn ?? statusResponse.data.loggedIn ?? false;
              
              console.log('Status da conexão:', { connected, loggedIn });
              
              // Se estiver conectado mas não logado, fazer logout para forçar nova sessão
              if (connected && !loggedIn) {
                console.log('Instância conectada mas não logada - fazendo logout para gerar novo QR code...');
                toast.info("Fazendo logout para gerar novo QR code...");
                
                try {
                  // Fazer logout para terminar a sessão
                  const loggedOut = await whatsappApi.logout(connection.api_instance_token);
                  if (!loggedOut) {
                    console.warn('Falha ao fazer logout, mas continuando...');
                  }
                  
                  // Aguardar um pouco antes de reconectar
                  await new Promise(resolve => setTimeout(resolve, 2000));
                  
                  // Reconectar para criar nova sessão
                  toast.info("Reconectando para criar nova sessão...");
                  await whatsappApi.connectInstance(connection.api_instance_token);
                  await new Promise(resolve => setTimeout(resolve, 2000));
                  
                  // Tentar obter QR code novamente
                  toast.info("Gerando QR Code...");
                  qr = await getQRCode(connectionId);
                } catch (logoutError) {
                  console.error('Erro durante logout/reconexão:', logoutError);
                  toast.error("Erro ao fazer logout. Tente novamente.");
                  setIsGeneratingQR(false);
                  return;
                }
              } else if (connected && loggedIn) {
                // Se já estiver logado, não precisa de QR code
                console.log('Instância já está logada');
                toast.success("Instância já está conectada e logada!");
                await checkStatus(connectionId);
                await refresh();
                setIsGeneratingQR(false); // Resetar estado de loading
                onClose(); // Fechar modal
                return; // Sair da função
              }
            }
          } catch (statusError) {
            console.error('Erro ao verificar status:', statusError);
            // Continuar mesmo se houver erro ao verificar status
          }
        }
        
        if (qr && qr.trim() !== '') {
          // QR code gerado com sucesso - marcar como "connecting" (aguardando escanear)
          console.log('QR Code obtido, atualizando estado...', { qrLength: qr.length, qrPreview: qr.substring(0, 50) });
          
          // Resetar loading primeiro
          setIsGeneratingQR(false);
          
          // Atualizar conexão
          await updateConnection(connectionId, { status: 'connecting' });
          
          // Setar QR code no estado e na ref
          setQrCode(qr);
          qrCodeRef.current = qr; // Salvar na ref também
          setIsCheckingStatus(true);
          
          // Iniciar timer de 25 segundos para atualizar QR code
          setQrRefreshTimer(25);
          
          console.log('QR Code setado no estado:', qr.substring(0, 50));
          toast.success("QR Code gerado! Escaneie com o WhatsApp.");
        } else {
          // Se ainda não retornou QR code, verificar status real
          await checkStatus(connectionId);
          await refresh();
          toast.warning("QR Code vazio. A instância pode já estar logada ou não estar pronta.");
          setIsGeneratingQR(false); // Resetar estado de loading mesmo se não gerou QR code
        }
      } catch (qrError) {
        // Se der erro ao obter QR code, verificar status real
        const errorMsg = qrError instanceof Error ? qrError.message : '';
        if (errorMsg.toLowerCase().includes('already') || 
            errorMsg.toLowerCase().includes('logged in')) {
          // Verificar status real antes de atualizar
          await checkStatus(connectionId);
          await refresh();
          toast.info("Verificando status da conexão...");
        } else {
          throw qrError;
        }
      }
    } catch (error) {
      console.error("Erro ao gerar QR Code:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao gerar QR Code");
    } finally {
      setIsGeneratingQR(false);
    }
  };

  // Verificar status da conexão
  const handleCheckStatus = async () => {
    if (!connectionId) return;
    
    await checkStatus(connectionId);
    await refresh();
    toast.success("Verificando conexão...");
  };


  // Gerar código de pareamento (segunda etapa)
  const handleGeneratePairCode = async () => {
    if (!connectionId) {
      toast.error("Instância não encontrada");
      return;
    }

    if (!phoneNumber.trim()) {
      toast.error("Digite o número de telefone para pareamento");
      return;
    }

    setIsPairing(true);

    try {
      // Buscar conexão existente
      let connection = connections.find(c => c.id === connectionId);
      if (!connection) {
        await refresh();
        connection = connections.find(c => c.id === connectionId);
        if (!connection) {
          throw new Error('Conexão não encontrada. Tente novamente.');
        }
      }

      // Primeiro: Conectar instância usando /session/connect
      toast.info("Conectando à instância...");
      const connectResult = await whatsappApi.connectInstance(connection.api_instance_token);
      
      if (!connectResult.success) {
        throw new Error(connectResult.error || 'Erro ao conectar instância');
      }

      // Aguardar um pouco para a conexão ser estabelecida
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Segundo: Solicitar código de pareamento
      toast.info("Gerando código de pareamento...");
      
      // Remover apenas caracteres não numéricos, mas aceitar qualquer número
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      
      if (!cleanPhone) {
        throw new Error('Número de telefone não pode estar vazio');
      }
      
      const result = await whatsappApi.pairPhone(connection.api_instance_token, cleanPhone);

      // Debug: verificar resposta completa
      console.log('Resultado do pairPhone:', result);

      // API retorna LinkingCode em result.data.LinkingCode (formato: "9H3J-H3J8")
      // A função pairPhone já normaliza para result.code, mas vamos garantir
      const pairCodeValue = result.code || result.LinkingCode || (result as any).data?.LinkingCode;
      
      // Debug: verificar código extraído
      console.log('Código extraído:', pairCodeValue, 'Tipo:', typeof pairCodeValue, 'Tamanho:', pairCodeValue?.length);
      
      if (result.success && pairCodeValue) {
        // Garantir que o código está completo (formato esperado: "9H3J-H3J8" - 8 caracteres com hífen)
        const fullCode = String(pairCodeValue).trim();
        setPairCode(fullCode);
        setIsCheckingStatus(true);
        toast.success(`Código de pareamento gerado: ${fullCode}`);
      } else {
        const errorMsg = (result as any).error || (result as any).message || 'Erro desconhecido';
        console.error('Erro ao gerar código:', errorMsg, result);
        toast.error(`Erro ao gerar código de pareamento: ${errorMsg}`);
      }
    } catch (error) {
      console.error("Erro ao gerar código de pareamento:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao gerar código de pareamento");
    } finally {
      setIsPairing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-full p-0 bg-[hsl(var(--bg-primary))] border-border/50">
        <div className="glass rounded-2xl p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h2 className="text-xl font-bold">
                {connectionId ? 'Conectar Instância' : 'Criar Instância'}
              </h2>
              {connectionId && instanceName && (
                <p className="text-sm text-muted-foreground">{instanceName}</p>
              )}
            </div>
          </div>

          {/* Nome da Instância - só mostrar se não tiver conexão */}
          {!connectionId && (
            <>
              <div className="space-y-2">
                <Label>Nome da Instância</Label>
                <Input
                  placeholder="Ex: Vendas Principal"
                  value={instanceName}
                  onChange={(e) => setInstanceName(e.target.value)}
                  className="bg-[hsl(var(--bg-input))]"
                />
              </div>

              {/* Número do WhatsApp */}
              <div className="space-y-2">
                <Label>Número do WhatsApp *</Label>
                <Input
                  placeholder="559192724395 (apenas números, com código do país)"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value.replace(/\D/g, ''))}
                  className="bg-[hsl(var(--bg-input))]"
                />
                <p className="text-xs text-muted-foreground">
                  Formato: código do país + DDD + número (sem + ou espaços)
                </p>
              </div>
            </>
          )}

          {/* Se a instância já foi criada, mostrar opções de conexão */}
          {connectionId && (
            <>
              {/* Método de Conexão - já foi selecionado no modal anterior, apenas mostrar qual foi escolhido */}
              <div className="space-y-2">
                <Label>Método de Conexão</Label>
                <div className="flex gap-2">
                  <Button
                    variant={connectionMethod === 'qr' ? 'default' : 'outline'}
                    onClick={() => {
                      setConnectionMethod('qr');
                      setQrCode("");
                      setPairCode("");
                    }}
                    className="flex-1"
                    disabled={!!qrCode || !!pairCode} // Desabilitar se já gerou código
                  >
                    QR Code
                  </Button>
                  <Button
                    variant={connectionMethod === 'phone' ? 'default' : 'outline'}
                    onClick={() => {
                      setConnectionMethod('phone');
                      setQrCode("");
                      setPairCode("");
                    }}
                    className="flex-1"
                    disabled={!!qrCode || !!pairCode} // Desabilitar se já gerou código
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Código
                  </Button>
                </div>
                {connectionMethod && (
                  <p className="text-xs text-muted-foreground">
                    Método selecionado: {connectionMethod === 'qr' ? 'QR Code' : 'Código de Pareamento'}
                  </p>
                )}
              </div>
            </>
          )}

          {/* Código de Telefone - só mostrar se instância foi criada */}
          {connectionId && connectionMethod === 'phone' && (
            <div className="space-y-2">
              <Label>Número de Telefone para Pareamento</Label>
              <Input
                placeholder="559192724395 (apenas números)"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                className="bg-[hsl(var(--bg-input))]"
              />
              {pairCode && (
                <div className="glass rounded-xl p-4 text-center border-2 border-accent-purple/30">
                  <p className="text-sm text-muted-foreground mb-2">Código de Pareamento:</p>
                  <p className="text-2xl font-bold text-accent-purple">{pairCode}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Digite este código no WhatsApp quando solicitado
                  </p>
                </div>
              )}
            </div>
          )}

          {/* QR Code - só mostrar se instância foi criada */}
          {connectionId && connectionMethod === 'qr' && (
            <div className="space-y-4">
              <div className="relative flex items-center justify-center p-4 sm:p-8 glass rounded-2xl border-2 border-accent-purple/30 min-h-[250px] sm:min-h-[300px]">
                {isGeneratingQR ? (
                  <div className="flex flex-col items-center gap-4">
                    <RefreshCw className="w-12 h-12 text-accent-purple animate-spin" />
                    <p className="text-sm text-muted-foreground">Gerando QR Code...</p>
                  </div>
                ) : qrCode && qrCode.trim() !== '' ? (
                  <div className="relative">
                    <img
                      src={qrCode}
                      alt="QR Code"
                      className="w-48 h-48 sm:w-64 sm:h-64 rounded-xl object-contain"
                      onError={(e) => {
                        console.error('Erro ao carregar imagem do QR code:', e);
                        console.log('QR Code value:', qrCode.substring(0, 100));
                      }}
                      onLoad={() => {
                        console.log('QR Code imagem carregada com sucesso!');
                      }}
                    />
                    <div className="absolute inset-0 rounded-xl border-4 border-accent-purple/50 animate-pulse" />
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      Clique em "Gerar QR Code" para conectar sua instância
                    </p>
                  </div>
                )}
              </div>

              {/* Instruções - só mostrar se QR Code foi gerado */}
              {qrCode && (
                <div className="glass rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm">Instruções:</h3>
                    {qrRefreshTimer !== null && qrRefreshTimer > 0 && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Atualizando em {qrRefreshTimer}s</span>
                      </div>
                    )}
                  </div>
                  <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                    <li>Abra o WhatsApp</li>
                    <li>Toque em menu (três pontos)</li>
                    <li>Aparelhos conectados</li>
                    <li>Conectar dispositivo</li>
                    <li>Escaneie o QR Code</li>
                  </ol>
                </div>
              )}
            </div>
          )}

          {/* Botões */}
          <div className="flex gap-3">
            {!connectionId ? (
              // Etapa 1: Criar instância
              <Button
                onClick={handleCreateInstance}
                disabled={
                  limitLoading || 
                  !limitStatus || 
                  (limitStatus && !limitStatus.canCreateConnection) ||
                  !instanceName.trim() || 
                  !whatsappNumber.trim() ||
                  isCreating
                }
                className="flex-1 bg-gradient-to-r from-accent-purple to-accent-cyan disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {limitLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Verificando...
                  </>
                ) : limitStatus && !limitStatus.canCreateConnection ? (
                  `Limite Atingido (${limitStatus.currentConnections}/${limitStatus.maxConnections})`
                ) : isCreating ? (
                  "Criando..."
                ) : (
                  "Criar Instância"
                )}
              </Button>
            ) : (
              // Etapa 2: Gerar QR Code ou Código de Pareamento
              <>
                {connectionMethod === 'qr' ? (
                  <>
                    {qrCode && (
                      <Button
                        variant="outline"
                        onClick={handleRefreshQRCode}
                        disabled={isGeneratingQR}
                        className="flex items-center gap-2"
                      >
                        <RefreshCw className={`w-4 h-4 ${isGeneratingQR ? "animate-spin" : ""}`} />
                        Atualizar QR
                        {qrRefreshTimer !== null && qrRefreshTimer > 0 && (
                          <span className="ml-1 text-xs">({qrRefreshTimer}s)</span>
                        )}
                      </Button>
                    )}
                    <Button
                      onClick={qrCode ? handleCheckStatus : handleGenerateQRCode}
                      disabled={isGeneratingQR || isCheckingStatus}
                      className="flex-1 bg-gradient-to-r from-accent-purple to-accent-cyan"
                    >
                      {isGeneratingQR 
                        ? "Gerando..." 
                        : qrCode 
                        ? (isCheckingStatus ? "Verificando..." : "Verificar Conexão")
                        : "Gerar QR Code"
                      }
                    </Button>
                  </>
                ) : (
                  <>
                    {pairCode && (
                      <Button
                        variant="outline"
                        onClick={handleCheckStatus}
                        disabled={isCheckingStatus}
                        className="flex-1"
                      >
                        Verificar Conexão
                      </Button>
                    )}
                    <Button
                      onClick={handleGeneratePairCode}
                      disabled={
                        !phoneNumber.trim() ||
                        isPairing
                      }
                      className="flex-1 bg-gradient-to-r from-accent-purple to-accent-cyan"
                    >
                      {isPairing 
                        ? "Gerando Código..." 
                        : pairCode 
                        ? "Código Gerado ✓"
                        : "Gerar Código"
                      }
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});
QRCodeModal.displayName = 'QRCodeModal';

