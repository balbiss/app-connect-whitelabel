import { useState, useMemo, useCallback, memo, useRef } from "react";
import { PageHeader } from "@/components/PageHeader";
import { GlassCard } from "@/components/GlassCard";
import { GradientButton } from "@/components/GradientButton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useConnections } from "@/hooks/useConnections";
import { Users, Loader2, Search, MessageSquare, Send, Rocket, Image, Video, FileText, Mic, X, Plus, Minus } from "lucide-react";
import { toast } from "sonner";
import { BottomNav } from "@/components/BottomNav";
import { Skeleton } from "@/components/Skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface Group {
  JID: string;
  Name: string;
  Participants: Array<{
    JID: string;
    IsAdmin: boolean;
    IsSuperAdmin: boolean;
  }>;
  OwnerJID: string;
  GroupCreated: string;
  IsAnnounce: boolean;
  IsEphemeral: boolean;
  IsLocked: boolean;
}

type MediaType = 'text' | 'image' | 'video' | 'audio' | 'document';

interface SelectedMedia {
  url: string;
  type: MediaType;
  fileName?: string;
}

const ExtractMembers = memo(() => {
  const { connections, loading: connectionsLoading } = useConnections();
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [showSendModal, setShowSendModal] = useState(false);
  const [message, setMessage] = useState("");
  
  // Detectar modo desktop
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;
  const [mediaType, setMediaType] = useState<MediaType>("text");
  const [selectedMedia, setSelectedMedia] = useState<SelectedMedia | null>(null);
  const [sending, setSending] = useState(false);
  const [interval, setInterval] = useState(7); // Mínimo recomendado: 7 segundos
  const [randomizeTime, setRandomizeTime] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Memoizar conexões online
  const onlineConnections = useMemo(() => {
    if (!connections || !Array.isArray(connections)) return [];
    return connections.filter((conn: any) => conn.status === 'online');
  }, [connections]);

  // Buscar grupos
  const handleLoadGroups = useCallback(async () => {
    if (!selectedConnectionId) {
      toast.error("Selecione uma instância primeiro.");
      return;
    }

    const connection = onlineConnections.find((c: any) => c.id === selectedConnectionId);
    if (!connection) {
      toast.error("Conexão não encontrada.");
      return;
    }

    setLoadingGroups(true);
    try {
      const { whatsappApi } = await import('@/lib/whatsapp-api');
      const result = await whatsappApi.listGroups(connection.api_instance_token);

      if (result.success && result.data?.Groups) {
        setGroups(result.data.Groups);
        setSelectedGroups(new Set()); // Limpar seleção ao carregar novos grupos
        toast.success(`${result.data.Groups.length} grupo(s) encontrado(s)!`);
      } else {
        toast.error(result.error || "Erro ao carregar grupos.");
        setGroups([]);
      }
    } catch (error) {
      console.error("Erro ao carregar grupos:", error);
      toast.error("Erro ao carregar grupos.");
      setGroups([]);
    } finally {
      setLoadingGroups(false);
    }
  }, [selectedConnectionId, onlineConnections]);

  // Filtrar grupos por busca
  const filteredGroups = useMemo(() => {
    if (!searchTerm.trim()) return groups;
    const term = searchTerm.toLowerCase();
    return groups.filter(g => 
      g.Name.toLowerCase().includes(term) ||
      g.JID.toLowerCase().includes(term)
    );
  }, [groups, searchTerm]);

  // Toggle seleção de grupo
  const toggleGroupSelection = useCallback((groupJID: string) => {
    setSelectedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupJID)) {
        newSet.delete(groupJID);
      } else {
        newSet.add(groupJID);
      }
      return newSet;
    });
  }, []);

  // Selecionar todos / Desmarcar todos
  const toggleSelectAll = useCallback(() => {
    if (selectedGroups.size === filteredGroups.length) {
      setSelectedGroups(new Set());
    } else {
      setSelectedGroups(new Set(filteredGroups.map(g => g.JID)));
    }
  }, [selectedGroups.size, filteredGroups]);

  // Abrir modal de envio
  const handleOpenSendModal = useCallback(() => {
    if (selectedGroups.size === 0) {
      toast.error("Selecione pelo menos um grupo.");
      return;
    }
    setShowSendModal(true);
  }, [selectedGroups.size]);

  // Processar upload de arquivo
  const handleFileUpload = useCallback(async (file: File, type: 'image' | 'video' | 'document' | 'audio') => {
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        let formattedBase64 = base64;
        
        if (type === 'image') {
          const mimeType = file.type || 'image/jpeg';
          const normalizedMimeType = mimeType.toLowerCase();
          const isSupportedFormat = normalizedMimeType === 'image/jpeg' || 
                                    normalizedMimeType === 'image/jpg' || 
                                    normalizedMimeType === 'image/png';
          
          if (!isSupportedFormat) {
            try {
              const img = document.createElement('img');
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              
              if (!ctx) {
                throw new Error('Canvas não disponível');
              }
              
              const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
              const byteCharacters = atob(base64Data);
              const byteNumbers = new Array(byteCharacters.length);
              for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
              }
              const byteArray = new Uint8Array(byteNumbers);
              const blob = new Blob([byteArray], { type: mimeType });
              const imageUrl = URL.createObjectURL(blob);
              
              await new Promise<void>((resolve, reject) => {
                img.onload = () => {
                  canvas.width = img.width;
                  canvas.height = img.height;
                  ctx.drawImage(img, 0, 0);
                  const jpegBase64 = canvas.toDataURL('image/jpeg', 0.9);
                  formattedBase64 = jpegBase64;
                  URL.revokeObjectURL(imageUrl);
                  resolve();
                };
                img.onerror = () => {
                  URL.revokeObjectURL(imageUrl);
                  reject(new Error('Erro ao carregar imagem'));
                };
                img.src = imageUrl;
              });
              
              toast.info('Imagem convertida para JPEG');
            } catch (conversionError) {
              console.error('Erro ao converter imagem:', conversionError);
              toast.error('Erro ao converter imagem. Use apenas JPEG ou PNG.');
              return;
            }
          } else {
            if (!base64.startsWith('data:')) {
              const normalizedType = normalizedMimeType === 'image/jpg' ? 'image/jpeg' : normalizedMimeType;
              formattedBase64 = `data:${normalizedType};base64,${base64.split(',')[1] || base64}`;
            } else {
              formattedBase64 = base64.replace(/^data:image\/jpg;/, 'data:image/jpeg;');
            }
          }
        } else if (type === 'video') {
          const mimeType = file.type || 'video/mp4';
          if (!base64.startsWith('data:')) {
            formattedBase64 = `data:${mimeType};base64,${base64.split(',')[1] || base64}`;
          }
        } else if (type === 'document') {
          const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
          formattedBase64 = `data:application/octet-stream;base64,${base64Data}`;
        } else if (type === 'audio') {
          const mimeType = file.type || 'audio/ogg';
          if (!base64.startsWith('data:')) {
            formattedBase64 = `data:${mimeType};base64,${base64.split(',')[1] || base64}`;
          } else {
            const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
            formattedBase64 = `data:audio/ogg;base64,${base64Data}`;
          }
        }
        
        setSelectedMedia({
          url: formattedBase64,
          type,
          fileName: file.name,
        });
        
        toast.success(`${type === 'image' ? 'Imagem' : type === 'video' ? 'Vídeo' : type === 'audio' ? 'Áudio' : 'Documento'} adicionado!`);
      };
      
      reader.onerror = () => {
        toast.error('Erro ao ler arquivo');
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      toast.error('Erro ao processar arquivo');
    }
  }, []);

  // Enviar mensagens para grupos selecionados
  const handleSendToGroups = useCallback(async () => {
    if (selectedGroups.size === 0) {
      toast.error("Selecione pelo menos um grupo.");
      return;
    }

    if (mediaType === 'text' && !message.trim()) {
      toast.error("Digite uma mensagem.");
      return;
    }

    if (mediaType !== 'text' && !selectedMedia) {
      toast.error("Selecione um arquivo de mídia.");
      return;
    }

    const connection = onlineConnections.find((c: any) => c.id === selectedConnectionId);
    if (!connection) {
      toast.error("Conexão não encontrada.");
      return;
    }

    setSending(true);
    const selectedGroupsArray = Array.from(selectedGroups);
    let successCount = 0;
    let errorCount = 0;

    try {
      const { whatsappApi } = await import('@/lib/whatsapp-api');
      
      // Enviar para cada grupo com delay entre envios
      for (let i = 0; i < selectedGroupsArray.length; i++) {
        const groupJID = selectedGroupsArray[i];
        const group = groups.find(g => g.JID === groupJID);
        
        try {
          let result;
          
          if (mediaType === 'text') {
            result = await whatsappApi.sendTextToGroup(
              connection.api_instance_token,
              groupJID,
              message
            );
          } else if (mediaType === 'image' && selectedMedia) {
            result = await whatsappApi.sendImageToGroup(
              connection.api_instance_token,
              groupJID,
              selectedMedia.url,
              message.trim() || undefined
            );
          } else if (mediaType === 'video' && selectedMedia) {
            result = await whatsappApi.sendVideoToGroup(
              connection.api_instance_token,
              groupJID,
              selectedMedia.url,
              message.trim() || undefined
            );
          } else if (mediaType === 'audio' && selectedMedia) {
            result = await whatsappApi.sendAudioToGroup(
              connection.api_instance_token,
              groupJID,
              selectedMedia.url
            );
          } else if (mediaType === 'document' && selectedMedia) {
            result = await whatsappApi.sendDocumentToGroup(
              connection.api_instance_token,
              groupJID,
              selectedMedia.url,
              selectedMedia.fileName || 'documento',
              undefined
            );
          } else {
            throw new Error('Tipo de mídia inválido');
          }

          if (result.success) {
            successCount++;
            toast.success(`Enviado para: ${group?.Name || groupJID}`, {
              duration: 2000,
            });
          } else {
            errorCount++;
            toast.error(`Erro ao enviar para ${group?.Name || groupJID}`, {
              description: translateErrorMessage(result.error),
              duration: 3000,
            });
          }
        } catch (error) {
          errorCount++;
          console.error(`Erro ao enviar para grupo ${groupJID}:`, error);
          toast.error(`Erro ao enviar para ${group?.Name || groupJID}`, {
            duration: 3000,
          });
        }

        // Delay entre envios com intervalo configurável e randomização
        if (i < selectedGroupsArray.length - 1) {
          const delayMin = Math.max(7000, interval * 1000); // Mínimo 7 segundos
          const delayMax = randomizeTime 
            ? delayMin + Math.floor(Math.random() * 6000) + 3000 // Randomização entre 3-9 segundos adicionais
            : delayMin;
          
          const delay = randomizeTime 
            ? Math.floor(Math.random() * (delayMax - delayMin + 1)) + delayMin
            : delayMin;
          
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      // Resumo final
      if (successCount > 0) {
        toast.success(`✅ ${successCount} mensagem(ns) enviada(s) com sucesso!${errorCount > 0 ? ` ${errorCount} erro(s).` : ''}`);
      } else {
        toast.error(`❌ Nenhuma mensagem foi enviada. ${errorCount} erro(s).`);
      }

      setShowSendModal(false);
      setMessage("");
      setSelectedMedia(null);
      setMediaType("text");
    } catch (error) {
      console.error("Erro ao enviar mensagens:", error);
      toast.error("Erro ao enviar mensagens para os grupos.");
    } finally {
      setSending(false);
    }
  }, [selectedGroups, message, mediaType, selectedMedia, selectedConnectionId, onlineConnections, groups]);

  return (
    <div className="min-h-screen tech-grid-bg pb-24">
      <PageHeader title="Disparar para Grupos" />

      <div className={`${isDesktop ? 'max-w-5xl' : 'max-w-lg'} mx-auto px-4 sm:px-6 ${isDesktop ? 'space-y-3' : 'space-y-4'} animate-slide-up`}>
        {/* Seleção de Instância */}
        <GlassCard className={isDesktop ? 'p-3' : ''}>
          <h2 className={`${isDesktop ? 'text-sm' : 'text-lg'} font-bold ${isDesktop ? 'mb-2' : 'mb-4'} flex items-center gap-2`}>
            <Users className={`${isDesktop ? 'w-4 h-4' : 'w-5 h-5'} text-accent-cyan`} /> Instância WhatsApp
          </h2>
          {connectionsLoading ? (
            <Skeleton className={`${isDesktop ? 'h-9' : 'h-10'} w-full`} />
          ) : onlineConnections.length > 0 ? (
            <Select value={selectedConnectionId} onValueChange={setSelectedConnectionId}>
              <SelectTrigger className={`w-full ${isDesktop ? 'h-9 text-xs' : 'h-11'} bg-bg-input border-border/50 focus:border-accent-purple`}>
                <SelectValue placeholder="Selecione uma instância" />
              </SelectTrigger>
              <SelectContent className="glass border-border/50">
                {onlineConnections.map((conn) => (
                  <SelectItem key={conn.id} value={conn.id}>
                    {conn.name} ({conn.status === 'online' ? 'Online' : 'Offline'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">Nenhuma instância online. Conecte uma em "Instâncias".</p>
            </div>
          )}
        </GlassCard>

        {/* Botão para Carregar Grupos */}
        {selectedConnectionId && (
          <GlassCard>
            <GradientButton
              onClick={handleLoadGroups}
              className="w-full"
              disabled={loadingGroups || !selectedConnectionId}
            >
              {loadingGroups ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Carregando Grupos...
                </>
              ) : (
                <>
                  <Users className="w-5 h-5 mr-2" />
                  Carregar Grupos
                </>
              )}
            </GradientButton>
          </GlassCard>
        )}

        {/* Lista de Grupos */}
        {groups.length > 0 && (
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-accent-purple" /> Grupos ({filteredGroups.length})
              </h2>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleSelectAll}
                  className="border-border/50 hover:bg-white/5"
                >
                  {selectedGroups.size === filteredGroups.length ? "Desmarcar Todos" : "Selecionar Todos"}
                </Button>
                {selectedGroups.size > 0 && (
                  <GradientButton
                    onClick={handleOpenSendModal}
                    size="sm"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Disparar ({selectedGroups.size})
                  </GradientButton>
                )}
              </div>
            </div>

            {/* Busca */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar grupos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-bg-input border-border/50 focus:border-accent-purple"
              />
            </div>

            {/* Lista de Grupos */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredGroups.map((group) => {
                const isSelected = selectedGroups.has(group.JID);
                return (
                  <div
                    key={group.JID}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-accent-purple/20 border-accent-purple'
                        : 'bg-bg-input border-border/50 hover:border-accent-purple/50'
                    }`}
                    onClick={() => toggleGroupSelection(group.JID)}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleGroupSelection(group.JID)}
                      className="flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{group.Name}</p>
                      <p className="text-xs text-muted-foreground">
                        {group.Participants.length} membro(s)
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredGroups.length === 0 && searchTerm && (
              <p className="text-center text-sm text-muted-foreground py-4">
                Nenhum grupo encontrado com "{searchTerm}"
              </p>
            )}
          </GlassCard>
        )}

        {/* Modal para Enviar Mensagem */}
        <Dialog open={showSendModal} onOpenChange={setShowSendModal}>
          <DialogContent className="max-w-md w-full p-0 bg-[hsl(var(--bg-primary))] border-border/50">
            <div className="glass rounded-2xl p-6 space-y-4">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <Rocket className="w-5 h-5 text-accent-purple" />
                  Disparar para {selectedGroups.size} Grupo(s)
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  Selecione o tipo de conteúdo e envie para os grupos selecionados
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Tipo de Conteúdo</Label>
                  <RadioGroup value={mediaType} onValueChange={(value) => {
                    setMediaType(value as MediaType);
                    setSelectedMedia(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center space-x-2 p-2 rounded-lg border border-border/50 hover:bg-white/5">
                        <RadioGroupItem value="text" id="text" />
                        <Label htmlFor="text" className="cursor-pointer flex items-center gap-2">
                          <MessageSquare className="w-4 h-4" />
                          Texto
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 p-2 rounded-lg border border-border/50 hover:bg-white/5">
                        <RadioGroupItem value="image" id="image" />
                        <Label htmlFor="image" className="cursor-pointer flex items-center gap-2">
                          <Image className="w-4 h-4" />
                          Imagem
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 p-2 rounded-lg border border-border/50 hover:bg-white/5">
                        <RadioGroupItem value="video" id="video" />
                        <Label htmlFor="video" className="cursor-pointer flex items-center gap-2">
                          <Video className="w-4 h-4" />
                          Vídeo
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 p-2 rounded-lg border border-border/50 hover:bg-white/5">
                        <RadioGroupItem value="audio" id="audio" />
                        <Label htmlFor="audio" className="cursor-pointer flex items-center gap-2">
                          <Mic className="w-4 h-4" />
                          Áudio
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 p-2 rounded-lg border border-border/50 hover:bg-white/5 col-span-2">
                        <RadioGroupItem value="document" id="document" />
                        <Label htmlFor="document" className="cursor-pointer flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Documento
                        </Label>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                {mediaType !== 'text' && (
                  <div>
                    <Label className="text-sm font-medium mb-2 block">
                      {mediaType === 'image' ? 'Imagem' : mediaType === 'video' ? 'Vídeo' : mediaType === 'audio' ? 'Áudio' : 'Documento'}
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        ref={fileInputRef}
                        type="file"
                        accept={
                          mediaType === 'image' ? 'image/jpeg,image/jpg,image/png' :
                          mediaType === 'video' ? 'video/*' :
                          mediaType === 'audio' ? 'audio/*' :
                          '*'
                        }
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleFileUpload(file, mediaType);
                          }
                        }}
                        className="bg-bg-input border-border/50 focus:border-accent-purple"
                      />
                      {selectedMedia && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedMedia(null);
                            if (fileInputRef.current) {
                              fileInputRef.current.value = '';
                            }
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    {selectedMedia && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {selectedMedia.fileName || 'Arquivo selecionado'}
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    {mediaType === 'text' ? 'Mensagem' : mediaType === 'audio' ? 'Legenda (opcional)' : 'Legenda'}
                  </Label>
                  <Textarea
                    placeholder={
                      mediaType === 'text' ? 'Digite sua mensagem aqui...' :
                      mediaType === 'audio' ? 'Legenda opcional...' :
                      'Digite a legenda aqui...'
                    }
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={mediaType === 'audio' ? 3 : 6}
                    className="bg-bg-input border-border/50 focus:border-accent-purple"
                    disabled={mediaType === 'audio' && !selectedMedia}
                  />
                </div>

                {/* Configurações Avançadas */}
                <div className="border-t border-border/50 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="w-full flex items-center justify-between font-semibold text-sm mb-3"
                  >
                    <span className="flex items-center gap-2">⚙️ Configurações Avançadas</span>
                    <span>{showAdvanced ? '−' : '+'}</span>
                  </button>

                  {showAdvanced && (
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm mb-2 block">Intervalo entre envios (segundos)</Label>
                        <div className="flex items-center justify-center gap-4">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => setInterval(Math.max(7, interval - 1))} // Mínimo 7 segundos
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <span className="text-2xl font-bold w-16 text-center">{interval}s</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => setInterval(Math.min(60, interval + 1))}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 text-center">
                          Recomendado: 7-13 segundos (mínimo 7s para evitar banimento)
                        </p>
                        {interval < 7 && (
                          <p className="text-xs text-warning mt-1 text-center">
                            ⚠️ Intervalo muito baixo! Recomendado mínimo de 7 segundos
                          </p>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="randomize"
                          checked={randomizeTime}
                          onCheckedChange={(checked) => setRandomizeTime(checked as boolean)}
                        />
                        <Label htmlFor="randomize" className="text-sm cursor-pointer">
                          Randomizar tempo (recomendado para evitar banimento)
                        </Label>
                      </div>
                      {randomizeTime && (
                        <p className="text-xs text-muted-foreground ml-6">
                          Adiciona 3-9 segundos aleatórios ao intervalo
                        </p>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowSendModal(false);
                      setMessage("");
                      setSelectedMedia(null);
                      setMediaType("text");
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                    className="flex-1 border-border/50 hover:bg-white/5"
                    disabled={sending}
                  >
                    Cancelar
                  </Button>
                  <GradientButton
                    onClick={handleSendToGroups}
                    className="flex-1"
                    disabled={
                      sending || 
                      (mediaType === 'text' && !message.trim()) ||
                      (mediaType !== 'text' && !selectedMedia) ||
                      (mediaType === 'audio' && message.trim() && !selectedMedia)
                    }
                  >
                    {sending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Disparar
                      </>
                    )}
                  </GradientButton>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <BottomNav />
    </div>
  );
});

ExtractMembers.displayName = 'ExtractMembers';

export default ExtractMembers;
