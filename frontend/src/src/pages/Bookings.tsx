import { useState, useMemo, useCallback, memo, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { GlassCard } from "@/components/GlassCard";
import { GradientButton } from "@/components/GradientButton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { 
  Calendar, Clock, User, Phone, Mail, DollarSign, Plus, Edit, Trash2, 
  CheckCircle, XCircle, AlertCircle, Copy, ExternalLink, Settings, Search,
  Loader2, FileText
} from "lucide-react";
import { toast } from "sonner";
import { BottomNav } from "@/components/BottomNav";
import { Skeleton } from "@/components/Skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cleanPhoneNumber, formatPhoneWithJID } from "@/lib/whatsapp-api";

interface Service {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number;
  advance_payment_percentage: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Booking {
  id: string;
  user_id: string;
  service_id: string;
  connection_id: string | null;
  client_name: string;
  client_phone: string;
  client_email: string | null;
  booking_date: string;
  booking_time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  total_price: number;
  advance_payment: number;
  advance_payment_status: 'pending' | 'paid' | 'refunded';
  advance_payment_provider: string | null;
  advance_payment_id: string | null;
  pix_qr_code: string | null;
  pix_copy_paste: string | null;
  notes: string | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
  services?: Service;
}

interface BookingSettings {
  id: string;
  user_id: string;
  public_link_slug: string | null;
  timezone: string;
  business_hours: any;
  advance_booking_days: number;
  min_advance_hours: number;
  slot_duration_minutes: number;
  confirmation_message_template: string | null;
  reminder_message_template: string | null;
  reminder_hours_before: number;
}

const Bookings = memo(() => {
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  
  // Formulário de serviço
  const [serviceName, setServiceName] = useState("");
  const [serviceDescription, setServiceDescription] = useState("");
  const [serviceDuration, setServiceDuration] = useState("30");
  const [servicePrice, setServicePrice] = useState("");
  const [advancePercentage, setAdvancePercentage] = useState("50");
  const [serviceActive, setServiceActive] = useState(true);
  
  // Formulário de agendamento
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [bookingNotes, setBookingNotes] = useState("");
  
  // Settings
  const [settings, setSettings] = useState<BookingSettings | null>(null);
  const [publicLinkSlug, setPublicLinkSlug] = useState("");

  // Carregar serviços
  const loadServices = useCallback(async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Erro ao carregar serviços:', error);
      toast.error('Erro ao carregar serviços');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Carregar agendamentos
  const loadBookings = useCallback(async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          services (*)
        `)
        .eq('user_id', user.id)
        .order('booking_date', { ascending: true })
        .order('booking_time', { ascending: true });

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error);
      toast.error('Erro ao carregar agendamentos');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Carregar configurações
  const loadSettings = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('booking_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setSettings(data);
        setPublicLinkSlug(data.public_link_slug || '');
      } else {
        // Criar configurações padrão
        const { data: newSettings, error: createError } = await supabase
          .from('booking_settings')
          .insert({
            user_id: user.id,
            public_link_slug: null,
          })
          .select()
          .single();

        if (createError) throw createError;
        setSettings(newSettings);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  }, [user?.id]);

  // Salvar serviço
  const handleSaveService = useCallback(async () => {
    if (!user?.id || !serviceName.trim() || !servicePrice) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    try {
      const serviceData = {
        user_id: user.id,
        name: serviceName.trim(),
        description: serviceDescription.trim() || null,
        duration_minutes: parseInt(serviceDuration),
        price: parseFloat(servicePrice),
        advance_payment_percentage: parseInt(advancePercentage),
        is_active: serviceActive,
      };

      if (editingService) {
        const { error } = await supabase
          .from('services')
          .update(serviceData)
          .eq('id', editingService.id);

        if (error) throw error;
        toast.success("Serviço atualizado com sucesso!");
      } else {
        const { error } = await supabase
          .from('services')
          .insert(serviceData);

        if (error) throw error;
        toast.success("Serviço criado com sucesso!");
      }

      setShowServiceModal(false);
      resetServiceForm();
      await loadServices();
    } catch (error) {
      console.error('Erro ao salvar serviço:', error);
      toast.error('Erro ao salvar serviço');
    }
  }, [user?.id, serviceName, serviceDescription, serviceDuration, servicePrice, advancePercentage, serviceActive, editingService, loadServices]);

  // Resetar formulário de serviço
  const resetServiceForm = useCallback(() => {
    setServiceName("");
    setServiceDescription("");
    setServiceDuration("30");
    setServicePrice("");
    setAdvancePercentage("50");
    setServiceActive(true);
    setEditingService(null);
  }, []);

  // Editar serviço
  const handleEditService = useCallback((service: Service) => {
    setEditingService(service);
    setServiceName(service.name);
    setServiceDescription(service.description || "");
    setServiceDuration(service.duration_minutes.toString());
    setServicePrice(service.price.toString());
    setAdvancePercentage(service.advance_payment_percentage.toString());
    setServiceActive(service.is_active);
    setShowServiceModal(true);
  }, []);

  // Deletar serviço
  const handleDeleteService = useCallback(async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar este serviço?')) return;

    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success("Serviço deletado com sucesso!");
      await loadServices();
    } catch (error) {
      console.error('Erro ao deletar serviço:', error);
      toast.error('Erro ao deletar serviço');
    }
  }, [loadServices]);

  // Salvar configurações
  const handleSaveSettings = useCallback(async () => {
    if (!user?.id || !settings) return;

    try {
      // Gerar slug se não tiver
      let slug = publicLinkSlug.trim();
      if (!slug) {
        // Gerar slug baseado no nome do usuário ou email
        const baseName = user.full_name || user.email?.split('@')[0] || 'agendamento';
        slug = baseName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        
        // Verificar se já existe
        const { data: existing } = await supabase
          .from('booking_settings')
          .select('public_link_slug')
          .eq('public_link_slug', slug)
          .neq('user_id', user.id)
          .single();

        if (existing) {
          slug = `${slug}-${Date.now().toString().slice(-6)}`;
        }
      }

      const { error } = await supabase
        .from('booking_settings')
        .update({
          public_link_slug: slug || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', settings.id);

      if (error) throw error;
      toast.success("Configurações salvas com sucesso!");
      setShowSettingsModal(false);
      await loadSettings();
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast.error('Erro ao salvar configurações');
    }
  }, [user?.id, settings, publicLinkSlug, loadSettings]);

  // Copiar link público
  const handleCopyPublicLink = useCallback(() => {
    if (!settings?.public_link_slug) {
      toast.error("Configure o link público primeiro nas configurações.");
      return;
    }

    const publicUrl = `${window.location.origin}/agendamento/${settings.public_link_slug}`;
    navigator.clipboard.writeText(publicUrl);
    toast.success("Link copiado para a área de transferência!");
  }, [settings]);

  // Filtrar agendamentos
  const filteredBookings = useMemo(() => {
    let filtered = bookings;

    if (searchTerm) {
      filtered = filtered.filter(b => 
        b.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.client_phone.includes(searchTerm) ||
        (b.services?.name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(b => b.status === statusFilter);
    }

    return filtered;
  }, [bookings, searchTerm, statusFilter]);

  // Status badge
  const getStatusBadge = useCallback((status: string) => {
    const badges: Record<string, { className: string; label: string }> = {
      pending: { className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50", label: "Pendente" },
      confirmed: { className: "bg-blue-500/20 text-blue-400 border-blue-500/50", label: "Confirmado" },
      completed: { className: "bg-green-500/20 text-green-400 border-green-500/50", label: "Concluído" },
      cancelled: { className: "bg-red-500/20 text-red-400 border-red-500/50", label: "Cancelado" },
      no_show: { className: "bg-gray-500/20 text-gray-400 border-gray-500/50", label: "Não Compareceu" },
    };
    const badge = badges[status] || badges.pending;
    return <Badge className={badge.className}>{badge.label}</Badge>;
  }, []);

  // Carregar ao montar
  useEffect(() => {
    loadServices();
    loadBookings();
    loadSettings();
  }, [loadServices, loadBookings, loadSettings]);

  const publicUrl = settings?.public_link_slug 
    ? `${window.location.origin}/agendamento/${settings.public_link_slug}`
    : null;

  return (
    <div className="min-h-screen tech-grid-bg pb-24">
      <PageHeader title="Agendamentos" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-4 animate-slide-up">
        {/* Link Público e Configurações */}
        <GlassCard className="border-accent-cyan/20 bg-gradient-to-br from-accent-cyan/5 to-accent-purple/5">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex-1">
              <h2 className="text-lg font-bold flex items-center gap-2 mb-2">
                <ExternalLink className="w-5 h-5 text-accent-cyan" />
                Link Público de Agendamento
              </h2>
              {publicUrl ? (
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-black/20 px-2 py-1 rounded flex-1 break-all">
                    {publicUrl}
                  </code>
                  <Button
                    onClick={handleCopyPublicLink}
                    variant="outline"
                    size="sm"
                    className="border-accent-cyan/50 text-accent-cyan hover:bg-accent-cyan/10"
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    Copiar
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Configure o link público nas configurações para permitir que clientes agendem online.
                </p>
              )}
            </div>
            <Button
              onClick={() => setShowSettingsModal(true)}
              variant="outline"
              size="sm"
              className="border-accent-purple/50 text-accent-purple hover:bg-accent-purple/10"
            >
              <Settings className="w-4 h-4 mr-1" />
              Configurações
            </Button>
          </div>
        </GlassCard>

        {/* Serviços */}
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <FileText className="w-5 h-5 text-accent-purple" />
              Serviços
            </h2>
            <GradientButton
              onClick={() => {
                resetServiceForm();
                setShowServiceModal(true);
              }}
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Serviço
            </GradientButton>
          </div>

          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">Nenhum serviço cadastrado</p>
              <p className="text-xs text-muted-foreground mt-2">
                Crie serviços para que seus clientes possam agendar
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.map((service) => (
                <GlassCard key={service.id} className="border-border/30">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold flex items-center gap-2">
                        {service.name}
                        {!service.is_active && (
                          <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/50 text-xs">
                            Inativo
                          </Badge>
                        )}
                      </h3>
                      {service.description && (
                        <p className="text-xs text-muted-foreground mt-1">{service.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-3">
                    <div className="flex items-center gap-4">
                      <span className="text-muted-foreground">
                        <Clock className="w-3 h-3 inline mr-1" />
                        {service.duration_minutes}min
                      </span>
                      <span className="font-semibold text-accent-cyan">
                        <DollarSign className="w-3 h-3 inline mr-1" />
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(service.price)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-border/30 flex gap-2">
                    <Button
                      onClick={() => handleEditService(service)}
                      variant="outline"
                      size="sm"
                      className="flex-1 border-border/50 hover:bg-white/5"
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Editar
                    </Button>
                    <Button
                      onClick={() => handleDeleteService(service.id)}
                      variant="outline"
                      size="sm"
                      className="border-destructive/50 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Agendamentos */}
        <GlassCard>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-accent-cyan" />
              Agendamentos
            </h2>
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente ou serviço..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-bg-input border-border/50"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40 bg-bg-input border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="confirmed">Confirmado</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">Nenhum agendamento encontrado</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredBookings.map((booking) => {
                const bookingDateTime = new Date(`${booking.booking_date}T${booking.booking_time}`);
                const formattedDate = bookingDateTime.toLocaleDateString('pt-BR', {
                  weekday: 'long',
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                });
                const formattedTime = bookingDateTime.toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <GlassCard key={booking.id} className="border-border/30">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{booking.client_name}</h3>
                          {getStatusBadge(booking.status)}
                          {booking.advance_payment_status === 'paid' && (
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/50 text-xs">
                              Pagamento OK
                            </Badge>
                          )}
                        </div>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <FileText className="w-3 h-3" />
                            <span>{booking.services?.name || 'Serviço removido'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3 h-3" />
                            <span>{formattedDate} às {formattedTime}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="w-3 h-3" />
                            <span>{booking.client_phone}</span>
                          </div>
                          {booking.client_email && (
                            <div className="flex items-center gap-2">
                              <Mail className="w-3 h-3" />
                              <span>{booking.client_email}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-3 h-3" />
                            <span>
                              Total: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(booking.total_price)} 
                              {' '}({booking.advance_payment_percentage || 50}% pago: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(booking.advance_payment)})
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-accent-purple/50 text-accent-purple hover:bg-accent-purple/10"
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Editar
                        </Button>
                      </div>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          )}
        </GlassCard>
      </div>

      {/* Modal de Serviço */}
      <Dialog open={showServiceModal} onOpenChange={setShowServiceModal}>
        <DialogContent className="max-w-lg w-full p-0 bg-[hsl(var(--bg-primary))] border-border/50">
          <div className="glass rounded-2xl p-6 space-y-4">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">
                {editingService ? 'Editar Serviço' : 'Novo Serviço'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>Nome do Serviço *</Label>
                <Input
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  placeholder="Ex: Corte de Cabelo, Consulta Médica..."
                  className="bg-bg-input border-border/50 mt-1"
                />
              </div>

              <div>
                <Label>Descrição</Label>
                <Textarea
                  value={serviceDescription}
                  onChange={(e) => setServiceDescription(e.target.value)}
                  placeholder="Descreva o serviço..."
                  rows={3}
                  className="bg-bg-input border-border/50 mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Duração (minutos) *</Label>
                  <Input
                    type="number"
                    value={serviceDuration}
                    onChange={(e) => setServiceDuration(e.target.value)}
                    className="bg-bg-input border-border/50 mt-1"
                  />
                </div>
                <div>
                  <Label>Preço (R$) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={servicePrice}
                    onChange={(e) => setServicePrice(e.target.value)}
                    placeholder="0.00"
                    className="bg-bg-input border-border/50 mt-1"
                  />
                </div>
              </div>

              <div>
                <Label>Pagamento Antecipado (%)</Label>
                <Input
                  type="number"
                  value={advancePercentage}
                  onChange={(e) => setAdvancePercentage(e.target.value)}
                  placeholder="50"
                  className="bg-bg-input border-border/50 mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Porcentagem do valor total que deve ser pago no agendamento
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="serviceActive"
                  checked={serviceActive}
                  onChange={(e) => setServiceActive(e.target.checked)}
                  className="w-4 h-4"
                />
                <Label htmlFor="serviceActive" className="cursor-pointer">
                  Serviço ativo (visível para agendamento)
                </Label>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowServiceModal(false);
                    resetServiceForm();
                  }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <GradientButton
                  onClick={handleSaveService}
                  className="flex-1"
                  disabled={!serviceName.trim() || !servicePrice}
                >
                  {editingService ? 'Atualizar' : 'Criar'}
                </GradientButton>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Configurações */}
      <Dialog open={showSettingsModal} onOpenChange={setShowSettingsModal}>
        <DialogContent className="max-w-lg w-full p-0 bg-[hsl(var(--bg-primary))] border-border/50">
          <div className="glass rounded-2xl p-6 space-y-4">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">
                Configurações de Agendamento
              </DialogTitle>
              <DialogDescription>
                Configure o link público e outras opções de agendamento
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>Slug do Link Público</Label>
                <Input
                  value={publicLinkSlug}
                  onChange={(e) => setPublicLinkSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="ex: minha-barbearia"
                  className="bg-bg-input border-border/50 mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  O link será: {window.location.origin}/agendamento/{publicLinkSlug || '[seu-slug]'}
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowSettingsModal(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <GradientButton
                  onClick={handleSaveSettings}
                  className="flex-1"
                >
                  Salvar
                </GradientButton>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
});

Bookings.displayName = 'Bookings';

export default Bookings;

