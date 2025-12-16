import { useState, useMemo, useCallback, memo, useRef, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { GlassCard } from "@/components/GlassCard";
import { GradientButton } from "@/components/GradientButton";
import { PhoneMockup } from "@/components/PhoneMockup";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useConnections } from "@/hooks/useConnections";
import { useDisparos } from "@/hooks/useDisparos";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { SubscriptionBlocked } from "@/components/SubscriptionBlocked";
import { List, Sparkles, Calendar as CalendarIcon, BarChart3, Image, Video, FileText, Mic, Plus, Minus, Rocket, X, Crown, Info, ChevronDown, Hash, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { BottomNav } from "@/components/BottomNav";
import { Skeleton } from "@/components/Skeleton";
import { cleanPhoneNumber, formatPhoneWithJID } from "@/lib/whatsapp-api";
// @ts-ignore
import * as XLSX from 'xlsx';

const Create = memo(() => {
  const navigate = useNavigate();
  const { connections, loading: connectionsLoading } = useConnections();
  const { createDisparo } = useDisparos();
  const { hasActiveSubscription, canDisparar, message: subscriptionMessage, isExpired } = useSubscription();
  const { profile, loading: authLoading } = useAuth();

  // Debug: Log do status para verificar o problema
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && profile) {
      console.log('[Create] Status da assinatura:', {
        subscription_status: profile.subscription_status,
        plan: profile.plan,
        hasActiveSubscription,
        canDisparar,
        subscriptionMessage,
      });
    }
  }, [profile, hasActiveSubscription, canDisparar, subscriptionMessage]);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>("");
  const [contacts, setContacts] = useState("");
  const [contactsCount, setContactsCount] = useState(0);
  const [messages, setMessages] = useState<string[]>([""]); // Array de mensagens para variações
  
  // Sincronizar primeira mensagem com o estado message (para compatibilidade)
  const message = messages[0] || "";
  const setMessage = (value: string) => {
    const newMessages = [...messages];
    newMessages[0] = value;
    setMessages(newMessages);
  };
  const [interval, setInterval] = useState(7); // Mínimo recomendado: 7 segundos
  const [alternateMessages, setAlternateMessages] = useState(false);
  const [randomizeTime, setRandomizeTime] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [sendType, setSendType] = useState<'now' | 'schedule'>('now');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<{ url: string; type: 'image' | 'video' | 'document' | 'audio'; fileName?: string } | null>(null);
  const [showImportInstructions, setShowImportInstructions] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const messageTextareaRef = useRef<HTMLTextAreaElement>(null);

  const handleContactsChange = useCallback((value: string) => {
    setContacts(value);
    const lines = value.split('\n').filter(line => line.trim());
    setContactsCount(lines.length);
  }, []);

  const insertVariableAtCursor = useCallback((variable: string) => {
    const textarea = messageTextareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = message;
    const newText = text.substring(0, start) + variable + text.substring(end);
    
    setMessage(newText);
    
    // Restaurar posição do cursor após a variável inserida
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + variable.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [message]);

  const parseContacts = useCallback((contactsText: string): Array<{ name: string; phone: string }> => {
    const lines = contactsText.split('\n').filter(line => line.trim());
    const validContacts: Array<{ name: string; phone: string }> = [];
    
    lines.forEach((line) => {
      // Suporta vírgula ou ponto e vírgula como separador
      const parts = line.split(/[,;]/).map(p => p.trim());
      
      if (parts.length >= 2) {
        // Formato: Nome,Telefone
        // Normalizar telefone para formato WUZAPI (código do país + número, sem +)
        const phone = cleanPhoneNumber(parts[1]);
        if (phone && phone.length >= 10) {
          validContacts.push({
            name: parts[0],
            phone: phone,
          });
        }
      } else if (parts.length === 1) {
        // Apenas telefone
        // Normalizar telefone para formato WUZAPI (código do país + número, sem +)
        const phone = cleanPhoneNumber(parts[0]);
        if (phone && phone.length >= 10) {
          validContacts.push({
            name: '',
            phone: phone,
          });
        }
      }
    });
    
    return validContacts;
  }, []);

  // Carregar contatos pré-preenchidos do localStorage (se vier da página ExtractMembers)
  useEffect(() => {
    const prefilledContacts = localStorage.getItem('prefilledContacts');
    const prefilledConnectionId = localStorage.getItem('prefilledConnectionId');
    
    if (prefilledContacts) {
      setContacts(prefilledContacts);
      setContactsCount(parseContacts(prefilledContacts).length);
      // Limpar após carregar
      localStorage.removeItem('prefilledContacts');
    }
    
    if (prefilledConnectionId) {
      setSelectedConnectionId(prefilledConnectionId);
      // Limpar após carregar
      localStorage.removeItem('prefilledConnectionId');
    }
  }, [parseContacts]);

  // Obter o nome e telefone do primeiro contato da lista para o preview
  const firstContact = useMemo(() => {
    const parsedContacts = parseContacts(contacts);
    const contact = parsedContacts.find(c => c.name && c.name.trim()) || parsedContacts[0];
    return {
      name: contact?.name || "Maria",
      phone: contact?.phone || ""
    };
  }, [contacts, parseContacts]);

  const handleFileImport = useCallback(async (file: File) => {
    const fileName = file.name.toLowerCase();
    let fileContent = '';

    try {
      // Ler arquivo CSV ou TXT
      if (fileName.endsWith('.csv') || fileName.endsWith('.txt')) {
        fileContent = await file.text();
        
        // Processar conteúdo
        const lines = fileContent.split('\n').filter(line => line.trim());
        
        // Ignorar primeira linha se for cabeçalho
        let startIndex = 0;
        if (lines.length > 0) {
          const firstLine = lines[0].toLowerCase();
          if ((firstLine.includes('nome') && firstLine.includes('número')) || 
              (firstLine.includes('name') && firstLine.includes('phone')) ||
              (firstLine.includes('name') && firstLine.includes('number'))) {
            startIndex = 1; // Pular cabeçalho
          }
        }

        // Processar linhas
        const contactsText = lines.slice(startIndex).join('\n');
        const parsedContacts = parseContacts(contactsText);
        
        // Atualizar estado
        const contactsString = parsedContacts.map(c => 
          c.name ? `${c.name},${c.phone}` : c.phone
        ).join('\n');
        
        setContacts(contactsString);
        setContactsCount(parsedContacts.length);
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        // Processar arquivo Excel usando SheetJS (xlsx)
        try {
          // Ler o arquivo como ArrayBuffer
          const arrayBuffer = await file.arrayBuffer();
          
          // Converter para workbook
          const workbook = XLSX.read(arrayBuffer, { type: 'array' });
          
          // Pegar a primeira planilha
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          // Converter para JSON (array de objetos)
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
          
          // Processar dados
          const lines: string[] = [];
          
          // Ignorar primeira linha se for cabeçalho
          let startIndex = 0;
          if (jsonData.length > 0) {
            const firstRow = jsonData[0] as any[];
            const firstRowText = firstRow.map(cell => String(cell || '').toLowerCase()).join(' ');
            if (firstRowText.includes('nome') && (firstRowText.includes('número') || firstRowText.includes('numero') || firstRowText.includes('phone') || firstRowText.includes('number'))) {
              startIndex = 1; // Pular cabeçalho
            }
          }
          
          // Converter linhas para formato CSV
          for (let i = startIndex; i < jsonData.length; i++) {
            const row = jsonData[i] as any[];
            if (row && row.length > 0) {
              // Pegar primeira e segunda coluna (Nome e Número)
              const name = String(row[0] || '').trim();
              const phone = String(row[1] || '').trim();
              
              if (phone) {
                // Se tiver nome e número, usar formato "Nome,Número"
                // Se tiver apenas número, usar apenas o número
                if (name) {
                  lines.push(`${name},${phone}`);
                } else {
                  lines.push(phone);
                }
              }
            }
          }
          
          // Processar linhas
          const contactsText = lines.join('\n');
          const parsedContacts = parseContacts(contactsText);
          
          // Atualizar estado
          const contactsString = parsedContacts.map(c => 
            c.name ? `${c.name},${c.phone}` : c.phone
          ).join('\n');
          
          setContacts(contactsString);
          setContactsCount(parsedContacts.length);
        } catch (error: any) {
          console.error('Erro ao processar arquivo Excel:', error);
          toast.error('Erro ao processar arquivo Excel. Verifique se o arquivo está no formato correto.');
          throw new Error('Erro ao processar arquivo Excel. Certifique-se de que a primeira coluna é Nome e a segunda é Número.');
        }
      } else {
        throw new Error('Formato de arquivo não suportado. Use CSV, TXT ou XLSX.');
      }
    } catch (error: any) {
      console.error('Erro ao processar arquivo:', error);
      throw error;
    }
  }, [parseContacts]);

  const handleFileUpload = useCallback(async (file: File, type: 'image' | 'video' | 'document' | 'audio') => {
    try {
      // Converter arquivo para base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        
        // Garantir formato correto com prefixo data:
        let formattedBase64 = base64;
        
        if (type === 'image') {
          const mimeType = file.type || 'image/jpeg';
          
          // Validar formato - WUZAPI suporta apenas JPEG e PNG
          const normalizedMimeType = mimeType.toLowerCase();
          const isSupportedFormat = normalizedMimeType === 'image/jpeg' || 
                                    normalizedMimeType === 'image/jpg' || 
                                    normalizedMimeType === 'image/png';
          
          if (!isSupportedFormat) {
            // Converter para JPEG se não for formato suportado
            try {
              const img = document.createElement('img');
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              
              if (!ctx) {
                throw new Error('Canvas não disponível');
              }
              
              // Converter base64 para blob
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
                  
                  // Converter para JPEG (qualidade 0.9)
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
              
              toast.info('Imagem convertida para JPEG (formato original não suportado)');
            } catch (conversionError) {
              console.error('Erro ao converter imagem:', conversionError);
              toast.error('Erro ao converter imagem. Use apenas JPEG ou PNG.');
              return;
            }
          } else {
            // Se já for formato suportado, garantir prefixo correto
            if (!base64.startsWith('data:')) {
              const normalizedType = normalizedMimeType === 'image/jpg' ? 'image/jpeg' : normalizedMimeType;
              formattedBase64 = `data:${normalizedType};base64,${base64.split(',')[1] || base64}`;
            } else {
              // Normalizar jpg para jpeg no data URL
              formattedBase64 = base64.replace(/^data:image\/jpg;/, 'data:image/jpeg;');
            }
          }
        } else if (type === 'video') {
          const mimeType = file.type || 'video/mp4';
          if (!base64.startsWith('data:')) {
            formattedBase64 = `data:${mimeType};base64,${base64.split(',')[1] || base64}`;
          }
        } else if (type === 'document') {
          // IMPORTANTE: Documentos sempre usam application/octet-stream
          const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
          formattedBase64 = `data:application/octet-stream;base64,${base64Data}`;
        } else if (type === 'audio') {
          // IMPORTANTE: Áudio deve estar em formato opus (audio/ogg)
          const mimeType = file.type || 'audio/ogg';
          if (!base64.startsWith('data:')) {
            formattedBase64 = `data:${mimeType};base64,${base64.split(',')[1] || base64}`;
          } else {
            // Garantir que seja audio/ogg
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

  const handleStartCampaign = useCallback(async () => {
    // Verificar se tem assinatura ativa
    if (!hasActiveSubscription || !canDisparar) {
      toast.error(subscriptionMessage || "Você precisa de uma assinatura ativa para criar campanhas.");
      setTimeout(() => {
        // Planos ocultos - redirecionar para dashboard
        navigate("/");
        toast.info("Entre em contato com o suporte para informações sobre planos.");
      }, 2000);
      return;
    }

    if (!selectedConnectionId) {
      toast.error("Selecione uma instância");
      return;
    }
    if (contactsCount === 0) {
      toast.error("Adicione pelo menos um contato");
      return;
    }
    if (!message.trim()) {
      toast.error("Escreva uma mensagem");
      return;
    }

    // Validar agendamento se selecionado
    if (sendType === 'schedule') {
      if (!scheduleDate || !scheduleTime) {
        toast.error("Preencha a data e hora do agendamento");
        return;
      }
      
      // Validar usando horário de Brasília
      const [year, month, day] = scheduleDate.split('-').map(Number);
      const [hours, minutes] = scheduleTime.split(':').map(Number);
      const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00-03:00`;
      const scheduleDateTime = new Date(dateString);
      const nowUTC = new Date();
      
      if (scheduleDateTime <= nowUTC) {
        toast.error("A data e hora do agendamento devem ser no futuro");
        return;
      }
    }

    // Ativar loading imediatamente
    setIsCreating(true);
    
    // Parsear contatos uma única vez
    const parsedRecipients = parseContacts(contacts);
    
    if (parsedRecipients.length === 0) {
      toast.error("Nenhum contato válido encontrado. Verifique se os números estão no formato correto (12 dígitos: 55 + DDD + número). Exemplo: 551982724395");
      setIsCreating(false);
      return;
    }

    // Feedback visual imediato
    toast.loading(
      `Verificando ${parsedRecipients.length} número(s) no WhatsApp...`, 
      { id: "creating-campaign", duration: Infinity }
    );

    try {
      // Verificar quais números têm WhatsApp
      const connection = connections.find((c: any) => c.id === selectedConnectionId);
      if (!connection) {
        toast.dismiss("creating-campaign");
        toast.error("Conexão não encontrada.");
        setIsCreating(false);
        return;
      }

      const { whatsappApi } = await import('@/lib/whatsapp-api');
      const phoneNumbers = parsedRecipients.map(r => r.phone);
      
      // Otimização: Verificar em lotes menores para evitar timeout
      const BATCH_SIZE = 50; // Verificar 50 números por vez
      const totalBatches = Math.ceil(phoneNumbers.length / BATCH_SIZE);
      const allValidUsers: Array<{ IsInWhatsapp: boolean; JID: string; Query: string; VerifiedName?: string }> = [];
      
      // Se houver muitos números, verificar em lotes com progresso
      if (phoneNumbers.length > BATCH_SIZE) {
        toast.loading(
          `Verificando números em lotes (0/${totalBatches})...`, 
          { id: "creating-campaign", duration: Infinity }
        );

        for (let i = 0; i < phoneNumbers.length; i += BATCH_SIZE) {
          const batch = phoneNumbers.slice(i, i + BATCH_SIZE);
          const currentBatch = Math.floor(i / BATCH_SIZE) + 1;
          
          // Atualizar progresso
          toast.loading(
            `Verificando lote ${currentBatch}/${totalBatches} (${batch.length} números)...`, 
            { id: "creating-campaign", duration: Infinity }
          );

          try {
            const checkResult = await whatsappApi.checkUser(
              connection.api_instance_token,
              batch
            );

            if (checkResult.success && checkResult.data?.Users) {
              // Adicionar usuários válidos ao array total
              allValidUsers.push(...checkResult.data.Users);
            } else if (!checkResult.success && currentBatch === 1) {
              // Se o primeiro lote falhar, mostrar erro
              toast.dismiss("creating-campaign");
              toast.error(checkResult.error || "Erro ao verificar números no WhatsApp.");
              setIsCreating(false);
              return;
            }
            // Se outros lotes falharem, continuar (não bloquear)
            
            // Pequeno delay entre lotes para não sobrecarregar
            if (i + BATCH_SIZE < phoneNumbers.length) {
              await new Promise(resolve => setTimeout(resolve, 200));
            }
          } catch (error) {
            console.error(`Erro ao verificar lote ${currentBatch}:`, error);
            // Continuar com próximos lotes mesmo se um falhar
            if (currentBatch === 1) {
              toast.dismiss("creating-campaign");
              toast.error("Erro ao verificar números. Tente novamente.");
              setIsCreating(false);
              return;
            }
          }
        }
      } else {
        // Se houver poucos números, verificar todos de uma vez (comportamento original)
        toast.loading(
          `Verificando ${phoneNumbers.length} número(s) no WhatsApp...`, 
          { id: "creating-campaign", duration: Infinity }
        );

        const checkResult = await whatsappApi.checkUser(
          connection.api_instance_token,
          phoneNumbers
        );

        if (!checkResult.success) {
          toast.dismiss("creating-campaign");
          toast.error(checkResult.error || "Erro ao verificar números no WhatsApp.");
          setIsCreating(false);
          return;
        }

        if (checkResult.data?.Users) {
          allValidUsers.push(...checkResult.data.Users);
        }
      }

      // Filtrar apenas números que têm WhatsApp
      const validUsers = allValidUsers.filter(user => user.IsInWhatsapp === true);
      const jidMap = new Map<string, string>();
      
      // Criar mapa: número normalizado (sem @s.whatsapp.net) -> JID completo
      validUsers.forEach(user => {
        // O JID vem no formato "5491155553934@s.whatsapp.net"
        // O Query pode vir com ou sem o sufixo @s.whatsapp.net
        if (user.JID) {
          // Extrair número do JID (remover @s.whatsapp.net)
          const jidNumber = user.JID.replace('@s.whatsapp.net', '');
          const jidNumberNormalized = cleanPhoneNumber(jidNumber);
          
          // Normalizar o Query (pode vir com ou sem sufixo)
          const queryClean = user.Query.replace('@s.whatsapp.net', '');
          const queryNumberNormalized = cleanPhoneNumber(queryClean);
          
          // Mapear ambos (Query normalizado e número do JID normalizado) para o JID completo
          jidMap.set(queryNumberNormalized, user.JID);
          jidMap.set(jidNumberNormalized, user.JID);
        }
      });

      // Criar recipients apenas com números que têm WhatsApp
      const recipients = parsedRecipients
        .filter(recipient => {
          // Verificar se o número tem WhatsApp (usando o número normalizado)
          const normalizedPhone = cleanPhoneNumber(recipient.phone);
          
          return validUsers.some(user => {
            // Extrair números para comparação
            const userQuery = cleanPhoneNumber(user.Query.replace('@s.whatsapp.net', ''));
            const userJIDNumber = user.JID ? cleanPhoneNumber(user.JID.replace('@s.whatsapp.net', '')) : '';
            
            // Comparar números normalizados
            return userQuery === normalizedPhone || userJIDNumber === normalizedPhone;
          });
        })
        .map(recipient => {
          // Usar JID se disponível, senão usar o número normalizado com sufixo
          const normalizedPhone = cleanPhoneNumber(recipient.phone);
          // Buscar JID pelo número normalizado
          const jid = jidMap.get(normalizedPhone);
          
          return {
            name: recipient.name,
            phone: jid || formatPhoneWithJID(normalizedPhone), // Usar JID retornado pela API se disponível
          };
        });

      if (recipients.length === 0) {
        toast.dismiss("creating-campaign");
        if (allValidUsers.length === 0 && phoneNumbers.length > BATCH_SIZE) {
          toast.error(`Erro ao verificar números. Alguns lotes podem ter falhado. Tente novamente ou verifique se a instância está online.`);
        } else {
          toast.error(`Nenhum dos ${parsedRecipients.length} número(s) possui WhatsApp. Verifique os números e tente novamente.`);
        }
        setIsCreating(false);
        return;
      }

      // Avisar se alguns números foram filtrados
      if (recipients.length < parsedRecipients.length) {
        const invalidCount = parsedRecipients.length - recipients.length;
        toast.info(`${invalidCount} número(s) sem WhatsApp foram removidos. ${recipients.length} número(s) válido(s) serão enviados.`, {
          duration: 5000,
        });
      }

      toast.loading(
        `Criando campanha com ${recipients.length} número(s) válido(s)...`, 
        { id: "creating-campaign", duration: Infinity }
      );

      const campaignName = `Campanha ${new Date().toLocaleDateString('pt-BR')}`;
      // Filtrar mensagens vazias e usar apenas as que têm conteúdo
      const messageVariations = messages.filter(msg => msg.trim() !== '');
      
      if (messageVariations.length === 0) {
        toast.dismiss("creating-campaign");
        toast.error("Adicione pelo menos uma mensagem");
        setIsCreating(false);
        return;
      }
      
      // Delay mínimo: 7 segundos (recomendado para evitar banimento)
      // Delay máximo: intervalo + randomização (se ativado)
      const delayMin = Math.max(7000, interval * 1000); // Mínimo 7 segundos
      const delayMax = randomizeTime 
        ? delayMin + Math.floor(Math.random() * 6000) + 3000 // Randomização entre 3-9 segundos adicionais
        : delayMin;

      // Calcular scheduledAt se for agendado
      let scheduledAt: string | null = null;
      if (sendType === 'schedule' && scheduleDate && scheduleTime) {
        // Criar data no timezone do Brasil (America/Sao_Paulo = UTC-3)
        // Formato: YYYY-MM-DD e HH:mm
        const [year, month, day] = scheduleDate.split('-').map(Number);
        const [hours, minutes] = scheduleTime.split(':').map(Number);
        
        // Criar string no formato ISO com timezone do Brasil
        // Especificar explicitamente o timezone -03:00 (horário de Brasília)
        const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00-03:00`;
        
        // Criar data assumindo que é horário de Brasília (UTC-3)
        const brasiliaDate = new Date(dateString);
        
        // Validar se a data/hora não é no passado
        // Comparar com o horário atual em UTC (que é o que o Supabase usa)
        const nowUTC = new Date();
        if (brasiliaDate <= nowUTC) {
          toast.error('A data e hora do agendamento devem ser no futuro');
          setIsCreating(false);
          return;
        }
        
        // Converter para ISO (UTC) - o Supabase armazena em UTC
        scheduledAt = brasiliaDate.toISOString();
        
        console.log('📅 Agendamento:', {
          input: `${scheduleDate} ${scheduleTime} (Brasília)`,
          brasiliaISO: dateString,
          utcISO: scheduledAt,
          agoraUTC: nowUTC.toISOString()
        });
      }

      const createdDisparo = await createDisparo(
        selectedConnectionId,
        campaignName,
        messageVariations,
        recipients,
        delayMin,
        delayMax,
        selectedMedia ? { url: selectedMedia.url, type: selectedMedia.type } : undefined,
        scheduledAt
      );

      // Fechar toast de loading e mostrar sucesso
      toast.dismiss("creating-campaign");
      if (scheduledAt) {
        toast.success("📅 Campanha agendada com sucesso!");
      } else {
        toast.success("🚀 Campanha criada e iniciada com sucesso!");
      }
      
      // Navegar após um breve delay
      setTimeout(() => {
        navigate("/campaigns");
      }, 1000);
    } catch (error) {
      console.error("Erro ao criar campanha:", error);
      toast.dismiss("creating-campaign");
      
      // Mensagem de erro mais específica
      const errorMessage = error instanceof Error ? error.message : "Erro ao criar campanha";
      if (errorMessage.includes('timeout') || errorMessage.includes('57014')) {
        toast.error("Timeout ao criar campanha. A campanha pode ter sido criada parcialmente. Verifique na página de campanhas.");
      } else {
        toast.error(errorMessage);
      }
    } finally {
      // Sempre desativar loading, mesmo em caso de erro
      setIsCreating(false);
    }
  }, [selectedConnectionId, contacts, contactsCount, message, messages, interval, randomizeTime, selectedMedia, hasActiveSubscription, canDisparar, subscriptionMessage, navigate, createDisparo, parseContacts]);

  // Memoizar conexões online
  const onlineConnections = useMemo(() => {
    if (!connections || !Array.isArray(connections)) return [];
    return connections.filter((conn: any) => conn.status === 'online');
  }, [connections]);

  // Detectar modo desktop
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;

  return (
    <div className="min-h-screen bg-[hsl(var(--bg-primary))] pb-24">
      <PageHeader title="Novo Disparo" showBack />

      <div className={`${isDesktop ? 'max-w-5xl' : 'max-w-lg'} mx-auto px-4 sm:px-6 ${isDesktop ? 'space-y-3' : 'space-y-4 sm:space-y-5'}`}>
        {/* Bloqueio se assinatura expirou */}
        {isExpired ? (
          <SubscriptionBlocked />
        ) : (
          <>
            {/* Aviso de Assinatura Necessária ou Limite Diário - Compacto */}
            {(!hasActiveSubscription || !canDisparar) && subscriptionMessage && (
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border border-warning/50 bg-warning/10 animate-slide-up ${
            !canDisparar && subscriptionMessage.includes('atingiu o limite') 
              ? 'border-warning/50 bg-warning/10' 
              : 'border-warning/50 bg-warning/10'
          }`}>
            <Crown className="w-3.5 h-3.5 text-warning flex-shrink-0" />
            <p className="text-xs text-warning flex-1">
              {subscriptionMessage.includes('atingiu o limite') ? 'Limite diário atingido' : 'Assinatura necessária para disparar'}
            </p>
            {!subscriptionMessage.includes('atingiu o limite') && (
              <GradientButton
                onClick={() => navigate("/plans")}
                size="sm"
                className="h-6 px-2.5 text-xs"
              >
                Ver Planos
              </GradientButton>
            )}
          </div>
        )}

        {/* Quick Actions - Compacto */}
        <div className={`grid ${isDesktop ? 'grid-cols-2 gap-2' : 'grid-cols-2 gap-3 sm:gap-4'}`}>
          <button 
            onClick={() => navigate("/lista")}
            className={`group relative glass rounded-lg ${isDesktop ? 'p-2.5' : 'p-4'} flex flex-col items-center gap-1 overflow-hidden transition-all duration-300 cursor-pointer hover:scale-[1.02] hover:shadow-lg hover:shadow-accent-purple/20 border border-transparent hover:border-accent-purple/30`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-accent-purple/10 to-accent-purple/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative z-10">
              <div className={`${isDesktop ? 'w-7 h-7' : 'w-10 h-10'} rounded-lg bg-gradient-to-br from-accent-purple to-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 group-hover:rotate-3`}>
                <List className={`${isDesktop ? 'w-3.5 h-3.5' : 'w-5 h-5'} text-white`} />
              </div>
              <span className={`${isDesktop ? 'text-[10px]' : 'text-xs'} font-medium text-foreground group-hover:text-accent-purple transition-colors duration-300`}>Lista</span>
            </div>
          </button>
          <button 
            onClick={() => navigate("/analytics")}
            className={`group relative glass rounded-lg ${isDesktop ? 'p-2.5' : 'p-4'} flex flex-col items-center gap-1 overflow-hidden transition-all duration-300 cursor-pointer hover:scale-[1.02] hover:shadow-lg hover:shadow-blue-500/20 border border-transparent hover:border-blue-500/30`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative z-10">
              <div className={`${isDesktop ? 'w-7 h-7' : 'w-10 h-10'} rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 group-hover:rotate-3`}>
                <BarChart3 className={`${isDesktop ? 'w-3.5 h-3.5' : 'w-5 h-5'} text-white`} />
              </div>
              <span className={`${isDesktop ? 'text-[10px]' : 'text-xs'} font-medium text-foreground group-hover:text-blue-400 transition-colors duration-300`}>Stats</span>
            </div>
          </button>
        </div>

        {/* Layout Desktop: 2 Colunas */}
        {isDesktop ? (
          <div className="grid grid-cols-2 gap-3">
            {/* Coluna Esquerda */}
            <div className="space-y-3">
              {/* Instância */}
              <GlassCard className="p-3">
                <Label className="text-xs font-semibold mb-1.5 block">Instância</Label>
                {connectionsLoading ? (
                  <Skeleton className="h-9 w-full" />
                ) : (
                  <>
                    <Select
                      value={selectedConnectionId}
                      onValueChange={setSelectedConnectionId}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Selecione uma instância" />
                      </SelectTrigger>
                      <SelectContent>
                        {onlineConnections.map((connection) => (
                          <SelectItem key={connection.id} value={connection.id}>
                            {connection.name} {connection.phone ? `(${connection.phone})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {onlineConnections.length === 0 && !connectionsLoading && (
                      <p className="text-[10px] text-warning mt-1">
                        Nenhuma instância online. Conecte uma instância primeiro.
                      </p>
                    )}
                  </>
                )}
              </GlassCard>

              {/* Contatos */}
              <GlassCard className="p-3">
                <div className="space-y-2.5">
                  {/* Instruções de Importação */}
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2 space-y-1.5">
                    <button
                      onClick={() => setShowImportInstructions(!showImportInstructions)}
                      className="w-full flex items-center justify-between font-semibold text-[11px]"
                    >
                      <span className="flex items-center gap-1">
                        <Info className="w-3 h-3 text-blue-400" />
                        Como importar lista?
                      </span>
                      <ChevronDown className={`w-3 h-3 transition-transform ${showImportInstructions ? 'rotate-180' : ''}`} />
                    </button>
              
                    {showImportInstructions && (
                      <div className="space-y-1.5 text-[10px] text-muted-foreground pt-1.5 border-t border-blue-500/20">
                        <div>
                          <p className="font-medium text-foreground mb-0.5">📋 Formato: CSV ou TXT</p>
                          <p className="text-[10px]">Nome,Número (ex: Maria,5511999999999)</p>
                        </div>
                        <div>
                          <p className="font-medium text-foreground mb-0.5">📱 Número: Com código do país</p>
                          <p className="text-[10px]">Sem +, espaços ou traços (ex: 5511999999999)</p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="text-xs font-semibold mb-1.5 flex items-center gap-1">
                      📱 Importar Lista
                    </h3>
                    <Button 
                      variant="outline" 
                      className="w-full h-8 text-[11px]"
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = '.csv,.txt,.xlsx';
                        input.onchange = async (e: any) => {
                          const file = e.target.files[0];
                          if (file) {
                            try {
                              await handleFileImport(file);
                              toast.success(`Arquivo ${file.name} importado com sucesso! ${contactsCount} contatos adicionados.`);
                            } catch (error: any) {
                              toast.error(`Erro ao importar arquivo: ${error.message}`);
                              console.error('Erro ao importar arquivo:', error);
                            }
                          }
                        };
                        input.click();
                      }}
                    >
                      Escolher Arquivo
                    </Button>
                    {contactsCount > 0 && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        ✓ {contactsCount} contatos importados
                      </p>
                    )}
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-[9px] uppercase">
                      <span className="bg-[hsl(var(--bg-card))] px-2 text-muted-foreground">- OU -</span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold mb-1.5 flex items-center gap-1">
                      ✍️ Adicionar Manual
                    </h3>
                    <Textarea
                      placeholder="Nome,Número&#10;Maria,5511999999999"
                      value={contacts}
                      onChange={(e) => handleContactsChange(e.target.value)}
                      rows={3}
                      className="bg-[hsl(var(--bg-input))] text-xs"
                    />
                    <Badge variant="secondary" className="mt-1 text-[10px]">
                      ✓ {contactsCount} contatos adicionados
                    </Badge>
                  </div>

                  {/* Lista de Contatos Importados */}
                  {contactsCount > 0 && (
                    <div className="mt-2 space-y-1.5">
                      <h4 className="font-semibold text-[11px] flex items-center gap-1">
                        📋 Contatos Importados ({contactsCount})
                      </h4>
                      <div className="max-h-32 overflow-y-auto space-y-1 bg-[hsl(var(--bg-input))] rounded-lg p-1.5 border border-border">
                        {parseContacts(contacts).slice(0, 5).map((contact, index) => (
                          <div 
                            key={index}
                            className="flex items-center justify-between p-1 bg-[hsl(var(--bg-card))] rounded border border-border/50 hover:border-accent-purple/30 transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-[11px] text-foreground truncate">
                                {contact.name || <span className="text-muted-foreground italic">Sem nome</span>}
                              </div>
                              <div className="text-[9px] text-muted-foreground font-mono">
                                {contact.phone}
                              </div>
                            </div>
                            <Badge variant="outline" className="ml-2 shrink-0 text-[9px] px-1 py-0">
                              {index + 1}
                            </Badge>
                          </div>
                        ))}
                        {contactsCount > 5 && (
                          <p className="text-[9px] text-muted-foreground text-center pt-0.5">
                            +{contactsCount - 5} contatos adicionais
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </GlassCard>
            </div>

            {/* Coluna Direita */}
            <div className="space-y-3">
              {/* Mensagens */}
              <GlassCard className="p-3">
                <h3 className="text-xs font-semibold mb-1.5 flex items-center gap-1">
                  💬 Mensagem 1
                </h3>
                <Textarea
                  ref={messageTextareaRef}
                  placeholder="Olá {{nome}}! 👋&#10;&#10;Como vai?"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  className="bg-[hsl(var(--bg-input))] mb-2 text-xs"
                />

                <div className="flex gap-1 mb-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="h-7 w-7 p-0"
                        title="Inserir variável"
                      >
                        <Hash className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      <DropdownMenuItem
                        onClick={() => insertVariableAtCursor('{{nome}}')}
                        className="flex items-center justify-between"
                      >
                        <span className="font-mono text-xs">{'{{nome}}'}</span>
                        <span className="ml-2 text-xs text-muted-foreground">Nome</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => insertVariableAtCursor('{{numero}}')}
                        className="flex items-center justify-between"
                      >
                        <span className="font-mono text-xs">{'{{numero}}'}</span>
                        <span className="ml-2 text-xs text-muted-foreground">Número</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => insertVariableAtCursor('{{data}}')}
                        className="flex items-center justify-between"
                      >
                        <span className="font-mono text-xs">{'{{data}}'}</span>
                        <span className="ml-2 text-xs text-muted-foreground">Data</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => insertVariableAtCursor('{{hora}}')}
                        className="flex items-center justify-between"
                      >
                        <span className="font-mono text-xs">{'{{hora}}'}</span>
                        <span className="ml-2 text-xs text-muted-foreground">Hora</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.onchange = (e: any) => {
                        const file = e.target.files[0];
                        if (file) handleFileUpload(file, 'image');
                      };
                      input.click();
                    }}
                  >
                    <Image className="w-3 h-3" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'video/*';
                      input.onchange = (e: any) => {
                        const file = e.target.files[0];
                        if (file) handleFileUpload(file, 'video');
                      };
                      input.click();
                    }}
                  >
                    <Video className="w-3 h-3" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = '.pdf,.doc,.docx,.txt';
                      input.onchange = (e: any) => {
                        const file = e.target.files[0];
                        if (file) handleFileUpload(file, 'document');
                      };
                      input.click();
                    }}
                  >
                    <FileText className="w-3 h-3" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'audio/*';
                      input.onchange = (e: any) => {
                        const file = e.target.files[0];
                        if (file) handleFileUpload(file, 'audio');
                      };
                      input.click();
                    }}
                  >
                    <Mic className="w-3 h-3" />
                  </Button>
                </div>

                {selectedMedia && (
                  <div className="mb-2 p-1.5 glass rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {selectedMedia.type === 'image' && <Image className="w-3 h-3" />}
                      {selectedMedia.type === 'video' && <Video className="w-3 h-3" />}
                      {selectedMedia.type === 'document' && <FileText className="w-3 h-3" />}
                      {selectedMedia.type === 'audio' && <Mic className="w-3 h-3" />}
                      <span className="text-[11px]">{selectedMedia.fileName || 'Arquivo anexado'}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedMedia(null)}
                      className="h-4 w-4 p-0"
                    >
                      <X className="w-2.5 h-2.5" />
                    </Button>
                  </div>
                )}

                <PhoneMockup message={message} recipientName={firstContact.name} recipientPhone={firstContact.phone} className="mb-2 scale-90 origin-top-left" />

                {/* Mensagens adicionais */}
                {messages.slice(1).map((msg, index) => (
                  <div key={index + 1} className="mb-2 space-y-1.5">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-[11px] flex items-center gap-1">
                        💬 Mensagem {index + 2}
                      </h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newMessages = messages.filter((_, i) => i !== index + 1);
                          setMessages(newMessages);
                        }}
                        className="h-4 w-4 p-0 text-destructive"
                      >
                        <X className="w-2.5 h-2.5" />
                      </Button>
                    </div>
                    <Textarea
                      placeholder={`Mensagem ${index + 2}...`}
                      value={msg}
                      onChange={(e) => {
                        const newMessages = [...messages];
                        newMessages[index + 1] = e.target.value;
                        setMessages(newMessages);
                      }}
                      rows={2}
                      className="bg-[hsl(var(--bg-input))] text-xs"
                    />
                  </div>
                ))}

                {messages.length < 5 && (
                  <Button 
                    variant="ghost" 
                    className="w-full h-7" 
                    size="sm"
                    onClick={() => {
                      setMessages([...messages, ""]);
                    }}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    <span className="text-[11px]">Adicionar Mensagem {messages.length + 1}</span>
                  </Button>
                )}
                
                {messages.length >= 5 && (
                  <p className="text-[9px] text-muted-foreground text-center">
                    Máximo de 5 mensagens por campanha
                  </p>
                )}
              </GlassCard>

              {/* Configurações Avançadas e Agendar - Lado a lado no desktop */}
              <div className="grid grid-cols-2 gap-3">
                {/* Configurações Avançadas */}
                <GlassCard className="p-3">
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="w-full flex items-center justify-between text-xs font-semibold"
                  >
                    <span className="flex items-center gap-1">⚙️ Avançado</span>
                    <span>{showAdvanced ? '−' : '+'}</span>
                  </button>

                  {showAdvanced && (
                    <div className="mt-2 space-y-1.5">
                      <div>
                        <Label className="text-[10px] mb-1 block">Intervalo (segundos)</Label>
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => setInterval(Math.max(7, interval - 1))}
                          >
                            <Minus className="w-2.5 h-2.5" />
                          </Button>
                          <span className="text-sm font-bold w-10 text-center">{interval}s</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => setInterval(Math.min(60, interval + 1))}
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </Button>
                        </div>
                        <p className="text-[9px] text-muted-foreground mt-0.5 text-center">
                          Mínimo: 7s
                        </p>
                      </div>

                      {messages.filter(m => m.trim() !== '').length > 1 && (
                        <div className="flex items-center space-x-1">
                          <Checkbox
                            id="alternate"
                            checked={alternateMessages}
                            onCheckedChange={(checked) => setAlternateMessages(checked as boolean)}
                            className="h-3 w-3"
                          />
                          <label htmlFor="alternate" className="text-[11px] cursor-pointer">
                            Alternar mensagens
                          </label>
                        </div>
                      )}

                      <div className="flex items-center space-x-1">
                        <Checkbox
                          id="randomize"
                          checked={randomizeTime}
                          onCheckedChange={(checked) => setRandomizeTime(checked as boolean)}
                          className="h-3 w-3"
                        />
                        <label htmlFor="randomize" className="text-[11px] cursor-pointer">
                          Randomizar tempo
                        </label>
                      </div>
                    </div>
                  )}
                </GlassCard>

                {/* Agendar - Desktop */}
                <GlassCard className="p-3">
                  <h3 className="text-xs font-semibold mb-2 flex items-center gap-1">
                    <CalendarIcon className="w-3 h-3" />
                    Agendar
                  </h3>
                  <RadioGroup value={sendType} onValueChange={(value) => setSendType(value as 'now' | 'schedule')}>
                    <div className="flex items-center space-x-1 mb-1">
                      <RadioGroupItem value="now" id="now-desktop" className="h-3 w-3" />
                      <Label htmlFor="now-desktop" className="cursor-pointer text-[11px]">Enviar agora</Label>
                    </div>
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="schedule" id="schedule-desktop" className="h-3 w-3" />
                      <Label htmlFor="schedule-desktop" className="cursor-pointer text-[11px]">Agendar</Label>
                    </div>
                  </RadioGroup>

                  {sendType === "schedule" && (
                    <div className="mt-2 space-y-1.5">
                      <div>
                        <Label className="text-[10px] mb-0.5 block">Data</Label>
                        <Input 
                          type="date" 
                          className="bg-[hsl(var(--bg-input))] h-7 text-[11px]"
                          min={new Date().toISOString().split('T')[0]}
                          value={scheduleDate}
                          onChange={(e) => setScheduleDate(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] mb-0.5 block">Hora (Brasília)</Label>
                        <Input 
                          type="time" 
                          className="bg-[hsl(var(--bg-input))] h-7 text-[11px]"
                          value={scheduleTime}
                          onChange={(e) => setScheduleTime(e.target.value)}
                        />
                      </div>
                      {scheduleDate && scheduleTime && (
                        <p className="text-[9px] text-muted-foreground">
                          {new Date(`${scheduleDate}T${scheduleTime}`).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      )}
                    </div>
                  )}
                </GlassCard>
              </div>
            </div>
          </div>
        ) : (
            <>
              {/* Layout Mobile */}
              {/* Instância */}
              <GlassCard>
                <Label className="text-sm font-semibold mb-3 block">Instância</Label>
                {connectionsLoading ? (
                  <Skeleton className="h-12 w-full" />
                ) : (
                  <>
                    <Select
                      value={selectedConnectionId}
                      onValueChange={setSelectedConnectionId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma instância" />
                      </SelectTrigger>
                      <SelectContent>
                        {onlineConnections.map((connection) => (
                          <SelectItem key={connection.id} value={connection.id}>
                            {connection.name} {connection.phone ? `(${connection.phone})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {onlineConnections.length === 0 && !connectionsLoading && (
                      <p className="text-xs text-warning mt-2">
                        Nenhuma instância online. Conecte uma instância primeiro.
                      </p>
                    )}
                  </>
                )}
              </GlassCard>

              {/* Contatos - Mobile */}
              <GlassCard>
                <div className="space-y-4">
                  {/* Instruções de Importação */}
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 space-y-3">
                    <button
                      onClick={() => setShowImportInstructions(!showImportInstructions)}
                      className="w-full flex items-center justify-between font-semibold text-sm"
                    >
                      <span className="flex items-center gap-2">
                        <Info className="w-4 h-4 text-blue-400" />
                        Como importar lista?
                      </span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${showImportInstructions ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {showImportInstructions && (
                      <div className="space-y-3 text-sm text-muted-foreground pt-2 border-t border-blue-500/20">
                        <div>
                          <p className="font-medium text-foreground mb-2">📋 Formato do Arquivo:</p>
                          <ul className="list-disc list-inside space-y-1 ml-2">
                            <li>Arquivos aceitos: <strong>CSV</strong> ou <strong>TXT</strong></li>
                            <li>Primeira coluna: <strong>Nome</strong> (obrigatório)</li>
                            <li>Segunda coluna: <strong>Número</strong> (obrigatório)</li>
                          </ul>
                        </div>
                        
                        <div>
                          <p className="font-medium text-foreground mb-2">📱 Formato do Número:</p>
                          <ul className="list-disc list-inside space-y-1 ml-2">
                            <li>Deve incluir <strong>código do país</strong> (ex: 55 para Brasil)</li>
                            <li><strong>Sem</strong> o sinal + (ex: 5511999999999)</li>
                            <li><strong>Sem</strong> espaços, traços ou parênteses</li>
                            <li>Apenas números</li>
                          </ul>
                        </div>
                        
                        <div>
                          <p className="font-medium text-foreground mb-2">✅ Exemplo de Arquivo CSV:</p>
                          <div className="bg-[hsl(var(--bg-primary))] rounded p-2 font-mono text-xs border border-border">
                            <div>Nome,Número</div>
                            <div>Maria Silva,5511999999999</div>
                            <div>João Santos,5511888888888</div>
                            <div>Ana Costa,5511777777777</div>
                          </div>
                        </div>
                        
                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded p-2">
                          <p className="text-xs text-yellow-400">
                            💡 <strong>Dica:</strong> Você também pode adicionar contatos manualmente no campo abaixo.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      📱 Importar Lista
                    </h3>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = '.csv,.txt,.xlsx';
                        input.onchange = async (e: any) => {
                          const file = e.target.files[0];
                          if (file) {
                            try {
                              await handleFileImport(file);
                              toast.success(`Arquivo ${file.name} importado com sucesso! ${contactsCount} contatos adicionados.`);
                            } catch (error: any) {
                              toast.error(`Erro ao importar arquivo: ${error.message}`);
                              console.error('Erro ao importar arquivo:', error);
                            }
                          }
                        };
                        input.click();
                      }}
                    >
                      Escolher Arquivo
                    </Button>
                    {contactsCount > 0 && (
                      <p className="text-sm text-muted-foreground mt-2">
                        ✓ {contactsCount} contatos importados
                      </p>
                    )}
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-[hsl(var(--bg-card))] px-2 text-muted-foreground">- OU -</span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      ✍️ Adicionar Manual
                    </h3>
                    <Textarea
                      placeholder="Nome,Número&#10;Maria,5511999999999"
                      value={contacts}
                      onChange={(e) => handleContactsChange(e.target.value)}
                      rows={4}
                      className="bg-[hsl(var(--bg-input))]"
                    />
                    <Badge variant="secondary" className="mt-2">
                      ✓ {contactsCount} contatos adicionados
                    </Badge>
                  </div>

                  {/* Lista de Contatos Importados */}
                  {contactsCount > 0 && (
                    <div className="mt-4 space-y-2">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        📋 Contatos Importados ({contactsCount})
                      </h4>
                      <div className="max-h-60 overflow-y-auto space-y-2 bg-[hsl(var(--bg-input))] rounded-lg p-3 border border-border">
                        {parseContacts(contacts).map((contact, index) => (
                          <div 
                            key={index}
                            className="flex items-center justify-between p-2 bg-[hsl(var(--bg-card))] rounded border border-border/50 hover:border-accent-purple/30 transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm text-foreground truncate">
                                {contact.name || <span className="text-muted-foreground italic">Sem nome</span>}
                              </div>
                              <div className="text-xs text-muted-foreground font-mono">
                                {contact.phone}
                              </div>
                            </div>
                            <Badge variant="outline" className="ml-2 shrink-0">
                              {index + 1}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </GlassCard>

              {/* Mensagens - Mobile */}
              <GlassCard>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  💬 Mensagem 1
                </h3>
                <Textarea
                  ref={messageTextareaRef}
                  placeholder="Olá {{nome}}! 👋&#10;&#10;Como vai?"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={6}
                  className="bg-[hsl(var(--bg-input))] mb-3"
                />

                <div className="flex gap-2 mb-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        title="Inserir variável"
                      >
                        <Hash className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      <DropdownMenuItem
                        onClick={() => insertVariableAtCursor('{{nome}}')}
                        className="flex items-center justify-between"
                      >
                        <span className="font-mono text-xs">{'{{nome}}'}</span>
                        <span className="ml-2 text-xs text-muted-foreground">Nome</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => insertVariableAtCursor('{{numero}}')}
                        className="flex items-center justify-between"
                      >
                        <span className="font-mono text-xs">{'{{numero}}'}</span>
                        <span className="ml-2 text-xs text-muted-foreground">Número</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => insertVariableAtCursor('{{data}}')}
                        className="flex items-center justify-between"
                      >
                        <span className="font-mono text-xs">{'{{data}}'}</span>
                        <span className="ml-2 text-xs text-muted-foreground">Data</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => insertVariableAtCursor('{{hora}}')}
                        className="flex items-center justify-between"
                      >
                        <span className="font-mono text-xs">{'{{hora}}'}</span>
                        <span className="ml-2 text-xs text-muted-foreground">Hora</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.onchange = (e: any) => {
                        const file = e.target.files[0];
                        if (file) handleFileUpload(file, 'image');
                      };
                      input.click();
                    }}
                  >
                    <Image className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'video/*';
                      input.onchange = (e: any) => {
                        const file = e.target.files[0];
                        if (file) handleFileUpload(file, 'video');
                      };
                      input.click();
                    }}
                  >
                    <Video className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = '.pdf,.doc,.docx,.txt';
                      input.onchange = (e: any) => {
                        const file = e.target.files[0];
                        if (file) handleFileUpload(file, 'document');
                      };
                      input.click();
                    }}
                  >
                    <FileText className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'audio/*';
                      input.onchange = (e: any) => {
                        const file = e.target.files[0];
                        if (file) handleFileUpload(file, 'audio');
                      };
                      input.click();
                    }}
                  >
                    <Mic className="w-4 h-4" />
                  </Button>
                </div>

                {selectedMedia && (
                  <div className="mb-3 p-2 glass rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {selectedMedia.type === 'image' && <Image className="w-4 h-4" />}
                      {selectedMedia.type === 'video' && <Video className="w-4 h-4" />}
                      {selectedMedia.type === 'document' && <FileText className="w-4 h-4" />}
                      {selectedMedia.type === 'audio' && <Mic className="w-4 h-4" />}
                      <span className="text-sm">{selectedMedia.fileName || 'Arquivo anexado'}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedMedia(null)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                <PhoneMockup message={message} recipientName={firstContact.name} recipientPhone={firstContact.phone} className="mb-3" />

                {/* Mensagens adicionais */}
                {messages.slice(1).map((msg, index) => (
                  <div key={index + 1} className="mb-4 space-y-2">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-sm flex items-center gap-2">
                        💬 Mensagem {index + 2}
                      </h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newMessages = messages.filter((_, i) => i !== index + 1);
                          setMessages(newMessages);
                        }}
                        className="h-6 w-6 p-0 text-destructive"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <Textarea
                      placeholder={`Mensagem ${index + 2}...`}
                      value={msg}
                      onChange={(e) => {
                        const newMessages = [...messages];
                        newMessages[index + 1] = e.target.value;
                        setMessages(newMessages);
                      }}
                      rows={4}
                      className="bg-[hsl(var(--bg-input))]"
                    />
                  </div>
                ))}

                {messages.length < 5 && (
                  <Button 
                    variant="ghost" 
                    className="w-full" 
                    size="sm"
                    onClick={() => {
                      setMessages([...messages, ""]);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Adicionar Mensagem {messages.length + 1}
                  </Button>
                )}
                
                {messages.length >= 5 && (
                  <p className="text-xs text-muted-foreground text-center">
                    Máximo de 5 mensagens por campanha
                  </p>
                )}
              </GlassCard>

              {/* Configurações Avançadas - Mobile */}
              <GlassCard>
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="w-full flex items-center justify-between text-sm font-semibold"
                >
                  <span className="flex items-center gap-2">⚙️ Avançado</span>
                  <span>{showAdvanced ? '−' : '+'}</span>
                </button>

                {showAdvanced && (
                  <div className="mt-4 space-y-4">
                    <div>
                      <Label className="text-sm mb-2 block">Intervalo entre msgs (segundos)</Label>
                      <div className="flex items-center justify-center gap-4">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setInterval(Math.max(7, interval - 1))}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <span className="text-2xl font-bold w-16 text-center">{interval}s</span>
                        <Button
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

                    {messages.filter(m => m.trim() !== '').length > 1 && (
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="alternate-mobile"
                          checked={alternateMessages}
                          onCheckedChange={(checked) => setAlternateMessages(checked as boolean)}
                        />
                        <label htmlFor="alternate-mobile" className="text-sm cursor-pointer">
                          Alternar mensagens automaticamente
                        </label>
                      </div>
                    )}
                    {messages.filter(m => m.trim() !== '').length > 1 && !alternateMessages && (
                      <p className="text-xs text-muted-foreground ml-6">
                        As mensagens serão alternadas em sequência (Mensagem 1, Mensagem 2, Mensagem 1, ...)
                      </p>
                    )}

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="randomize-mobile"
                        checked={randomizeTime}
                        onCheckedChange={(checked) => setRandomizeTime(checked as boolean)}
                      />
                      <label htmlFor="randomize-mobile" className="text-sm cursor-pointer">
                        Randomizar tempo (recomendado para evitar banimento)
                      </label>
                    </div>
                    {randomizeTime && (
                      <p className="text-xs text-muted-foreground ml-6">
                        Adiciona 3-9 segundos aleatórios ao intervalo
                      </p>
                    )}
                  </div>
                )}
              </GlassCard>

              {/* Agendar */}
              <GlassCard>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  Agendar
                </h3>
                <RadioGroup value={sendType} onValueChange={(value) => setSendType(value as 'now' | 'schedule')}>
                  <div className="flex items-center space-x-2 mb-2">
                    <RadioGroupItem value="now" id="now" />
                    <Label htmlFor="now" className="cursor-pointer">Enviar agora</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="schedule" id="schedule" />
                    <Label htmlFor="schedule" className="cursor-pointer">Agendar para:</Label>
                  </div>
                </RadioGroup>

                {sendType === "schedule" && (
                  <div className="mt-3 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs mb-1 block">Data</Label>
                        <Input 
                          type="date" 
                          className="bg-[hsl(var(--bg-input))]"
                          min={new Date().toISOString().split('T')[0]}
                          value={scheduleDate}
                          onChange={(e) => setScheduleDate(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs mb-1 block">Hora (Horário de Brasília)</Label>
                        <Input 
                          type="time" 
                          className="bg-[hsl(var(--bg-input))]"
                          value={scheduleTime}
                          onChange={(e) => setScheduleTime(e.target.value)}
                        />
                      </div>
                    </div>
                    {scheduleDate && scheduleTime && (
                      <p className="text-xs text-muted-foreground">
                        Agendado para: {new Date(`${scheduleDate}T${scheduleTime}`).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    )}
                  </div>
                )}
              </GlassCard>

            </>
        )}

        {/* Botão Principal */}
        <GradientButton
          onClick={handleStartCampaign}
          className={`${isDesktop ? 'max-w-sm' : 'w-full'} mx-auto ${isDesktop ? 'h-10' : ''}`}
          size="sm"
          disabled={!canDisparar || isCreating}
        >
          {isCreating ? (
            <>
              <Loader2 className={`${isDesktop ? 'w-4 h-4' : 'w-5 h-5'} mr-2 animate-spin`} />
              Criando Campanha...
            </>
          ) : canDisparar ? (
            <>
              {sendType === 'schedule' ? 'AGENDAR CAMPANHA' : 'INICIAR CAMPANHA'} <Rocket className={`${isDesktop ? 'w-4 h-4' : 'w-5 h-5'} ml-2`} />
            </>
          ) : (
            <>
              <Crown className={`${isDesktop ? 'w-4 h-4' : 'w-5 h-5'} mr-2`} />
              <span className="hidden sm:inline">{subscriptionMessage || 'Assine um Plano para Disparar'}</span>
              <span className="sm:hidden">Assinar Plano</span>
            </>
          )}
        </GradientButton>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
});

Create.displayName = 'Create';

export default Create;
