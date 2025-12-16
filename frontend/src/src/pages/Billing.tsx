import { useState, useMemo, useCallback, memo, useRef, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { GlassCard } from "@/components/GlassCard";
import { GradientButton } from "@/components/GradientButton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useConnections } from "@/hooks/useConnections";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { 
  DollarSign, Loader2, Upload, Plus, Trash2, Edit, Search, 
  Calendar, Phone, User, FileText, X, CheckCircle, XCircle, Clock, Send, Info, AlertCircle, Download, Bell, ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { BottomNav } from "@/components/BottomNav";
import { Skeleton } from "@/components/Skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cleanPhoneNumber, formatPhoneWithJID } from "@/lib/whatsapp-api";
import { usePixHistory } from "@/hooks/usePixHistory";
import { usePaymentProviders } from "@/hooks/usePaymentProviders";
// @ts-ignore
import * as XLSX from 'xlsx';

interface Billing {
  id: string;
  user_id: string;
  connection_id: string;
  client_name: string;
  client_phone: string;
  description: string | null;
  amount: number;
  due_date: string;
  message_template: string | null;
  status: 'pending' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  last_sent_at: string | null;
  sent_count: number;
  payment_type?: 'pix' | 'boleto';
  boleto_url?: string | null;
  boleto_barcode?: string | null;
  boleto_pdf?: string | null;
  created_at: string;
  updated_at: string;
}

const Billing = memo(() => {
  const { user } = useAuth();
  const { connections, loading: connectionsLoading } = useConnections();
  const [billings, setBillings] = useState<Billing[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBilling, setEditingBilling] = useState<Billing | null>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [messageTemplate, setMessageTemplate] = useState("");
  const [paymentType, setPaymentType] = useState<'pix' | 'boleto'>('pix');
  const [sendingBillingId, setSendingBillingId] = useState<string | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [mercadoPagoApiKey, setMercadoPagoApiKey] = useState("");
  const [showMercadoPagoModal, setShowMercadoPagoModal] = useState(false);
  const [savingApiKey, setSavingApiKey] = useState(false);
  const [showPixHistory, setShowPixHistory] = useState(false);
  const [selectedProviderForDefault, setSelectedProviderForDefault] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Histórico de PIX (armazenado localmente)
  const { history: pixHistory, addToHistory, clearHistory, removeItem } = usePixHistory();
  
  // Gerenciar provedores de pagamento
  const { providers, defaultProvider, loading: providersLoading, saveProvider, setAsDefault } = usePaymentProviders();

  // Memoizar conexões online
  const onlineConnections = useMemo(() => {
    if (!connections || !Array.isArray(connections)) return [];
    return connections.filter((conn: any) => conn.status === 'online');
  }, [connections]);

  // Carregar cobranças
  const loadBillings = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('billings')
        .select('*')
        .eq('user_id', user.id)
        .order('due_date', { ascending: true });

      if (error) throw error;
      setBillings(data || []);
    } catch (error) {
      console.error('Erro ao carregar cobranças:', error);
      toast.error('Erro ao carregar cobranças');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Carregar API keys dos provedores
  const loadProviderApiKeys = useCallback(() => {
    const mercadoPago = providers.find(p => p.provider === 'mercado_pago');
    
    setMercadoPagoApiKey(mercadoPago?.api_key || '');
  }, [providers]);

  // Salvar API key do Mercado Pago
  const handleSaveMercadoPagoApiKey = useCallback(async () => {
    if (!user?.id) return;

    setSavingApiKey(true);
    try {
      const isDefault = !defaultProvider || defaultProvider.provider === 'mercado_pago';
      const result = await saveProvider('mercado_pago', mercadoPagoApiKey, undefined, undefined, isDefault);

      if (result.success) {
        toast.success(mercadoPagoApiKey.trim() ? "API Key do Mercado Pago salva com sucesso!" : "API Key removida com sucesso!");
        setShowMercadoPagoModal(false);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Erro ao salvar API key:', error);
      toast.error('Erro ao salvar API key do Mercado Pago');
    } finally {
      setSavingApiKey(false);
    }
  }, [user?.id, mercadoPagoApiKey, saveProvider, defaultProvider]);


  // Carregar ao montar
  useEffect(() => {
    loadBillings();
  }, [loadBillings]);

  // Carregar API keys quando providers mudarem
  useEffect(() => {
    loadProviderApiKeys();
  }, [loadProviderApiKeys]);

  // Filtrar cobranças
  const filteredBillings = useMemo(() => {
    if (!searchTerm.trim()) return billings;
    const term = searchTerm.toLowerCase();
    return billings.filter(b => 
      b.client_name.toLowerCase().includes(term) ||
      b.client_phone.toLowerCase().includes(term) ||
      (b.description && b.description.toLowerCase().includes(term))
    );
  }, [billings, searchTerm]);

  // Processar importação de arquivo
  const handleFileImport = useCallback(async (file: File) => {
    if (!selectedConnectionId) {
      toast.error("Selecione uma instância primeiro.");
      return;
    }

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        toast.error("Arquivo vazio ou formato inválido.");
        return;
      }

      const billingsToInsert: any[] = [];

      for (const row of jsonData as any[]) {
        // Esperado: nome, numero, descricao, valor, data_vencimento
        const name = row.nome || row.Nome || row.name || row.Name || '';
        const phone = row.numero || row.Numero || row.phone || row.Phone || row.telefone || row.Telefone || '';
        const desc = row.descricao || row.Descricao || row.description || row.Description || '';
        const value = row.valor || row.Valor || row.value || row.Value || row.amount || row.Amount || 0;
        const dueDateStr = row.data_vencimento || row.Data_Vencimento || row.due_date || row.Due_Date || row.data || row.Data || '';

        if (!name || !phone || !value || !dueDateStr) {
          continue; // Pular linha inválida
        }

        // Normalizar telefone
        const normalizedPhone = formatPhoneWithJID(cleanPhoneNumber(phone));

        // Converter data (aceitar vários formatos)
        let dueDateFormatted = '';
        try {
          // Tentar parsear data em vários formatos
          const date = new Date(dueDateStr);
          if (!isNaN(date.getTime())) {
            dueDateFormatted = date.toISOString().split('T')[0];
          } else {
            // Tentar formato brasileiro DD/MM/YYYY
            const parts = dueDateStr.split('/');
            if (parts.length === 3) {
              const day = parts[0].padStart(2, '0');
              const month = parts[1].padStart(2, '0');
              const year = parts[2];
              dueDateFormatted = `${year}-${month}-${day}`;
            }
          }
        } catch (e) {
          console.error('Erro ao parsear data:', e);
          continue;
        }

        if (!dueDateFormatted) continue;

        // Converter valor (remover R$, espaços, etc)
        const amountValue = parseFloat(String(value).replace(/[^\d,.-]/g, '').replace(',', '.'));

        billingsToInsert.push({
          user_id: user?.id,
          connection_id: selectedConnectionId,
          client_name: name,
          client_phone: normalizedPhone,
          description: desc || null,
          amount: amountValue,
          due_date: dueDateFormatted,
          message_template: null,
          status: 'pending',
          payment_type: paymentType,
        });
      }

      if (billingsToInsert.length === 0) {
        toast.error("Nenhuma cobrança válida encontrada no arquivo.");
        return;
      }

      const { error } = await supabase
        .from('billings')
        .insert(billingsToInsert);

      if (error) throw error;

      toast.success(`${billingsToInsert.length} cobrança(s) importada(s) com sucesso!`);
      setShowAddModal(false);
      resetForm();
      await loadBillings();
    } catch (error) {
      console.error('Erro ao importar:', error);
      toast.error('Erro ao importar cobranças. Verifique o formato do arquivo.');
    }
  }, [selectedConnectionId, user?.id, loadBillings]);

  // Resetar formulário
  const resetForm = useCallback(() => {
    setClientName("");
    setClientPhone("");
    setDescription("");
    setAmount("");
    setDueDate("");
    setMessageTemplate("");
    setPaymentType('pix');
    setSelectedConnectionId("");
    setEditingBilling(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Adicionar cobrança manual
  const handleAddBilling = useCallback(async () => {
    if (!selectedConnectionId) {
      toast.error("Selecione uma instância.");
      return;
    }
    if (!clientName.trim()) {
      toast.error("Digite o nome do cliente.");
      return;
    }
    if (!clientPhone.trim()) {
      toast.error("Digite o número do cliente.");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Digite um valor válido.");
      return;
    }
    if (!dueDate) {
      toast.error("Selecione a data de vencimento.");
      return;
    }

    try {
      const normalizedPhone = formatPhoneWithJID(cleanPhoneNumber(clientPhone));

      // Garantir que a data seja salva corretamente sem conversão de timezone
      // O input type="date" retorna YYYY-MM-DD, que já é o formato esperado pelo PostgreSQL DATE
      // Não fazer conversão para evitar problemas de timezone
      const dueDateFormatted = dueDate; // Já está no formato YYYY-MM-DD

      const { error } = await supabase
        .from('billings')
        .insert({
          user_id: user?.id,
          connection_id: selectedConnectionId,
          client_name: clientName.trim(),
          client_phone: normalizedPhone,
          description: description.trim() || null,
          amount: parseFloat(amount),
          due_date: dueDateFormatted, // Salvar diretamente sem conversão
          message_template: messageTemplate.trim() || null,
          status: 'pending',
          payment_type: paymentType,
        });

      if (error) throw error;

      toast.success("Cobrança adicionada com sucesso!");
      setShowAddModal(false);
      resetForm();
      await loadBillings();
    } catch (error) {
      console.error('Erro ao adicionar cobrança:', error);
      toast.error('Erro ao adicionar cobrança');
    }
  }, [selectedConnectionId, clientName, clientPhone, amount, dueDate, description, messageTemplate, user?.id, resetForm, loadBillings]);

  // Editar cobrança
  const handleEditBilling = useCallback((billing: Billing) => {
    setEditingBilling(billing);
    setSelectedConnectionId(billing.connection_id);
    setClientName(billing.client_name);
    setClientPhone(billing.client_phone.replace('@s.whatsapp.net', ''));
    setDescription(billing.description || '');
    setAmount(billing.amount.toString());
    // Garantir que a data seja exibida corretamente (formato YYYY-MM-DD)
    const dueDateObj = new Date(billing.due_date);
    // Ajustar para timezone local do Brasil
    const year = dueDateObj.getFullYear();
    const month = String(dueDateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dueDateObj.getDate()).padStart(2, '0');
    setDueDate(`${year}-${month}-${day}`);
    setMessageTemplate(billing.message_template || '');
    setPaymentType(billing.payment_type || 'pix');
    setShowEditModal(true);
  }, []);

  // Salvar edição
  const handleSaveEdit = useCallback(async () => {
    if (!editingBilling) return;

    if (!clientName.trim() || !clientPhone.trim() || !amount || !dueDate) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    try {
      const normalizedPhone = formatPhoneWithJID(cleanPhoneNumber(clientPhone));

      // Garantir que a data seja salva corretamente sem conversão
      const dueDateFormatted = dueDate; // Já está no formato YYYY-MM-DD

      const { error } = await supabase
        .from('billings')
        .update({
          client_name: clientName.trim(),
          client_phone: normalizedPhone,
          description: description.trim() || null,
          amount: parseFloat(amount),
          due_date: dueDateFormatted, // Salvar diretamente sem conversão
          message_template: messageTemplate.trim() || null,
          payment_type: paymentType,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingBilling.id);

      if (error) throw error;

      toast.success("Cobrança atualizada com sucesso!");
      setShowEditModal(false);
      resetForm();
      await loadBillings();
    } catch (error) {
      console.error('Erro ao atualizar cobrança:', error);
      toast.error('Erro ao atualizar cobrança');
    }
  }, [editingBilling, clientName, clientPhone, amount, dueDate, description, messageTemplate, resetForm, loadBillings]);

  // Deletar cobrança
  const handleDeleteBilling = useCallback(async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar esta cobrança?')) return;

    try {
      const { error } = await supabase
        .from('billings')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success("Cobrança deletada com sucesso!");
      await loadBillings();
    } catch (error) {
      console.error('Erro ao deletar cobrança:', error);
      toast.error('Erro ao deletar cobrança');
    }
  }, [loadBillings]);

  // Marcar como paga
  const handleMarkAsPaid = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('billings')
        .update({ status: 'paid', updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      toast.success("Cobrança marcada como paga!");
      await loadBillings();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status');
    }
  }, [loadBillings]);

  // Enviar cobrança manualmente
  const handleSendBilling = useCallback(async (billing: Billing) => {
    if (sendingBillingId) return; // Evitar múltiplos envios simultâneos

    try {
      setSendingBillingId(billing.id);
      toast.loading("Verificando número no WhatsApp...", { id: `sending-${billing.id}` });

      // Buscar conexão
      const connection = connections.find((c: any) => c.id === billing.connection_id);
      if (!connection) {
        toast.error("Conexão não encontrada.", { id: `sending-${billing.id}` });
        setSendingBillingId(null);
        return;
      }

      if (connection.status !== 'online') {
        toast.error("A conexão não está online.", { id: `sending-${billing.id}` });
        setSendingBillingId(null);
        return;
      }

      // Verificar se o número tem WhatsApp
      const { whatsappApi, cleanPhoneNumber } = await import('@/lib/whatsapp-api');
      
      // Extrair número sem @s.whatsapp.net para verificação
      const phoneToCheck = billing.client_phone.replace('@s.whatsapp.net', '');
      const normalizedPhone = cleanPhoneNumber(phoneToCheck);

      toast.loading("Verificando número no WhatsApp...", { id: `sending-${billing.id}` });

      const checkResult = await whatsappApi.checkUser(
        connection.api_instance_token,
        [normalizedPhone]
      );

      if (!checkResult.success) {
        toast.error(checkResult.error || "Erro ao verificar número no WhatsApp.", { id: `sending-${billing.id}` });
        setSendingBillingId(null);
        return;
      }

      // Verificar se o número tem WhatsApp
      const validUser = checkResult.data?.Users?.find(user => {
        const userQuery = cleanPhoneNumber(user.Query.replace('@s.whatsapp.net', ''));
        const userJIDNumber = user.JID ? cleanPhoneNumber(user.JID.replace('@s.whatsapp.net', '')) : '';
        return (userQuery === normalizedPhone || userJIDNumber === normalizedPhone) && user.IsInWhatsapp === true;
      });

      if (!validUser) {
        toast.error("Este número não possui WhatsApp.", { id: `sending-${billing.id}` });
        setSendingBillingId(null);
        return;
      }

      // Usar o JID retornado pela API se disponível
      const phoneNumber = validUser.JID || (billing.client_phone.includes('@s.whatsapp.net') 
        ? billing.client_phone 
        : `${normalizedPhone}@s.whatsapp.net`);

      // Buscar provedor de pagamento padrão do usuário (SEMPRE buscar do banco para garantir)
      let pixQrCode = null;
      let pixCopyPaste = null;
      let pixId = null;
      let paymentProvider = null;
      let boletoUrl = null;
      let boletoBarcode = null;
      let boletoPdf = null;
      const paymentType = billing.payment_type || 'pix';

      // 🔥 IMPORTANTE: Buscar provedor do banco SEMPRE (não confiar no estado)
      console.log('🔍 Buscando provedor de pagamento padrão...');
      const { data: freshProvider, error: freshProviderError } = await supabase
        .from('payment_providers')
        .select('*')
        .eq('user_id', user!.id)
        .eq('is_active', true)
        .eq('is_default', true)
        .single();

      if (freshProviderError && freshProviderError.code !== 'PGRST116') {
        console.error('Erro ao buscar provedor:', freshProviderError);
      }

      const providerToUse = freshProvider || defaultProvider;
      console.log('✅ Provedor encontrado:', {
        provider: providerToUse?.provider,
        hasApiKey: !!providerToUse?.api_key,
        isDefault: providerToUse?.is_default
      });

      // 🔥 VERIFICAÇÃO: Se é PIX mas não tem provedor configurado, avisar ANTES
      if (paymentType === 'pix' && (!providerToUse || !providerToUse.api_key)) {
        console.warn('⚠️ AVISO: Tipo de pagamento é PIX mas não há provedor configurado!');
        toast.error('Configure um provedor de pagamento para gerar PIX automaticamente.', { id: `sending-${billing.id}` });
        setSendingBillingId(null);
        return;
      }

      if (providerToUse && providerToUse.api_key) {
        const providerName = 'Mercado Pago';
        const paymentTypeName = paymentType === 'boleto' ? 'Boleto' : 'PIX';
        console.log(`🚀 INICIANDO GERAÇÃO DE ${paymentTypeName.toUpperCase()} VIA ${providerName.toUpperCase()}`);
        toast.loading(`Gerando ${paymentTypeName} via ${providerName}...`, { id: `sending-${billing.id}` });
        
        try {
          // Chamar Edge Function para gerar PIX ou Boleto
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            let functionName: string;
            let requestBody: any;

            // Apenas Mercado Pago suportado para cobranças dos usuários
            if (paymentType === 'boleto') {
              toast.error('Boleto não está disponível. Use PIX.', { id: `sending-${billing.id}` });
              setSendingBillingId(null);
              return;
            }
            
            if (providerToUse.provider !== 'mercado_pago') {
              toast.error('Apenas Mercado Pago é suportado para cobranças.', { id: `sending-${billing.id}` });
              setSendingBillingId(null);
              return;
            }
            
            functionName = 'generate-mercado-pago-pix';
            requestBody = {
              api_key: providerToUse.api_key,
              amount: billing.amount.toString(),
              description: billing.description || `Cobrança para ${billing.client_name}`,
              external_reference: `billing_${billing.id}`,
            };
            
            console.log('📡 Chamando Edge Function:', functionName);
            console.log('📊 Dados da requisição:', {
              amount: billing.amount,
              description: billing.description || `Cobrança para ${billing.client_name}`,
              hasApiKey: !!providerToUse.api_key
            });

            // Timeout de 30 segundos para gerar PIX (pode demorar com retry)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);

            let paymentResponse;
            try {
              paymentResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${session.access_token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
                signal: controller.signal,
              });
            } catch (fetchError: any) {
              clearTimeout(timeoutId);
              if (fetchError.name === 'AbortError') {
                console.error(`Timeout ao gerar ${paymentTypeName} (30s)`);
                throw new Error(`Timeout: A geração do ${paymentTypeName} está demorando muito. Tente novamente.`);
              }
              throw fetchError;
            }
            clearTimeout(timeoutId);

            if (!paymentResponse.ok) {
              const errorText = await paymentResponse.text();
              console.error(`Erro HTTP ao gerar ${paymentTypeName}:`, paymentResponse.status, errorText);
              
              // Tentar parsear como JSON para obter mensagem de erro mais clara
              let errorMessage = `Erro ${paymentResponse.status}`;
              try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.error || errorJson.message || errorMessage;
              } catch {
                errorMessage = errorText || errorMessage;
              }
              
              throw new Error(errorMessage);
            }

            const paymentResult = await paymentResponse.json();
            console.log(`Resposta do ${functionName}:`, paymentResult);

            if (paymentResult.success) {
              paymentProvider = providerToUse.provider;
              console.log('✅ PIX/Boleto gerado com sucesso!');
              
              if (paymentType === 'boleto') {
                boletoBarcode = paymentResult.barcode || paymentResult.boleto_barcode;
                boletoUrl = paymentResult.boleto_url;
                boletoPdf = paymentResult.pdf_url || paymentResult.boleto_pdf;
                pixId = paymentResult.payment_id;
                console.log('✅ Boleto gerado com sucesso! ID:', pixId);
                console.log('URL:', boletoUrl);
                console.log('PDF:', boletoPdf);
                console.log('Código de barras:', boletoBarcode ? 'Presente' : 'Ausente');
              } else {
                // Extrair dados do PIX do Mercado Pago
                pixCopyPaste = paymentResult.copy_paste || paymentResult.qr_code;
                pixQrCode = paymentResult.qr_code_base64 || paymentResult.qr_code;
                pixId = paymentResult.payment_id;
                
                console.log('✅ PIX gerado com sucesso! ID:', pixId);
                console.log('Chave copia e cola (token):', pixCopyPaste ? `Presente (${pixCopyPaste.substring(0, 50)}...)` : 'AUSENTE - ERRO!');
                console.log('QR Code:', pixQrCode ? (pixQrCode.startsWith('data:image') ? 'Presente (base64)' : 'Presente (URL)') : 'Ausente');
                
                // Validar se temos os dados necessários
                if (!pixCopyPaste) {
                  console.error('❌ ERRO: Token PIX (copy_paste) não foi retornado!');
                  toast.error('Erro: Token PIX não foi gerado. Verifique a configuração do Mercado Pago.', { id: `sending-${billing.id}` });
                  setSendingBillingId(null);
                  return;
                }
                
                if (!pixQrCode) {
                  console.warn('⚠️ AVISO: QR Code não foi retornado, mas o token está presente. Tentando gerar QR Code...');
                  // Tentar gerar QR Code a partir do token se não foi retornado
                  if (pixCopyPaste) {
                    pixQrCode = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pixCopyPaste)}`;
                  }
                }
                
                // Adicionar ao histórico local (apenas PIX)
                addToHistory({
                  billingId: billing.id,
                  clientName: billing.client_name,
                  amount: billing.amount,
                  pixId: pixId,
                  pixCopyPaste: pixCopyPaste,
                  pixQrCode: pixQrCode,
                  status: 'generated',
                });
              }
            } else {
              console.error(`❌ Erro ao gerar ${paymentTypeName}:`, paymentResult.error);
              console.error('Detalhes:', paymentResult.details);
              toast.error(`Erro ao gerar ${paymentTypeName}: ${paymentResult.error}`, { id: `sending-${billing.id}` });
              setSendingBillingId(null);
              return; // Parar se não conseguir gerar o PIX
            }
          } else {
            console.error('Sessão não encontrada');
            toast.error('Erro: Sessão não encontrada.', { id: `sending-${billing.id}` });
            setSendingBillingId(null);
            return;
          }
        } catch (paymentError) {
          console.error(`Erro ao chamar função de gerar ${paymentTypeName}:`, paymentError);
          toast.error(`Erro ao gerar ${paymentTypeName}. Verifique os logs.`, { id: `sending-${billing.id}` });
          setSendingBillingId(null);
          return; // Parar se houver erro
        }
      }

      // Se o tipo de pagamento é PIX mas não foi gerado (e tinha provedor configurado), avisar
      if (paymentType === 'pix' && !pixCopyPaste && providerToUse && providerToUse.api_key) {
        console.error('❌ ERRO CRÍTICO: PIX não foi gerado mas provedor está configurado!');
        console.error('  - Provider:', providerToUse.provider);
        console.error('  - Has API Key:', !!providerToUse.api_key);
        console.error('  - pixCopyPaste:', pixCopyPaste);
        toast.error('Erro: Não foi possível gerar o PIX. A mensagem não será enviada.', { id: `sending-${billing.id}` });
        setSendingBillingId(null);
        return;
      }
      
      // 🔥 VERIFICAÇÃO ADICIONAL: Se tem provedor mas não tentou gerar PIX
      if (paymentType === 'pix' && !pixCopyPaste && !providerToUse) {
        console.warn('⚠️ AVISO: Nenhum provedor configurado, mensagem será enviada SEM PIX');
      }

      toast.loading("Enviando mensagem de cobrança...", { id: `sending-${billing.id}` });

      // Formatar data e valor
      const dueDate = new Date(billing.due_date);
      const formattedDate = dueDate.toLocaleDateString('pt-BR');
      const formattedAmount = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(billing.amount);

      // Substituir variáveis na mensagem
      let messageText = billing.message_template || 
        `Olá {{nome}}! Você tem uma cobrança pendente de {{valor}} com vencimento em {{data}}. Por favor, entre em contato para quitar.`;
      
      messageText = messageText.replace(/\{\{nome\}\}/g, billing.client_name);
      messageText = messageText.replace(/\{\{valor\}\}/g, formattedAmount);
      messageText = messageText.replace(/\{\{data\}\}/g, formattedDate);
      messageText = messageText.replace(/\{\{descricao\}\}/g, billing.description || '');

      // Debug: Verificar valores antes de adicionar à mensagem
      console.log('🔍 DEBUG - Valores antes de montar mensagem:');
      console.log('  - paymentType:', paymentType);
      console.log('  - pixCopyPaste:', pixCopyPaste ? `Presente (${pixCopyPaste.substring(0, 50)}...)` : 'AUSENTE');
      console.log('  - pixQrCode:', pixQrCode ? (pixQrCode.startsWith('data:image') ? 'Presente (base64)' : 'Presente (URL)') : 'AUSENTE');
      console.log('  - boletoBarcode:', boletoBarcode ? 'Presente' : 'Ausente');

      // Adicionar informações do PIX ou Boleto na mensagem se foi gerado
      if (paymentType === 'boleto' && boletoBarcode) {
        messageText += `\n\n📄 *Boleto Gerado Automaticamente*\n\n📋 *Código de Barras:*\n\`\`\`${boletoBarcode}\`\`\`\n\n💡 Copie o código acima e pague em qualquer banco ou lotérica.`;
        
        if (boletoUrl) {
          messageText += `\n\n🔗 *Link do boleto será enviado em seguida* - Acesse para visualizar ou imprimir.`;
        }
      } else if (paymentType === 'pix' && pixCopyPaste) {
        console.log('✅ Adicionando PIX copia e cola à mensagem');
        messageText += `\n\n💳 *PIX Gerado Automaticamente*\n\n📋 *Chave Copia e Cola:*\n\`\`\`${pixCopyPaste}\`\`\`\n\n💡 Copie o código acima e cole no app do seu banco para pagar.`;
        
        if (pixQrCode) {
          console.log('✅ QR Code será enviado após a mensagem');
          messageText += `\n\n📱 *QR Code será enviado em seguida* - Escaneie com o app do seu banco.`;
        } else {
          console.warn('⚠️ AVISO: pixQrCode está ausente, mas pixCopyPaste está presente');
        }
      } else {
        console.warn('⚠️ AVISO: PIX não será adicionado à mensagem');
        console.warn('  - paymentType === "pix":', paymentType === 'pix');
        console.warn('  - pixCopyPaste existe:', !!pixCopyPaste);
      }

      // Enviar mensagem via WhatsApp API
      const result = await whatsappApi.sendText(
        connection.api_instance_token,
        phoneNumber,
        messageText
      );

      if (result.success) {
        // Se tiver QR Code PIX, enviar como imagem
        if (paymentType === 'pix' && pixQrCode) {
          try {
            toast.loading("Enviando QR Code PIX...", { id: `sending-${billing.id}` });
            
            // A função sendImage aceita base64 ou URL
            const qrResult = await whatsappApi.sendImage(
              connection.api_instance_token,
              phoneNumber,
              pixQrCode,
              'QR Code PIX - Escaneie para pagar'
            );
            
            if (!qrResult.success) {
              console.error('Erro ao enviar QR Code:', qrResult.error);
            }
          } catch (qrError) {
            console.error('Erro ao enviar QR Code:', qrError);
            // Não falhar o envio se o QR Code não puder ser enviado
          }
        }
        
        // Se tiver PDF do boleto, baixar e enviar como documento
        if (paymentType === 'boleto' && boletoPdf) {
          try {
            toast.loading("Enviando PDF do boleto...", { id: `sending-${billing.id}` });
            
            // Baixar PDF da URL e converter para base64
            const pdfResponse = await fetch(boletoPdf);
            if (pdfResponse.ok) {
              const pdfBlob = await pdfResponse.blob();
              const reader = new FileReader();
              
              reader.onloadend = async () => {
                const base64Pdf = reader.result as string;
                
                // Enviar PDF do boleto como documento via WhatsApp
                const pdfResult = await whatsappApi.sendDocument(
                  connection.api_instance_token,
                  phoneNumber,
                  base64Pdf,
                  `Boleto_${billing.client_name.replace(/\s/g, '_')}.pdf`,
                  'application/pdf'
                );
                
                if (!pdfResult.success) {
                  console.error('Erro ao enviar PDF do boleto:', pdfResult.error);
                }
              };
              
              reader.readAsDataURL(pdfBlob);
            }
          } catch (pdfError) {
            console.error('Erro ao enviar PDF do boleto:', pdfError);
            // Não falhar o envio se o PDF não puder ser enviado
          }
        }

        // Atualizar cobrança
        const dueDateObj = new Date(billing.due_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        dueDateObj.setHours(0, 0, 0, 0);

        // Atualizar o número com o JID correto se foi retornado
        const updateData: any = {
          last_sent_at: new Date().toISOString(),
          sent_count: (billing.sent_count || 0) + 1,
          status: dueDateObj < today ? 'overdue' : 'sent',
          updated_at: new Date().toISOString(),
        };

        // Se o JID foi retornado e é diferente do número atual, atualizar
        if (validUser.JID && validUser.JID !== billing.client_phone) {
          updateData.client_phone = validUser.JID;
        }

        // Salvar dados do PIX ou Boleto se foi gerado
        if (paymentType === 'boleto') {
          if (boletoUrl) updateData.boleto_url = boletoUrl;
          if (boletoPdf) updateData.boleto_pdf = boletoPdf;
          if (boletoBarcode) updateData.boleto_barcode = boletoBarcode;
          if (pixId) updateData.pix_id = pixId; // Reutilizar campo para payment_id
        } else {
          if (pixQrCode) updateData.pix_qr_code = pixQrCode;
          if (pixCopyPaste) updateData.pix_copy_paste = pixCopyPaste;
          if (pixId) updateData.pix_id = pixId;
        }
        if (paymentProvider) updateData.payment_provider = paymentProvider;
        if (pixId) updateData.payment_provider_id = pixId;

        await supabase
          .from('billings')
          .update(updateData)
          .eq('id', billing.id);

        const successMessage = paymentType === 'boleto' 
          ? (boletoBarcode ? "Mensagem com Boleto enviada com sucesso!" : "Mensagem de cobrança enviada com sucesso!")
          : (pixCopyPaste ? "Mensagem com PIX enviada com sucesso!" : "Mensagem de cobrança enviada com sucesso!");
        toast.success(successMessage, { id: `sending-${billing.id}` });
        await loadBillings();
      } else {
        toast.error(result.error || "Erro ao enviar mensagem.", { id: `sending-${billing.id}` });
      }
    } catch (error) {
      console.error('Erro ao enviar cobrança:', error);
      toast.error('Erro ao enviar mensagem de cobrança.', { id: `sending-${billing.id}` });
    } finally {
      setSendingBillingId(null);
    }
  }, [sendingBillingId, connections, loadBillings]);

  // Exportar histórico de cobranças
  const handleExportBillings = useCallback(() => {
    try {
      // Preparar dados para exportação
      const dataToExport = filteredBillings.map(billing => {
        // Parsear data manualmente para evitar problemas de timezone
        const dateParts = billing.due_date.split('T')[0].split('-');
        const formattedDate = dateParts.length === 3 
          ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`
          : new Date(billing.due_date + 'T12:00:00').toLocaleDateString('pt-BR');

        const lastSentDate = billing.last_sent_at 
          ? (() => {
              const sentParts = billing.last_sent_at.split('T')[0].split('-');
              return sentParts.length === 3 
                ? `${sentParts[2]}/${sentParts[1]}/${sentParts[0]}`
                : new Date(billing.last_sent_at).toLocaleDateString('pt-BR');
            })()
          : 'Nunca';

        const createdDate = (() => {
          const createdParts = billing.created_at.split('T')[0].split('-');
          return createdParts.length === 3 
            ? `${createdParts[2]}/${createdParts[1]}/${createdParts[0]}`
            : new Date(billing.created_at).toLocaleDateString('pt-BR');
        })();

        return {
          'Nome do Cliente': billing.client_name,
          'Número': billing.client_phone.replace('@s.whatsapp.net', ''),
          'Descrição': billing.description || '',
          'Valor (R$)': billing.amount.toFixed(2).replace('.', ','),
          'Data de Vencimento': formattedDate,
          'Status': 
            billing.status === 'pending' ? 'Pendente' :
            billing.status === 'sent' ? 'Enviada' :
            billing.status === 'paid' ? 'Paga' :
            billing.status === 'overdue' ? 'Vencida' :
            billing.status === 'cancelled' ? 'Cancelada' : billing.status,
          'Vezes Enviada': billing.sent_count || 0,
          'Último Envio': lastSentDate,
          'Data de Criação': createdDate,
        };
      });

      // Criar workbook
      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Cobranças');

      // Ajustar largura das colunas
      const colWidths = [
        { wch: 25 }, // Nome do Cliente
        { wch: 15 }, // Número
        { wch: 30 }, // Descrição
        { wch: 12 }, // Valor
        { wch: 18 }, // Data de Vencimento
        { wch: 12 }, // Status
        { wch: 12 }, // Vezes Enviada
        { wch: 15 }, // Último Envio
        { wch: 15 }, // Data de Criação
      ];
      worksheet['!cols'] = colWidths;

      // Gerar nome do arquivo com data atual
      const today = new Date();
      const dateStr = today.toLocaleDateString('pt-BR').replace(/\//g, '-');
      const fileName = `historico-cobrancas-${dateStr}.xlsx`;

      // Exportar
      XLSX.writeFile(workbook, fileName);
      
      toast.success(`Histórico exportado com sucesso! ${filteredBillings.length} cobrança(s) exportada(s).`);
    } catch (error) {
      console.error('Erro ao exportar histórico:', error);
      toast.error('Erro ao exportar histórico de cobranças');
    }
  }, [filteredBillings]);

  // Obter status badge
  const getStatusBadge = useCallback((status: string, dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);

    if (status === 'paid') {
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/50">Paga</Badge>;
    }
    if (status === 'cancelled') {
      return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/50">Cancelada</Badge>;
    }
    if (status === 'overdue' || (status === 'pending' && due < today)) {
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/50">Vencida</Badge>;
    }
    if (status === 'sent') {
      return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">Enviada</Badge>;
    }
    return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">Pendente</Badge>;
  }, []);

  return (
    <div className="min-h-screen tech-grid-bg pb-24">
      <PageHeader title="Cobranças Automáticas" />

      <div className={`${typeof window !== 'undefined' && window.innerWidth >= 1024 ? 'max-w-5xl' : 'max-w-lg'} mx-auto px-4 sm:px-6 ${typeof window !== 'undefined' && window.innerWidth >= 1024 ? 'space-y-3' : 'space-y-4'} animate-slide-up`}>
        {/* Seleção de Instância e Ações */}
        <GlassCard className={typeof window !== 'undefined' && window.innerWidth >= 1024 ? 'p-3' : ''}>
          <div className={`flex items-center justify-between ${typeof window !== 'undefined' && window.innerWidth >= 1024 ? 'mb-2' : 'mb-4'}`}>
            <h2 className={`${typeof window !== 'undefined' && window.innerWidth >= 1024 ? 'text-sm' : 'text-lg'} font-bold flex items-center gap-2`}>
              <DollarSign className={`${typeof window !== 'undefined' && window.innerWidth >= 1024 ? 'w-4 h-4' : 'w-5 h-5'} text-accent-cyan`} /> Instância WhatsApp
            </h2>
            <GradientButton
              onClick={() => setShowAddModal(true)}
              size="sm"
              className={typeof window !== 'undefined' && window.innerWidth >= 1024 ? 'h-8 text-xs' : ''}
            >
              <Plus className={`${typeof window !== 'undefined' && window.innerWidth >= 1024 ? 'w-3 h-3' : 'w-4 h-4'} mr-2`} />
              Adicionar
            </GradientButton>
          </div>
          {connectionsLoading ? (
            <Skeleton className={`${typeof window !== 'undefined' && window.innerWidth >= 1024 ? 'h-9' : 'h-10'} w-full`} />
          ) : onlineConnections.length > 0 ? (
            <Select value={selectedConnectionId} onValueChange={setSelectedConnectionId}>
              <SelectTrigger className={`w-full ${typeof window !== 'undefined' && window.innerWidth >= 1024 ? 'h-9 text-xs' : 'h-11'} bg-bg-input border-border/50 focus:border-accent-purple`}>
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

        {/* Botão para abrir informações */}
        <GlassCard 
          className="border-accent-cyan/20 bg-gradient-to-br from-accent-cyan/5 to-accent-purple/5 cursor-pointer hover:from-accent-cyan/10 hover:to-accent-purple/10 transition-all"
          onClick={() => setShowInfoModal(true)}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent-cyan/20 flex items-center justify-center flex-shrink-0">
              <Info className="w-5 h-5 text-accent-cyan" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-base">
                Como funciona a Cobrança Automática?
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Clique para saber mais sobre o sistema de cobranças automáticas
              </p>
            </div>
            <div className="flex-shrink-0">
              <div className="w-8 h-8 rounded-lg bg-accent-cyan/20 flex items-center justify-center">
                <Info className="w-4 h-4 text-accent-cyan" />
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Configuração de Provedores de Pagamento */}
        <GlassCard className="border-accent-purple/20 bg-gradient-to-br from-accent-purple/5 to-accent-cyan/5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-accent-purple" />
                Integrações de Pagamento
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Configure provedores para gerar PIX automaticamente
              </p>
            </div>
            <Button
              onClick={() => setShowPixHistory(true)}
              variant="outline"
              size="sm"
              className="border-accent-cyan/50 text-accent-cyan hover:bg-accent-cyan/10"
            >
              <Clock className="w-4 h-4 mr-1" />
              Histórico ({pixHistory.length})
            </Button>
          </div>

          <div className="space-y-3">
            {/* Mercado Pago */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-border/30">
              <div className="flex items-center gap-3 flex-1">
                <img 
                  src="https://i.postimg.cc/GmvnpyJt/mercadopago-logo-square-rounded-mercadopago-logo-free-download-mercadopago-logo-free-png.webp" 
                  alt="Mercado Pago" 
                  className="w-12 h-12 object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Mercado Pago</span>
                    {defaultProvider?.provider === 'mercado_pago' && (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/50 text-xs">Padrão</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Ideal para PIX simples</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {mercadoPagoApiKey ? (
                  <div className="flex items-center gap-2 text-xs text-success">
                    <CheckCircle className="w-4 h-4" />
                    <span>Configurado</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-warning">
                    <AlertCircle className="w-4 h-4" />
                    <span>Não configurado</span>
                  </div>
                )}
                <Button
                  onClick={() => {
                    setShowMercadoPagoModal(true);
                    loadProviderApiKeys();
                  }}
                  variant="outline"
                  size="sm"
                  className="border-accent-purple/50 text-accent-purple hover:bg-accent-purple/10"
                >
                  {mercadoPagoApiKey ? 'Editar' : 'Configurar'}
                </Button>
              </div>
            </div>

            {defaultProvider && (
              <div className="mt-2 p-2 rounded-lg bg-accent-cyan/10 border border-accent-cyan/30">
                <p className="text-xs text-accent-cyan">
                  <Info className="w-3 h-3 inline mr-1" />
                  Provedor padrão: <strong>Mercado Pago</strong>
                </p>
              </div>
            )}
          </div>

          {/* Aviso sobre Webhooks */}
          <div className="mt-4 p-3 sm:p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
            <div className="flex items-start gap-2 sm:gap-3">
              <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-xs sm:text-sm text-blue-400 mb-2">
                  🔔 Notificações Automáticas de Pagamento
                </h3>
                <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                  Para receber notificações automáticas quando um pagamento for confirmado, configure o webhook na <strong className="text-blue-400">sua conta</strong> do provedor de pagamento:
                </p>
                <div className="space-y-2.5 sm:space-y-3 text-xs">
                  <div className="p-2.5 sm:p-3 rounded bg-white/5 border border-border/30">
                    <div className="flex items-center gap-2 mb-2">
                      <strong className="text-yellow-400 text-xs sm:text-sm">Mercado Pago:</strong>
                    </div>
                    <ol className="list-decimal list-inside space-y-1.5 sm:space-y-2 text-muted-foreground ml-1 sm:ml-2">
                      <li className="leading-relaxed">Acesse o painel do Mercado Pago (sua conta)</li>
                      <li className="leading-relaxed">Vá em "Suas integrações" → "Webhooks"</li>
                      <li className="leading-relaxed">
                        <span className="block mb-1">Configure a URL:</span>
                        <code className="block bg-black/20 px-2 py-1.5 rounded text-yellow-300 text-[10px] sm:text-xs break-all font-mono">
                          https://svbrynrbayqubyryauid.supabase.co/functions/v1/webhook-mercado-pago
                        </code>
                      </li>
                      <li className="leading-relaxed">Selecione o evento: "Pagamento aprovado"</li>
                      <li className="leading-relaxed">Salve o webhook</li>
                    </ol>
                  </div>
                </div>
                <p className="text-xs text-blue-400 mt-3 italic leading-relaxed">
                  💡 <strong>Importante:</strong> Configure o webhook na <strong>sua própria conta</strong> do provedor de pagamento usando as URLs acima para receber notificações quando seus pagamentos forem confirmados.
                </p>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Modal de Configuração Mercado Pago */}
        <Dialog open={showMercadoPagoModal} onOpenChange={setShowMercadoPagoModal}>
          <DialogContent className="max-w-lg w-[calc(100vw-2rem)] mx-auto p-0 bg-[hsl(var(--bg-primary))] border-border/50 overflow-x-hidden">
            <div className="glass rounded-2xl p-4 sm:p-6 space-y-4 overflow-x-hidden">
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <img 
                    src="https://i.postimg.cc/GmvnpyJt/mercadopago-logo-square-rounded-mercadopago-logo-free-download-mercadopago-logo-free-png.webp" 
                    alt="Mercado Pago" 
                    className="w-20 h-20 object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <div>
                    <DialogTitle className="text-xl font-bold">
                      Configurar Mercado Pago
                    </DialogTitle>
                    <DialogDescription>
                      Adicione sua API Key do Mercado Pago para gerar PIX automaticamente
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="api-key">API Key do Mercado Pago</Label>
                  <Input
                    id="api-key"
                    type="password"
                    placeholder="APP_USR-xxxxxxxxxxxxxxxxxxxxxxxx"
                    value={mercadoPagoApiKey}
                    onChange={(e) => setMercadoPagoApiKey(e.target.value)}
                    className="bg-bg-input border-border/50"
                  />
                  <p className="text-xs text-muted-foreground">
                    Sua API Key será usada apenas para gerar PIX. Ela é armazenada de forma segura.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <Info className="w-4 h-4 text-blue-400" />
                    Como obter sua API Key?
                  </h4>
                  <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Acesse o painel do Mercado Pago</li>
                    <li>Vá em "Suas integrações" → "Credenciais"</li>
                    <li>Copie sua "Chave pública" (Access Token)</li>
                    <li>Cole aqui para ativar a geração automática de PIX</li>
                  </ol>
                </div>

                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <Bell className="w-4 h-4 text-blue-400" />
                    Notificações Automáticas (Opcional mas Recomendado)
                  </h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    Para receber notificações automáticas quando seus pagamentos forem confirmados, configure o webhook na <strong className="text-blue-400">sua conta</strong> do Mercado Pago:
                  </p>
                  <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Acesse o painel do Mercado Pago (sua conta)</li>
                    <li>Vá em "Suas integrações" → "Webhooks"</li>
                    <li>Clique em "Criar webhook"</li>
                    <li>
                      <span className="block mb-1">URL:</span>
                      <code className="block bg-black/20 px-2 py-1 rounded text-blue-300 text-[10px] sm:text-xs break-all font-mono whitespace-pre-wrap">https://svbrynrbayqubyryauid.supabase.co/functions/v1/webhook-mercado-pago</code>
                    </li>
                    <li>Evento: "Pagamentos" → "Pagamento aprovado"</li>
                    <li>Salve o webhook</li>
                  </ol>
                  <p className="text-xs text-blue-400 mt-2 italic">
                    💡 Configure na sua própria conta do Mercado Pago usando a URL acima para receber notificações dos seus pagamentos.
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleSaveMercadoPagoApiKey}
                    disabled={savingApiKey}
                    className="flex-1 bg-gradient-to-r from-accent-purple to-accent-cyan hover:opacity-90"
                  >
                    {savingApiKey ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      'Salvar'
                    )}
                  </Button>
                  <Button
                    onClick={() => setShowMercadoPagoModal(false)}
                    variant="outline"
                    disabled={savingApiKey}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>


        {/* Modal de Histórico de PIX */}
        <Dialog open={showPixHistory} onOpenChange={setShowPixHistory}>
          <DialogContent className="max-w-3xl w-full p-0 bg-[hsl(var(--bg-primary))] border-border/50 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="glass rounded-2xl p-6 space-y-4 flex flex-col h-full overflow-hidden">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img 
                      src="https://i.postimg.cc/GmvnpyJt/mercadopago-logo-square-rounded-mercadopago-logo-free-download-mercadopago-logo-free-png.webp" 
                      alt="Mercado Pago" 
                      className="w-16 h-16 object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <div>
                      <DialogTitle className="text-xl font-bold">
                        Histórico de PIX Gerados
                      </DialogTitle>
                      <DialogDescription>
                        Histórico armazenado localmente no seu navegador ({pixHistory.length} registro(s))
                      </DialogDescription>
                    </div>
                  </div>
                  {pixHistory.length > 0 && (
                    <Button
                      onClick={() => {
                        if (confirm('Tem certeza que deseja limpar todo o histórico?')) {
                          clearHistory();
                          toast.success('Histórico limpo com sucesso!');
                        }
                      }}
                      variant="outline"
                      size="sm"
                      className="border-destructive/50 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Limpar
                    </Button>
                  )}
                </div>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                {pixHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">Nenhum PIX gerado ainda</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      O histórico aparecerá aqui quando você gerar PIX
                    </p>
                  </div>
                ) : (
                  pixHistory.map((item) => {
                    const date = new Date(item.createdAt);
                    const formattedDate = date.toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                    const formattedAmount = new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    }).format(item.amount);

                    return (
                      <GlassCard key={item.id} className="border-border/30">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="font-semibold">{item.clientName}</h3>
                                <p className="text-xs text-muted-foreground">{formattedDate}</p>
                              </div>
                              <Badge
                                className={
                                  item.status === 'paid'
                                    ? 'bg-green-500/20 text-green-400 border-green-500/50'
                                    : item.status === 'expired'
                                    ? 'bg-red-500/20 text-red-400 border-red-500/50'
                                    : 'bg-blue-500/20 text-blue-400 border-blue-500/50'
                                }
                              >
                                {item.status === 'paid'
                                  ? 'Pago'
                                  : item.status === 'expired'
                                  ? 'Expirado'
                                  : 'Gerado'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="font-semibold text-accent-cyan">{formattedAmount}</span>
                              {item.pixId && (
                                <span className="text-xs text-muted-foreground">
                                  ID: {item.pixId}
                                </span>
                              )}
                            </div>
                            {item.pixCopyPaste && (
                              <div className="mt-2 p-2 rounded-lg bg-white/5 border border-border/30">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs text-muted-foreground">Chave Copia e Cola:</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      navigator.clipboard.writeText(item.pixCopyPaste!);
                                      toast.success('Chave copiada!');
                                    }}
                                    className="h-6 px-2 text-xs"
                                  >
                                    Copiar
                                  </Button>
                                </div>
                                <code className="text-xs break-all block font-mono">
                                  {item.pixCopyPaste.substring(0, 50)}...
                                </code>
                              </div>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm('Remover este item do histórico?')) {
                                removeItem(item.id);
                                toast.success('Item removido do histórico');
                              }
                            }}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </GlassCard>
                    );
                  })
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal de Informações */}
        <Dialog open={showInfoModal} onOpenChange={setShowInfoModal}>
          <DialogContent className="max-w-2xl w-full p-0 bg-[hsl(var(--bg-primary))] border-border/50 max-h-[90vh] overflow-y-auto">
            <div className="glass rounded-2xl p-6 space-y-4">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <Info className="w-5 h-5 text-accent-cyan" />
                  Como funciona a Cobrança Automática?
                </DialogTitle>
                <DialogDescription>
                  Entenda como o sistema de cobranças automáticas funciona passo a passo
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-border/30">
                    <div className="w-8 h-8 rounded-full bg-accent-cyan/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-accent-cyan font-bold text-base">1</span>
                    </div>
                    <div className="flex-1 pt-1">
                      <h4 className="font-semibold mb-1">Adicionar Cobranças</h4>
                      <p className="text-muted-foreground">
                        Adicione suas cobranças manualmente ou importe uma lista (Excel/CSV) com: <strong>nome</strong>, <strong>número</strong>, <strong>descrição</strong>, <strong>valor</strong> e <strong>data de vencimento</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-border/30">
                    <div className="w-8 h-8 rounded-full bg-accent-cyan/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-accent-cyan font-bold text-base">2</span>
                    </div>
                    <div className="flex-1 pt-1">
                      <h4 className="font-semibold mb-1">Verificação Automática</h4>
                      <p className="text-muted-foreground">
                        O sistema verifica automaticamente todos os dias às <strong className="text-white">08:00</strong> (horário de Brasília) se há cobranças com vencimento no dia atual.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-border/30">
                    <div className="w-8 h-8 rounded-full bg-accent-cyan/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-accent-cyan font-bold text-base">3</span>
                    </div>
                    <div className="flex-1 pt-1">
                      <h4 className="font-semibold mb-1">Verificação de WhatsApp</h4>
                      <p className="text-muted-foreground">
                        Quando encontrar cobranças vencidas, o sistema <strong className="text-white">verifica automaticamente se o número tem WhatsApp</strong> usando o endpoint de verificação. Apenas números com WhatsApp recebem a mensagem.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-border/30">
                    <div className="w-8 h-8 rounded-full bg-accent-cyan/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-accent-cyan font-bold text-base">4</span>
                    </div>
                    <div className="flex-1 pt-1">
                      <h4 className="font-semibold mb-1">Envio Manual</h4>
                      <p className="text-muted-foreground">
                        Você também pode enviar manualmente a qualquer momento clicando no botão <Send className="w-4 h-4 inline mx-1 text-accent-cyan" /> de envio. O sistema também verifica o número antes de enviar manualmente.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-border/30">
                    <div className="w-8 h-8 rounded-full bg-accent-cyan/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-accent-cyan font-bold text-base">5</span>
                    </div>
                    <div className="flex-1 pt-1">
                      <h4 className="font-semibold mb-1">Variáveis na Mensagem</h4>
                      <p className="text-muted-foreground mb-2">
                        Use variáveis na mensagem que serão substituídas automaticamente:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <code className="bg-white/10 px-2 py-1 rounded text-xs border border-border/30">{'{{nome}}'}</code>
                        <code className="bg-white/10 px-2 py-1 rounded text-xs border border-border/30">{'{{valor}}'}</code>
                        <code className="bg-white/10 px-2 py-1 rounded text-xs border border-border/30">{'{{data}}'}</code>
                        <code className="bg-white/10 px-2 py-1 rounded text-xs border border-border/30">{'{{descricao}}'}</code>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-yellow-400 mb-1">Importante</h4>
                      <p className="text-sm text-yellow-400/80">
                        Certifique-se de que sua instância WhatsApp está <strong>online</strong> para que o envio automático funcione corretamente. O sistema só envia mensagens quando a instância está conectada.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-border/30">
                <Button
                  onClick={() => setShowInfoModal(false)}
                  className="bg-accent-cyan/20 hover:bg-accent-cyan/30 text-accent-cyan border-accent-cyan/30"
                >
                  Entendi
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Busca e Exportar */}
        {billings.length > 0 && (
          <div className="space-y-3">
            <GlassCard>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar cobranças..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-bg-input border-border/50 focus:border-accent-purple"
                />
              </div>
            </GlassCard>
            <GlassCard>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Total de cobranças: {filteredBillings.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {filteredBillings.filter(b => b.status === 'pending').length} pendente(s), {' '}
                    {filteredBillings.filter(b => b.status === 'sent').length} enviada(s), {' '}
                    {filteredBillings.filter(b => b.status === 'paid').length} paga(s)
                  </p>
                </div>
                <GradientButton
                  onClick={() => handleExportBillings()}
                  size="sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Exportar Histórico
                </GradientButton>
              </div>
            </GlassCard>
          </div>
        )}

        {/* Lista de Cobranças */}
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : filteredBillings.length > 0 ? (
          <div className="space-y-3">
            {filteredBillings.map((billing) => (
              <GlassCard key={billing.id}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold truncate">{billing.client_name}</h3>
                      {getStatusBadge(billing.status, billing.due_date)}
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="w-4 h-4" />
                        <span className="truncate">{billing.client_phone.replace('@s.whatsapp.net', '')}</span>
                      </div>
                      {billing.description && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <FileText className="w-4 h-4" />
                          <span className="truncate">{billing.description}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-green-400" />
                        <span className="font-semibold text-green-400">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(billing.amount)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>Vencimento: {(() => {
                          // Parsear data manualmente para evitar problemas de timezone
                          const dateParts = billing.due_date.split('T')[0].split('-');
                          if (dateParts.length === 3) {
                            return `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
                          }
                          // Fallback para o método antigo se o formato for diferente
                          return new Date(billing.due_date + 'T12:00:00').toLocaleDateString('pt-BR');
                        })()}</span>
                      </div>
                      {billing.sent_count > 0 && (
                        <div className="flex items-center gap-2 text-muted-foreground text-xs">
                          <CheckCircle className="w-3 h-3" />
                          <span>Enviada {billing.sent_count} vez(es)</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    {billing.status !== 'paid' && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleSendBilling(billing)}
                          disabled={sendingBillingId === billing.id}
                          className="text-blue-400 hover:text-blue-300"
                          title="Enviar mensagem agora"
                        >
                          {sendingBillingId === billing.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleMarkAsPaid(billing.id)}
                          className="text-green-400 hover:text-green-300"
                          title="Marcar como paga"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditBilling(billing)}
                      title="Editar cobrança"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteBilling(billing.id)}
                      className="text-red-400 hover:text-red-300"
                      title="Deletar cobrança"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        ) : (
          <GlassCard>
            <div className="text-center py-8">
              <DollarSign className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">
                {searchTerm ? 'Nenhuma cobrança encontrada' : 'Nenhuma cobrança cadastrada'}
              </p>
            </div>
          </GlassCard>
        )}

        {/* Modal Adicionar/Importar */}
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogContent className="max-w-md w-full p-0 bg-[hsl(var(--bg-primary))] border-border/50">
            <div className="glass rounded-2xl p-6 space-y-4">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <Plus className="w-5 h-5 text-accent-purple" />
                  Adicionar Cobrança
                </DialogTitle>
                <DialogDescription>
                  Adicione uma cobrança manualmente ou importe uma lista (Excel/CSV)
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Instância WhatsApp</Label>
                  <Select value={selectedConnectionId} onValueChange={setSelectedConnectionId}>
                    <SelectTrigger className="w-full bg-bg-input border-border/50">
                      <SelectValue placeholder="Selecione uma instância" />
                    </SelectTrigger>
                    <SelectContent className="glass border-border/50">
                      {onlineConnections.map((conn) => (
                        <SelectItem key={conn.id} value={conn.id}>
                          {conn.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Importar Lista (Excel/CSV)</Label>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleFileImport(file);
                      }
                    }}
                    className="bg-bg-input border-border/50"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Formato esperado: nome, numero, descricao, valor, data_vencimento
                  </p>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border/50" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-[hsl(var(--bg-primary))] px-2 text-muted-foreground">Ou</span>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Nome do Cliente *</Label>
                  <Input
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Nome completo"
                    className="bg-bg-input border-border/50"
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Número do Cliente *</Label>
                  <Input
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="5511999999999"
                    className="bg-bg-input border-border/50"
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Descrição</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descrição da cobrança"
                    rows={2}
                    className="bg-bg-input border-border/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Valor (R$) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="bg-bg-input border-border/50"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Data Vencimento *</Label>
                    <Input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="bg-bg-input border-border/50"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Tipo de Pagamento *</Label>
                  <Select value={paymentType} onValueChange={(value: 'pix' | 'boleto') => setPaymentType(value)}>
                    <SelectTrigger className="w-full bg-bg-input border-border/50">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent className="glass border-border/50">
                      <SelectItem value="pix">
                        <div className="flex items-center gap-2">
                          <span>💳 PIX</span>
                          <span className="text-xs text-muted-foreground">(Pagamento instantâneo)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="boleto">
                        <div className="flex items-center gap-2">
                          <span>📄 Boleto</span>
                          <span className="text-xs text-muted-foreground">(Pagamento bancário)</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {paymentType === 'pix' 
                      ? 'PIX será gerado automaticamente quando a cobrança for enviada'
                      : 'Boleto será gerado automaticamente quando a cobrança for enviada'}
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Mensagem Personalizada (opcional)</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setMessageTemplate(prev => prev + '{{nome}}')}
                      className="text-xs border-border/50 hover:bg-white/5"
                    >
                      {'{{nome}}'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setMessageTemplate(prev => prev + '{{valor}}')}
                      className="text-xs border-border/50 hover:bg-white/5"
                    >
                      {'{{valor}}'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setMessageTemplate(prev => prev + '{{data}}')}
                      className="text-xs border-border/50 hover:bg-white/5"
                    >
                      {'{{data}}'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setMessageTemplate(prev => prev + '{{descricao}}')}
                      className="text-xs border-border/50 hover:bg-white/5"
                    >
                      {'{{descricao}}'}
                    </Button>
                  </div>
                  <Textarea
                    value={messageTemplate}
                    onChange={(e) => setMessageTemplate(e.target.value)}
                    placeholder="Olá {{nome}}! Você tem uma cobrança pendente de {{valor}} com vencimento em {{data}}."
                    rows={3}
                    className="bg-bg-input border-border/50"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Clique nos botões acima para inserir variáveis rapidamente
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAddModal(false);
                      resetForm();
                    }}
                    className="flex-1 border-border/50 hover:bg-white/5"
                  >
                    Cancelar
                  </Button>
                  <GradientButton
                    onClick={handleAddBilling}
                    className="flex-1"
                    disabled={!selectedConnectionId || !clientName.trim() || !clientPhone.trim() || !amount || !dueDate}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar
                  </GradientButton>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal Editar */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="max-w-md w-full p-0 bg-[hsl(var(--bg-primary))] border-border/50">
            <div className="glass rounded-2xl p-6 space-y-4">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <Edit className="w-5 h-5 text-accent-purple" />
                  Editar Cobrança
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Nome do Cliente *</Label>
                  <Input
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="bg-bg-input border-border/50"
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Número do Cliente *</Label>
                  <Input
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="bg-bg-input border-border/50"
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Descrição</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    className="bg-bg-input border-border/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Valor (R$) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="bg-bg-input border-border/50"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Data Vencimento *</Label>
                    <Input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="bg-bg-input border-border/50"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Tipo de Pagamento *</Label>
                  <Select value={paymentType} onValueChange={(value: 'pix' | 'boleto') => setPaymentType(value)}>
                    <SelectTrigger className="w-full bg-bg-input border-border/50">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent className="glass border-border/50">
                      <SelectItem value="pix">
                        <div className="flex items-center gap-2">
                          <span>💳 PIX</span>
                          <span className="text-xs text-muted-foreground">(Pagamento instantâneo)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="boleto">
                        <div className="flex items-center gap-2">
                          <span>📄 Boleto</span>
                          <span className="text-xs text-muted-foreground">(Pagamento bancário)</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {paymentType === 'pix' 
                      ? 'PIX será gerado automaticamente quando a cobrança for enviada'
                      : 'Boleto será gerado automaticamente quando a cobrança for enviada'}
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Mensagem Personalizada</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setMessageTemplate(prev => prev + '{{nome}}')}
                      className="text-xs border-border/50 hover:bg-white/5"
                    >
                      {'{{nome}}'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setMessageTemplate(prev => prev + '{{valor}}')}
                      className="text-xs border-border/50 hover:bg-white/5"
                    >
                      {'{{valor}}'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setMessageTemplate(prev => prev + '{{data}}')}
                      className="text-xs border-border/50 hover:bg-white/5"
                    >
                      {'{{data}}'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setMessageTemplate(prev => prev + '{{descricao}}')}
                      className="text-xs border-border/50 hover:bg-white/5"
                    >
                      {'{{descricao}}'}
                    </Button>
                  </div>
                  <Textarea
                    value={messageTemplate}
                    onChange={(e) => setMessageTemplate(e.target.value)}
                    rows={3}
                    className="bg-bg-input border-border/50"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Clique nos botões acima para inserir variáveis rapidamente
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowEditModal(false);
                      resetForm();
                    }}
                    className="flex-1 border-border/50 hover:bg-white/5"
                  >
                    Cancelar
                  </Button>
                  <GradientButton
                    onClick={handleSaveEdit}
                    className="flex-1"
                    disabled={!clientName.trim() || !clientPhone.trim() || !amount || !dueDate}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Salvar
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

Billing.displayName = 'Billing';

export default Billing;

