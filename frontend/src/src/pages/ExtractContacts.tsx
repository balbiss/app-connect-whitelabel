import { useState, useMemo, useCallback, memo, useRef } from "react";
import { PageHeader } from "@/components/PageHeader";
import { GlassCard } from "@/components/GlassCard";
import { GradientButton } from "@/components/GradientButton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useConnections } from "@/hooks/useConnections";
import { Users, Loader2, Search, Download, Copy, Check, Send, Image, Video, FileText, Mic, X, Settings, MessageSquare, Rocket, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { BottomNav } from "@/components/BottomNav";
import { Skeleton } from "@/components/Skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { whatsappApi, cleanPhoneNumber, translateErrorMessage } from "@/lib/whatsapp-api";
// @ts-ignore
import * as XLSX from 'xlsx';

interface Contact {
  JID: string;
  BusinessName?: string;
  FirstName?: string;
  FullName?: string;
  PushName?: string;
  Found: boolean;
}

type MediaType = 'text' | 'image' | 'video' | 'audio' | 'document';

interface SelectedMedia {
  url: string;
  type: MediaType;
  fileName?: string;
}

const ExtractContacts = memo(() => {
  const { connections, loading: connectionsLoading } = useConnections();
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedJID, setCopiedJID] = useState<string | null>(null);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [showSendModal, setShowSendModal] = useState(false);
  const [message, setMessage] = useState("");
  const [mediaType, setMediaType] = useState<MediaType>("text");
  const [selectedMedia, setSelectedMedia] = useState<SelectedMedia | null>(null);
  
  // Detectar modo desktop
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;
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

  // Buscar contatos
  const handleLoadContacts = useCallback(async () => {
    if (!selectedConnectionId) {
      toast.error("Selecione uma instância primeiro");
      return;
    }

    const connection = onlineConnections.find((c: any) => c.id === selectedConnectionId);
    if (!connection) {
      toast.error("Instância não encontrada");
      return;
    }

    setLoadingContacts(true);
    try {
      const result = await whatsappApi.getContacts(connection.api_instance_token);
      
      if (!result.success || !result.data) {
        toast.error(result.error || "Erro ao carregar contatos");
        setContacts([]);
        return;
      }

      // Converter objeto de contatos em array
      let contactsArray: Contact[] = Object.entries(result.data).map(([jid, contactData]) => ({
        JID: jid,
        BusinessName: contactData.BusinessName || "",
        FirstName: contactData.FirstName || "",
        FullName: contactData.FullName || "",
        PushName: contactData.PushName || "",
        Found: contactData.Found || false,
      }));

      // Converter contatos com @lid para @s.whatsapp.net
      toast.loading("Convertendo números com @lid para JID real...", { id: "converting-lid" });
      
      const contactsToConvert = contactsArray.filter(c => c.JID.includes('@lid'));
      let convertedCount = 0;

      for (const contact of contactsToConvert) {
        try {
          // Extrair número do JID com @lid
          const phoneNumber = contact.JID.split('@')[0];
          
          const lidResult = await whatsappApi.getLID(connection.api_instance_token, phoneNumber);
          
          if (lidResult.success && lidResult.data?.jid) {
            // Atualizar JID para o formato correto
            contact.JID = lidResult.data.jid;
            convertedCount++;
          }
        } catch (error) {
          console.error(`Erro ao converter LID para contato ${contact.JID}:`, error);
          // Manter o JID original se falhar
        }
      }

      toast.dismiss("converting-lid");
      
      // Filtrar apenas contatos com @s.whatsapp.net (JID válido)
      contactsArray = contactsArray.filter(c => c.JID.includes('@s.whatsapp.net'));

      setContacts(contactsArray);
      toast.success(`${contactsArray.length} contato(s) carregado(s) com sucesso!${convertedCount > 0 ? ` ${convertedCount} convertido(s) de @lid.` : ''}`);
    } catch (error) {
      console.error("Erro ao carregar contatos:", error);
      toast.error("Erro ao carregar contatos");
      setContacts([]);
    } finally {
      setLoadingContacts(false);
    }
  }, [selectedConnectionId, onlineConnections]);

  // Filtrar contatos por busca
  const filteredContacts = useMemo(() => {
    if (!searchTerm.trim()) return contacts;
    
    const term = searchTerm.toLowerCase();
    return contacts.filter(contact => {
      const jid = contact.JID.toLowerCase();
      const pushName = (contact.PushName || "").toLowerCase();
      const fullName = (contact.FullName || "").toLowerCase();
      const firstName = (contact.FirstName || "").toLowerCase();
      const businessName = (contact.BusinessName || "").toLowerCase();
      
      return jid.includes(term) || 
             pushName.includes(term) || 
             fullName.includes(term) || 
             firstName.includes(term) ||
             businessName.includes(term);
    });
  }, [contacts, searchTerm]);

  // Toggle seleção de contato
  const toggleContactSelection = useCallback((jid: string) => {
    setSelectedContacts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(jid)) {
        newSet.delete(jid);
      } else {
        newSet.add(jid);
      }
      return newSet;
    });
  }, []);

  // Selecionar todos / Desmarcar todos
  const toggleSelectAll = useCallback(() => {
    if (selectedContacts.size === filteredContacts.length) {
      setSelectedContacts(new Set());
    } else {
      setSelectedContacts(new Set(filteredContacts.map(c => c.JID)));
    }
  }, [selectedContacts.size, filteredContacts]);

  // Abrir modal de envio
  const handleOpenSendModal = useCallback(() => {
    if (selectedContacts.size === 0) {
      toast.error("Selecione pelo menos um contato.");
      return;
    }
    setShowSendModal(true);
  }, [selectedContacts.size]);

  // Processar upload de arquivo
  const handleFileUpload = useCallback(async (file: File, type: 'image' | 'video' | 'document' | 'audio') => {
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        let formattedBase64 = base64;
        
        if (type === 'image') {
          // Converter imagem para JPEG se necessário
          const img = document.createElement('img');
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error('Erro ao carregar imagem'));
            img.src = base64;
          });
          
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            formattedBase64 = canvas.toDataURL('image/jpeg', 0.9);
          }
        }
        
        setSelectedMedia({
          url: formattedBase64,
          type,
          fileName: file.name,
        });
        toast.success("Arquivo carregado com sucesso!");
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      toast.error('Erro ao processar arquivo');
    }
  }, []);

  // Enviar mensagens para contatos selecionados
  const handleSendToContacts = useCallback(async () => {
    if (selectedContacts.size === 0) {
      toast.error("Selecione pelo menos um contato.");
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
    const selectedContactsArray = Array.from(selectedContacts);
    let successCount = 0;
    let errorCount = 0;

    try {
      const { whatsappApi, cleanPhoneNumber } = await import('@/lib/whatsapp-api');
      
      // Verificar números antes de enviar
      toast.loading(
        `Verificando ${selectedContactsArray.length} número(s) no WhatsApp...`, 
        { id: "verifying-contacts" }
      );

      // Extrair números dos JIDs (remover @s.whatsapp.net ou @lid)
      const phoneNumbers = selectedContactsArray.map(jid => {
        // Remover qualquer sufixo (@s.whatsapp.net, @lid, etc.)
        let numberPart = jid;
        if (jid.includes('@')) {
          numberPart = jid.split('@')[0];
        }
        return cleanPhoneNumber(numberPart);
      });

      const checkResult = await whatsappApi.checkUser(
        connection.api_instance_token,
        phoneNumbers
      );

      if (!checkResult.success) {
        toast.dismiss("verifying-contacts");
        toast.error(checkResult.error || "Erro ao verificar números no WhatsApp.");
        setSending(false);
        return;
      }

      // Filtrar apenas números que têm WhatsApp e criar mapa de JIDs
      const validUsers = checkResult.data?.Users?.filter(user => user.IsInWhatsapp === true) || [];
      const jidMap = new Map<string, string>();
      
      validUsers.forEach(user => {
        // Remover qualquer sufixo do Query
        let queryNumber = user.Query;
        if (queryNumber.includes('@')) {
          queryNumber = queryNumber.split('@')[0];
        }
        const normalizedQuery = cleanPhoneNumber(queryNumber);
        jidMap.set(normalizedQuery, user.JID);
      });

      // Filtrar contatos válidos
      const validContacts = selectedContactsArray.filter(jid => {
        // Remover qualquer sufixo do JID
        let numberPart = jid;
        if (jid.includes('@')) {
          numberPart = jid.split('@')[0];
        }
        const normalized = cleanPhoneNumber(numberPart);
        return jidMap.has(normalized);
      });

      if (validContacts.length === 0) {
        toast.dismiss("verifying-contacts");
        toast.error("Nenhum dos contatos selecionados possui WhatsApp.");
        setSending(false);
        return;
      }

      if (validContacts.length < selectedContactsArray.length) {
        const invalidCount = selectedContactsArray.length - validContacts.length;
        toast.warning(`${invalidCount} contato(s) sem WhatsApp foram removidos.`);
      }

      toast.dismiss("verifying-contacts");
      toast.loading(`Enviando para ${validContacts.length} contato(s)...`, { id: "sending-contacts" });
      
      // Enviar para cada contato válido com delay entre envios
      for (let i = 0; i < validContacts.length; i++) {
        const contactJID = validContacts[i];
        const contact = contacts.find(c => c.JID === contactJID);
        
        // Usar o JID retornado pela verificação se disponível
        let numberPart = contactJID;
        if (contactJID.includes('@')) {
          numberPart = contactJID.split('@')[0];
        }
        const normalized = cleanPhoneNumber(numberPart);
        const verifiedJID = jidMap.get(normalized) || contactJID;
        
        try {
          let result;
          
          if (mediaType === 'text') {
            result = await whatsappApi.sendText(
              connection.api_instance_token,
              verifiedJID,
              message
            );
          } else if (mediaType === 'image' && selectedMedia) {
            result = await whatsappApi.sendImage(
              connection.api_instance_token,
              verifiedJID,
              selectedMedia.url,
              message.trim() || undefined
            );
          } else if (mediaType === 'video' && selectedMedia) {
            result = await whatsappApi.sendVideo(
              connection.api_instance_token,
              verifiedJID,
              selectedMedia.url,
              message.trim() || undefined
            );
          } else if (mediaType === 'document' && selectedMedia) {
            result = await whatsappApi.sendDocument(
              connection.api_instance_token,
              verifiedJID,
              selectedMedia.url,
              selectedMedia.fileName || 'documento'
            );
          } else {
            throw new Error('Tipo de mídia inválido');
          }

          if (result.success) {
            successCount++;
            const contactName = contact?.PushName || contact?.FullName || contact?.FirstName || contactJID;
            toast.success(`Enviado para: ${contactName}`, {
              duration: 2000,
            });
          } else {
            errorCount++;
            const contactName = contact?.PushName || contact?.FullName || contact?.FirstName || contactJID;
            toast.error(`Erro ao enviar para ${contactName}`, {
              description: translateErrorMessage(result.error),
              duration: 3000,
            });
          }
        } catch (error) {
          errorCount++;
          const contactName = contact?.PushName || contact?.FullName || contact?.FirstName || contactJID;
          console.error(`Erro ao enviar para contato ${contactJID}:`, error);
          toast.error(`Erro ao enviar para ${contactName}`, {
            duration: 3000,
          });
        }

        // Delay entre envios com intervalo configurável e randomização
        if (i < validContacts.length - 1) {
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

      toast.dismiss("sending-contacts");

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
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error("Erro ao enviar mensagens:", error);
      toast.error("Erro ao enviar mensagens para os contatos.");
    } finally {
      setSending(false);
    }
  }, [selectedContacts, message, mediaType, selectedMedia, selectedConnectionId, onlineConnections, contacts, interval, randomizeTime]);

  // Copiar JID
  const handleCopyJID = useCallback((jid: string) => {
    navigator.clipboard.writeText(jid);
    setCopiedJID(jid);
    toast.success("JID copiado!");
    setTimeout(() => setCopiedJID(null), 2000);
  }, []);

  // Copiar todos os JIDs
  const handleCopyAllJIDs = useCallback(() => {
    if (filteredContacts.length === 0) {
      toast.error("Nenhum contato para copiar");
      return;
    }

    const jids = filteredContacts.map(c => c.JID).join("\n");
    navigator.clipboard.writeText(jids);
    toast.success(`${filteredContacts.length} JID(s) copiado(s)!`);
  }, [filteredContacts]);

  // Exportar para Excel
  const handleExportExcel = useCallback(() => {
    if (filteredContacts.length === 0) {
      toast.error("Nenhum contato para exportar");
      return;
    }

    try {
      const data = filteredContacts.map(contact => ({
        JID: contact.JID,
        "Nome (PushName)": contact.PushName || "",
        "Nome Completo": contact.FullName || "",
        "Primeiro Nome": contact.FirstName || "",
        "Nome do Negócio": contact.BusinessName || "",
        "Encontrado": contact.Found ? "Sim" : "Não",
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Contatos");

      // Ajustar largura das colunas
      const colWidths = [
        { wch: 35 }, // JID
        { wch: 25 }, // PushName
        { wch: 25 }, // FullName
        { wch: 20 }, // FirstName
        { wch: 20 }, // BusinessName
        { wch: 12 }, // Found
      ];
      ws['!cols'] = colWidths;

      const fileName = `contatos_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success(`${filteredContacts.length} contato(s) exportado(s)!`);
    } catch (error) {
      console.error("Erro ao exportar:", error);
      toast.error("Erro ao exportar contatos");
    }
  }, [filteredContacts]);

  return (
    <div className="min-h-screen tech-grid-bg pb-24">
      <PageHeader title="Extrair Contatos" />

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

        {/* Botão para Carregar Contatos */}
        {selectedConnectionId && (
          <GlassCard>
            <GradientButton
              onClick={handleLoadContacts}
              disabled={loadingContacts}
              className="w-full"
            >
              {loadingContacts ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Carregando contatos...
                </>
              ) : (
                <>
                  <Users className="w-4 h-4 mr-2" />
                  Carregar Contatos
                </>
              )}
            </GradientButton>
          </GlassCard>
        )}

        {/* Busca e Ações */}
        {contacts.length > 0 && (
          <>
            <GlassCard>
              <div className="space-y-3">
                {/* Barra de Busca */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Buscar por nome, JID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-bg-input border-border/50 focus:border-accent-purple"
                  />
                </div>

                {/* Botões de Ação */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleCopyAllJIDs}
                    className="flex-1 border-border/50 hover:bg-white/5"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar JIDs
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleExportExcel}
                    className="flex-1 border-border/50 hover:bg-white/5"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Exportar Excel
                  </Button>
                </div>

                {/* Botão Enviar Mensagens */}
                <GradientButton
                  onClick={handleOpenSendModal}
                  disabled={selectedContacts.size === 0}
                  className="w-full"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Enviar para {selectedContacts.size > 0 ? `${selectedContacts.size} contato(s)` : 'Contatos'}
                </GradientButton>

                {/* Selecionar Todos */}
                {filteredContacts.length > 0 && (
                  <div className="flex items-center justify-between">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleSelectAll}
                      className="text-sm"
                    >
                      {selectedContacts.size === filteredContacts.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {selectedContacts.size} selecionado(s)
                    </span>
                  </div>
                )}

                {/* Contador */}
                <div className="text-sm text-muted-foreground text-center">
                  {filteredContacts.length} de {contacts.length} contato(s)
                </div>
              </div>
            </GlassCard>

            {/* Lista de Contatos */}
            <GlassCard>
              <h3 className="text-lg font-bold mb-4">Contatos ({filteredContacts.length})</h3>
              {filteredContacts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum contato encontrado
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {filteredContacts.map((contact) => (
                    <div
                      key={contact.JID}
                      className="p-4 rounded-lg bg-bg-input/50 border border-border/30 hover:border-accent-purple/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <Checkbox
                          checked={selectedContacts.has(contact.JID)}
                          onCheckedChange={() => toggleContactSelection(contact.JID)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          {/* Nome Principal */}
                          <div className="font-semibold text-white mb-1 truncate">
                            {contact.PushName || contact.FullName || contact.FirstName || contact.BusinessName || "Sem nome"}
                          </div>
                          
                          {/* Informações Adicionais */}
                          <div className="space-y-1 text-sm text-muted-foreground">
                            {contact.FullName && contact.FullName !== contact.PushName && (
                              <div>Nome completo: {contact.FullName}</div>
                            )}
                            {contact.BusinessName && (
                              <div>Negócio: {contact.BusinessName}</div>
                            )}
                            <div className="font-mono text-xs break-all">JID: {contact.JID}</div>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-xs ${
                                contact.Found 
                                  ? 'bg-success/20 text-success' 
                                  : 'bg-destructive/20 text-destructive'
                              }`}>
                                {contact.Found ? "Encontrado" : "Não encontrado"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Botão Copiar */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyJID(contact.JID)}
                          className="shrink-0"
                        >
                          {copiedJID === contact.JID ? (
                            <Check className="w-4 h-4 text-success" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          </>
        )}

        {/* Modal para Enviar Mensagem */}
        <Dialog open={showSendModal} onOpenChange={setShowSendModal}>
          <DialogContent className="max-w-md w-full p-0 bg-[hsl(var(--bg-primary))] border-border/50">
            <div className="glass rounded-2xl p-6 space-y-4">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <Rocket className="w-5 h-5 text-accent-purple" />
                  Disparar para {selectedContacts.size} Contato(s)
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  Selecione o tipo de conteúdo e envie para os contatos selecionados
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
                      {mediaType === 'image' ? 'Imagem' : mediaType === 'video' ? 'Vídeo' : 'Documento'}
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        ref={fileInputRef}
                        type="file"
                        accept={
                          mediaType === 'image' ? 'image/jpeg,image/jpg,image/png' :
                          mediaType === 'video' ? 'video/*' :
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
                    {mediaType === 'text' ? 'Mensagem' : 'Legenda'}
                  </Label>
                  <Textarea
                    placeholder={
                      mediaType === 'text' ? 'Digite sua mensagem aqui...' : 'Digite a legenda aqui...'
                    }
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={6}
                    className="bg-bg-input border-border/50 focus:border-accent-purple"
                  />
                </div>

                {/* Configurações Avançadas */}
                <div className="border-t border-border/50 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="w-full flex items-center justify-between font-semibold text-sm mb-3"
                  >
                    <span className="flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      Configurações Avançadas
                    </span>
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
                    onClick={handleSendToContacts}
                    className="flex-1"
                    disabled={
                      sending || 
                      (mediaType === 'text' && !message.trim()) ||
                      (mediaType !== 'text' && !selectedMedia)
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

ExtractContacts.displayName = 'ExtractContacts';

export default ExtractContacts;

