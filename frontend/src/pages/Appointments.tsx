import { useState, useMemo, useCallback, memo, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { GlassCard } from "@/components/GlassCard";
import { GradientButton } from "@/components/GradientButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useServices, useAppointments, usePublicBookingLink, useProfessionals, useAvailabilitySlots, useAppointmentMessageTemplates, Service, Appointment, Professional, AvailabilitySlot } from "@/hooks/useAppointments";
import { useConnections } from "@/hooks/useConnections";
import { 
  Calendar, Clock, User, Phone, Mail, DollarSign, Plus, Edit, Trash2, 
  CheckCircle, XCircle, Copy, ExternalLink, Settings, AlertCircle, Info,
  Users, CalendarDays, Smartphone
} from "lucide-react";
import { toast } from "sonner";
import { BottomNav } from "@/components/BottomNav";
import { Skeleton } from "@/components/Skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Valores padrão das mensagens
const defaultClientConfirmed = '🔔 *Atualização do seu Agendamento*\n\n✅ Seu agendamento foi *confirmado*!\n\n📅 *Data:* {{date}}\n🕐 *Horário:* {{time}}\n💼 *Serviço:* {{service}}\n💰 *Valor Total:* {{amount}}\n\nEstamos ansiosos para atendê-lo! 🎯';
const defaultClientCompleted = '🔔 *Atualização do seu Agendamento*\n\n✅ Seu agendamento foi *concluído*!\n\n📅 *Data:* {{date}}\n🕐 *Horário:* {{time}}\n💼 *Serviço:* {{service}}\n💰 *Valor Total:* {{amount}}\n\nObrigado por escolher nossos serviços! 🙏';
const defaultClientCancelled = '🔔 *Atualização do seu Agendamento*\n\n❌ Seu agendamento foi *cancelado*.\n\n📅 *Data:* {{date}}\n🕐 *Horário:* {{time}}\n💼 *Serviço:* {{service}}\n💰 *Valor Total:* {{amount}}\n\nEntre em contato conosco se tiver dúvidas.';
const defaultClientNoShow = '🔔 *Atualização do seu Agendamento*\n\n⚠️ Seu agendamento foi marcado como *não compareceu*.\n\n📅 *Data:* {{date}}\n🕐 *Horário:* {{time}}\n💼 *Serviço:* {{service}}\n💰 *Valor Total:* {{amount}}\n\nEntre em contato conosco se tiver dúvidas.';
const defaultProfessionalConfirmed = '🔔 *Atualização de Agendamento*\n\n✅ Agendamento *confirmado*:\n\n👤 *Cliente:* {{client_name}}\n📞 *Telefone:* {{client_phone}}\n📅 *Data:* {{date}}\n🕐 *Horário:* {{time}}\n💼 *Serviço:* {{service}}\n💰 *Valor Total:* {{amount}}\n\nPrepare-se para o atendimento! 🎯';
const defaultProfessionalCompleted = '🔔 *Atualização de Agendamento*\n\n✅ Agendamento *concluído*:\n\n👤 *Cliente:* {{client_name}}\n📞 *Telefone:* {{client_phone}}\n📅 *Data:* {{date}}\n🕐 *Horário:* {{time}}\n💼 *Serviço:* {{service}}\n💰 *Valor Total:* {{amount}}\n\nAtendimento finalizado com sucesso! ✅';
const defaultProfessionalCancelled = '🔔 *Atualização de Agendamento*\n\n❌ Agendamento *cancelado*:\n\n👤 *Cliente:* {{client_name}}\n📞 *Telefone:* {{client_phone}}\n📅 *Data:* {{date}}\n🕐 *Horário:* {{time}}\n💼 *Serviço:* {{service}}\n💰 *Valor Total:* {{amount}}';
const defaultProfessionalNoShow = '🔔 *Atualização de Agendamento*\n\n⚠️ Cliente *não compareceu*:\n\n👤 *Cliente:* {{client_name}}\n📞 *Telefone:* {{client_phone}}\n📅 *Data:* {{date}}\n🕐 *Horário:* {{time}}\n💼 *Serviço:* {{service}}\n💰 *Valor Total:* {{amount}}';

const Appointments = memo(() => {
  const { services, isLoading: servicesLoading, createService, updateService, deleteService } = useServices();
  const { appointments, isLoading: appointmentsLoading, updateAppointmentStatus, updateAppointment, deleteAppointment } = useAppointments();
  const { bookingLink, isLoading: linkLoading, createOrUpdateLink } = usePublicBookingLink();
  const { professionals, isLoading: professionalsLoading, createProfessional, updateProfessional, deleteProfessional } = useProfessionals();
  const { slots, isLoading: slotsLoading, saveSlot, deleteSlot } = useAvailabilitySlots();
  const { templates, isLoading: templatesLoading, updateTemplates } = useAppointmentMessageTemplates();
  const { connections } = useConnections();

  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [serviceName, setServiceName] = useState("");
  const [serviceDescription, setServiceDescription] = useState("");
  const [serviceDuration, setServiceDuration] = useState("30");
  const [servicePrice, setServicePrice] = useState("");
  const [advancePercentage, setAdvancePercentage] = useState("50");
  const [customMessage, setCustomMessage] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showProfessionalModal, setShowProfessionalModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingProfessional, setEditingProfessional] = useState<Professional | null>(null);
  const [professionalName, setProfessionalName] = useState("");
  const [professionalEmail, setProfessionalEmail] = useState("");
  const [professionalPhone, setProfessionalPhone] = useState("");
  const [professionalSpecialties, setProfessionalSpecialties] = useState("");
  const [scheduleTimes, setScheduleTimes] = useState<Record<number, { start: string; end: string; lunchStart?: string; lunchEnd?: string }>>({});
  const [professionalViewMode, setProfessionalViewMode] = useState<'list' | 'card'>('list');
  const [serviceViewMode, setServiceViewMode] = useState<'list' | 'card'>('card');
  const [scheduleServiceDuration, setScheduleServiceDuration] = useState("30");
  const [scheduleTimeInterval, setScheduleTimeInterval] = useState("10");
  const [appointmentViewMode, setAppointmentViewMode] = useState<'list' | 'card'>('card');
  const [showEditAppointmentModal, setShowEditAppointmentModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [editClientName, setEditClientName] = useState("");
  const [editClientPhone, setEditClientPhone] = useState("");
  const [editClientEmail, setEditClientEmail] = useState("");
  const [editAppointmentDate, setEditAppointmentDate] = useState("");
  const [editAppointmentTime, setEditAppointmentTime] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editServiceId, setEditServiceId] = useState("");
  const [editProfessionalId, setEditProfessionalId] = useState("");
  const [showMessageTemplatesModal, setShowMessageTemplatesModal] = useState(false);
  const [messageTemplateConfirmed, setMessageTemplateConfirmed] = useState("");
  const [messageTemplateCompleted, setMessageTemplateCompleted] = useState("");
  const [messageTemplateCancelled, setMessageTemplateCancelled] = useState("");
  const [messageTemplateNoShow, setMessageTemplateNoShow] = useState("");
  const [messageTemplateProfessionalConfirmed, setMessageTemplateProfessionalConfirmed] = useState("");
  const [messageTemplateProfessionalCompleted, setMessageTemplateProfessionalCompleted] = useState("");
  const [messageTemplateProfessionalCancelled, setMessageTemplateProfessionalCancelled] = useState("");
  const [messageTemplateProfessionalNoShow, setMessageTemplateProfessionalNoShow] = useState("");

  // Carregar templates quando disponíveis (preencher com padrão se vazio)
  useEffect(() => {
    if (templates) {
      setMessageTemplateConfirmed(templates.message_template_confirmed || defaultClientConfirmed);
      setMessageTemplateCompleted(templates.message_template_completed || defaultClientCompleted);
      setMessageTemplateCancelled(templates.message_template_cancelled || defaultClientCancelled);
      setMessageTemplateNoShow(templates.message_template_no_show || defaultClientNoShow);
      setMessageTemplateProfessionalConfirmed(templates.message_template_professional_confirmed || defaultProfessionalConfirmed);
      setMessageTemplateProfessionalCompleted(templates.message_template_professional_completed || defaultProfessionalCompleted);
      setMessageTemplateProfessionalCancelled(templates.message_template_professional_cancelled || defaultProfessionalCancelled);
      setMessageTemplateProfessionalNoShow(templates.message_template_professional_no_show || defaultProfessionalNoShow);
    } else if (!templatesLoading) {
      // Se não houver templates e não estiver carregando, usar valores padrão
      setMessageTemplateConfirmed(defaultClientConfirmed);
      setMessageTemplateCompleted(defaultClientCompleted);
      setMessageTemplateCancelled(defaultClientCancelled);
      setMessageTemplateNoShow(defaultClientNoShow);
      setMessageTemplateProfessionalConfirmed(defaultProfessionalConfirmed);
      setMessageTemplateProfessionalCompleted(defaultProfessionalCompleted);
      setMessageTemplateProfessionalCancelled(defaultProfessionalCancelled);
      setMessageTemplateProfessionalNoShow(defaultProfessionalNoShow);
    }
  }, [templates, templatesLoading]);

  // Salvar automaticamente a primeira instância como padrão se não houver nenhuma selecionada
  useEffect(() => {
    if (
      !templatesLoading && 
      templates && 
      !templates.default_connection_id && 
      connections.length > 0 &&
      updateTemplates
    ) {
      // Salvar a primeira instância automaticamente (apenas se não houver erro de schema)
      updateTemplates.mutateAsync({
        default_connection_id: connections[0].id,
      }).catch(error => {
        // Se o erro for de coluna não encontrada, não tentar novamente
        if (error?.code === 'PGRST204' || error?.message?.includes('default_connection_id')) {
          console.warn('Coluna default_connection_id não existe ainda. Execute a migração 021_appointment_default_connection.sql no Supabase.');
        } else {
          console.error('Erro ao salvar instância padrão automaticamente:', error);
        }
      });
    }
  }, [templates, templatesLoading, connections, updateTemplates]);

  // Filtrar agendamentos
  const filteredAppointments = useMemo(() => {
    let filtered = appointments;

    if (filterStatus !== "all") {
      filtered = filtered.filter(apt => apt.status === filterStatus);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(apt =>
        apt.client_name.toLowerCase().includes(term) ||
        apt.client_phone.includes(term) ||
        apt.service?.name.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [appointments, filterStatus, searchTerm]);

  // Resetar formulário de serviço
  const resetServiceForm = useCallback(() => {
    setServiceName("");
    setServiceDescription("");
    setServiceDuration("30");
    setServicePrice("");
    setAdvancePercentage("50");
    setEditingService(null);
  }, []);

  // Abrir modal para editar serviço
  const handleEditService = useCallback((service: Service) => {
    setEditingService(service);
    setServiceName(service.name);
    setServiceDescription(service.description || "");
    setServiceDuration(service.duration_minutes.toString());
    setServicePrice(service.price.toString());
    setAdvancePercentage(service.advance_payment_percentage.toString());
    setShowServiceModal(true);
  }, []);

  // Salvar serviço
  const handleSaveService = useCallback(async () => {
    if (!serviceName.trim() || !servicePrice) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    try {
      const serviceData = {
        name: serviceName.trim(),
        description: serviceDescription.trim() || null,
        duration_minutes: parseInt(serviceDuration),
        price: parseFloat(servicePrice),
        advance_payment_percentage: parseInt(advancePercentage),
        is_active: true,
      };

      if (editingService) {
        await updateService.mutateAsync({ id: editingService.id, ...serviceData });
        toast.success("Serviço atualizado com sucesso!");
      } else {
        await createService.mutateAsync(serviceData);
        toast.success("Serviço criado com sucesso!");
      }

      setShowServiceModal(false);
      resetServiceForm();
    } catch (error) {
      console.error('Erro ao salvar serviço:', error);
      toast.error('Erro ao salvar serviço');
    }
  }, [serviceName, serviceDescription, serviceDuration, servicePrice, advancePercentage, editingService, createService, updateService, resetServiceForm]);

  // Copiar link público
  const handleCopyLink = useCallback(() => {
    if (!bookingLink) {
      toast.error("Gere o link público primeiro");
      return;
    }

    const link = `${window.location.origin}/agendamento/${bookingLink.public_token}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copiado para a área de transferência!");
  }, [bookingLink]);

  // Gerar/Atualizar link público
  const handleGenerateLink = useCallback(async () => {
    try {
      await createOrUpdateLink.mutateAsync(customMessage.trim() || undefined);
      toast.success("Link público gerado/atualizado com sucesso!");
      setShowLinkModal(false);
    } catch (error) {
      console.error('Erro ao gerar link:', error);
      toast.error('Erro ao gerar link público');
    }
  }, [customMessage, createOrUpdateLink]);

  // Obter badge de status
  const getStatusBadge = useCallback((status: Appointment['status']) => {
    const badges = {
      pending: <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">Pendente</Badge>,
      confirmed: <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">Confirmado</Badge>,
      completed: <Badge className="bg-green-500/20 text-green-400 border-green-500/50">Concluído</Badge>,
      cancelled: <Badge className="bg-red-500/20 text-red-400 border-red-500/50">Cancelado</Badge>,
      no_show: <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/50">Não Apareceu</Badge>,
    };
    return badges[status] || badges.pending;
  }, []);

  // Obter badge de pagamento
  const getPaymentBadge = useCallback((paymentStatus: Appointment['payment_status']) => {
    const badges = {
      pending: <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">Pendente</Badge>,
      partial: <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/50">Parcial (50%)</Badge>,
      paid: <Badge className="bg-green-500/20 text-green-400 border-green-500/50">Pago</Badge>,
      refunded: <Badge className="bg-red-500/20 text-red-400 border-red-500/50">Reembolsado</Badge>,
    };
    return badges[paymentStatus] || badges.pending;
  }, []);

  // Função para substituir variáveis nos templates
  const replaceTemplateVariables = useCallback((template: string, appointment: Appointment, appointmentDateFormatted: string) => {
    return template
      .replace(/\{\{date\}\}/g, appointmentDateFormatted)
      .replace(/\{\{time\}\}/g, appointment.appointment_time)
      .replace(/\{\{service\}\}/g, appointment.service?.name || 'N/A')
      .replace(/\{\{amount\}\}/g, new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(appointment.total_amount))
      .replace(/\{\{client_name\}\}/g, appointment.client_name)
      .replace(/\{\{client_phone\}\}/g, appointment.client_phone);
  }, []);

  // Atualizar status do agendamento
  const handleUpdateStatus = useCallback(async (id: string, status: Appointment['status']) => {
    try {
      await updateAppointmentStatus.mutateAsync({ id, status });
      
      // Buscar dados do agendamento para notificar
      const appointment = appointments.find(a => a.id === id);
      if (!appointment) return;
      
      try {
        const { supabase } = await import('@/lib/supabase');
        
        // Buscar instância padrão ou primeira online disponível
        let selectedConnection = null;
        
        if (templates?.default_connection_id) {
          // Buscar instância padrão
          const { data: defaultConn } = await supabase
            .from('connections')
            .select('id, api_instance_token, status, name')
            .eq('id', templates.default_connection_id)
            .eq('user_id', appointment.user_id)
            .single();
          
          if (defaultConn && defaultConn.status === 'online') {
            selectedConnection = defaultConn;
          }
        }
        
        // Se não encontrou a padrão ou não está online, buscar primeira online
        if (!selectedConnection) {
          const { data: onlineConn } = await supabase
            .from('connections')
            .select('id, api_instance_token, status, name')
            .eq('user_id', appointment.user_id)
            .eq('status', 'online')
            .limit(1)
            .maybeSingle();
          
          if (onlineConn) {
            selectedConnection = onlineConn;
          }
        }

        if (selectedConnection?.api_instance_token) {
          const { whatsappApi, cleanPhoneNumber } = await import('@/lib/whatsapp-api');
          
          // Formatar data
          let appointmentDateFormatted = '';
          if (typeof appointment.appointment_date === 'string') {
            const [year, month, day] = appointment.appointment_date.split('-');
            const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            appointmentDateFormatted = date.toLocaleDateString('pt-BR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            });
          } else {
            appointmentDateFormatted = new Date(appointment.appointment_date).toLocaleDateString('pt-BR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            });
          }

          // Notificar CLIENTE sobre mudança de status
          if (appointment.client_phone) {
            try {
              const clientPhone = cleanPhoneNumber(appointment.client_phone);
              
              // Verificar se o número tem WhatsApp
              const checkResult = await whatsappApi.checkUser(
                selectedConnection.api_instance_token,
                [clientPhone]
              );

              if (checkResult.success) {
                const validUser = checkResult.data?.Users?.find(user => {
                  const userQuery = cleanPhoneNumber(user.Query.replace('@s.whatsapp.net', ''));
                  const userJIDNumber = user.JID ? cleanPhoneNumber(user.JID.replace('@s.whatsapp.net', '')) : '';
                  return (userQuery === clientPhone || userJIDNumber === clientPhone) && user.IsInWhatsapp === true;
                });

                if (validUser) {
                  const clientJID = validUser.JID || `${clientPhone}@s.whatsapp.net`;
                  
                  // Usar template personalizado ou padrão
                  let template = '';
                  if (status === 'confirmed' && templates?.message_template_confirmed) {
                    template = templates.message_template_confirmed;
                  } else if (status === 'completed' && templates?.message_template_completed) {
                    template = templates.message_template_completed;
                  } else if (status === 'cancelled' && templates?.message_template_cancelled) {
                    template = templates.message_template_cancelled;
                  } else if (status === 'no_show' && templates?.message_template_no_show) {
                    template = templates.message_template_no_show;
                  }
                  
                  // Se não tiver template personalizado, usar padrão
                  if (!template) {
                    if (status === 'confirmed') {
                      template = `🔔 *Atualização do seu Agendamento*\n\n✅ Seu agendamento foi *confirmado*!\n\n📅 *Data:* {{date}}\n🕐 *Horário:* {{time}}\n💼 *Serviço:* {{service}}\n💰 *Valor Total:* {{amount}}\n\nEstamos ansiosos para atendê-lo! 🎯`;
                    } else if (status === 'completed') {
                      template = `🔔 *Atualização do seu Agendamento*\n\n✅ Seu agendamento foi *concluído*!\n\n📅 *Data:* {{date}}\n🕐 *Horário:* {{time}}\n💼 *Serviço:* {{service}}\n💰 *Valor Total:* {{amount}}\n\nObrigado por escolher nossos serviços! 🙏`;
                    } else if (status === 'cancelled') {
                      template = `🔔 *Atualização do seu Agendamento*\n\n❌ Seu agendamento foi *cancelado*.\n\n📅 *Data:* {{date}}\n🕐 *Horário:* {{time}}\n💼 *Serviço:* {{service}}\n💰 *Valor Total:* {{amount}}\n\nEntre em contato conosco se tiver dúvidas.`;
                    } else if (status === 'no_show') {
                      template = `🔔 *Atualização do seu Agendamento*\n\n⚠️ Seu agendamento foi marcado como *não compareceu*.\n\n📅 *Data:* {{date}}\n🕐 *Horário:* {{time}}\n💼 *Serviço:* {{service}}\n💰 *Valor Total:* {{amount}}\n\nEntre em contato conosco se tiver dúvidas.`;
                    }
                  }
                  
                  const clientMessage = replaceTemplateVariables(template, appointment, appointmentDateFormatted);

                  await whatsappApi.sendText(
                    selectedConnection.api_instance_token,
                    clientJID,
                    clientMessage
                  );
                }
              }
            } catch (clientNotifyError) {
              console.error('Erro ao notificar cliente:', clientNotifyError);
            }
          }

          // Notificar profissional se houver
          if (appointment.professional_id && appointment.professional?.phone) {
            try {
              const professionalPhone = cleanPhoneNumber(appointment.professional.phone);
              
              const checkResult = await whatsappApi.checkUser(
                selectedConnection.api_instance_token,
                [professionalPhone]
              );

              if (checkResult.success) {
                const validUser = checkResult.data?.Users?.find(user => {
                  const userQuery = cleanPhoneNumber(user.Query.replace('@s.whatsapp.net', ''));
                  const userJIDNumber = user.JID ? cleanPhoneNumber(user.JID.replace('@s.whatsapp.net', '')) : '';
                  return (userQuery === professionalPhone || userJIDNumber === professionalPhone) && user.IsInWhatsapp === true;
                });

                if (validUser) {
                  const professionalJID = validUser.JID || `${professionalPhone}@s.whatsapp.net`;
                  
                  // Usar template personalizado ou padrão
                  let template = '';
                  if (status === 'confirmed' && templates?.message_template_professional_confirmed) {
                    template = templates.message_template_professional_confirmed;
                  } else if (status === 'completed' && templates?.message_template_professional_completed) {
                    template = templates.message_template_professional_completed;
                  } else if (status === 'cancelled' && templates?.message_template_professional_cancelled) {
                    template = templates.message_template_professional_cancelled;
                  } else if (status === 'no_show' && templates?.message_template_professional_no_show) {
                    template = templates.message_template_professional_no_show;
                  }
                  
                  // Se não tiver template personalizado, usar padrão
                  if (!template) {
                    if (status === 'confirmed') {
                      template = `🔔 *Atualização de Agendamento*\n\n✅ Agendamento *confirmado*:\n\n👤 *Cliente:* {{client_name}}\n📞 *Telefone:* {{client_phone}}\n📅 *Data:* {{date}}\n🕐 *Horário:* {{time}}\n💼 *Serviço:* {{service}}\n💰 *Valor Total:* {{amount}}\n\nPrepare-se para o atendimento! 🎯`;
                    } else if (status === 'completed') {
                      template = `🔔 *Atualização de Agendamento*\n\n✅ Agendamento *concluído*:\n\n👤 *Cliente:* {{client_name}}\n📞 *Telefone:* {{client_phone}}\n📅 *Data:* {{date}}\n🕐 *Horário:* {{time}}\n💼 *Serviço:* {{service}}\n💰 *Valor Total:* {{amount}}\n\nAtendimento finalizado com sucesso! ✅`;
                    } else if (status === 'cancelled') {
                      template = `🔔 *Atualização de Agendamento*\n\n❌ Agendamento *cancelado*:\n\n👤 *Cliente:* {{client_name}}\n📞 *Telefone:* {{client_phone}}\n📅 *Data:* {{date}}\n🕐 *Horário:* {{time}}\n💼 *Serviço:* {{service}}\n💰 *Valor Total:* {{amount}}`;
                    } else if (status === 'no_show') {
                      template = `🔔 *Atualização de Agendamento*\n\n⚠️ Cliente *não compareceu*:\n\n👤 *Cliente:* {{client_name}}\n📞 *Telefone:* {{client_phone}}\n📅 *Data:* {{date}}\n🕐 *Horário:* {{time}}\n💼 *Serviço:* {{service}}\n💰 *Valor Total:* {{amount}}`;
                    }
                  }
                  
                  const professionalMessage = replaceTemplateVariables(template, appointment, appointmentDateFormatted);

                  await whatsappApi.sendText(
                    selectedConnection.api_instance_token,
                    professionalJID,
                    professionalMessage
                  );
                }
              }
            } catch (professionalNotifyError) {
              console.error('Erro ao notificar profissional:', professionalNotifyError);
            }
          }
        }
      } catch (notifyError) {
        console.error('Erro ao enviar notificações:', notifyError);
        // Não falhar a atualização se a notificação falhar
      }
      
      toast.success("Status atualizado com sucesso!");
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status');
    }
  }, [updateAppointmentStatus, appointments, templates, replaceTemplateVariables]);

  const publicLink = bookingLink ? `${window.location.origin}/agendamento/${bookingLink.public_token}` : null;

  // Mostrar loading apenas se estiver carregando E tiver usuário
  const isLoading = servicesLoading || appointmentsLoading || linkLoading;

  return (
    <div className="min-h-screen tech-grid-bg pb-24">
      <PageHeader title="Agendamentos" />

      {isLoading ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-4 animate-slide-up">
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-accent-purple border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        </div>
      ) : (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-4 animate-slide-up">
        {/* Link Público */}
        <GlassCard className="border-accent-cyan/20 bg-gradient-to-br from-accent-cyan/5 to-accent-purple/5">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h2 className="text-lg font-bold flex items-center gap-2 mb-2">
                <ExternalLink className="w-5 h-5 text-accent-cyan" />
                Link Público de Agendamento
              </h2>
              {publicLink ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-border/30">
                    <code className="text-xs flex-1 break-all text-accent-cyan">{publicLink}</code>
                    <Button
                      onClick={handleCopyLink}
                      variant="outline"
                      size="sm"
                      className="border-accent-cyan/50 text-accent-cyan hover:bg-accent-cyan/10"
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      Copiar
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Compartilhe este link com seus clientes para que eles possam agendar serviços
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Gere um link público para seus clientes agendarem serviços
                </p>
              )}
            </div>
            <Button
              onClick={() => {
                if (bookingLink) {
                  setCustomMessage(bookingLink.custom_message || "");
                }
                setShowLinkModal(true);
              }}
              variant="outline"
              size="sm"
              className="border-accent-cyan/50 text-accent-cyan hover:bg-accent-cyan/10"
            >
              {publicLink ? <Settings className="w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
              {publicLink ? 'Editar' : 'Gerar Link'}
            </Button>
          </div>
        </GlassCard>

        {/* Serviços */}
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Settings className="w-5 h-5 text-accent-purple" />
              Meus Serviços
            </h2>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1 border border-border/50">
                <Button
                  onClick={() => setServiceViewMode('list')}
                  variant="ghost"
                  size="sm"
                  className={`h-7 px-2 ${serviceViewMode === 'list' ? 'bg-accent-purple/20 text-accent-purple' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <span className="text-xs">Lista</span>
                </Button>
                <Button
                  onClick={() => setServiceViewMode('card')}
                  variant="ghost"
                  size="sm"
                  className={`h-7 px-2 ${serviceViewMode === 'card' ? 'bg-accent-purple/20 text-accent-purple' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <span className="text-xs">Card</span>
                </Button>
              </div>
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
          </div>

          {servicesLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-8">
              <Settings className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">Nenhum serviço cadastrado</p>
              <p className="text-xs text-muted-foreground mt-2">
                Crie serviços para que seus clientes possam agendar
              </p>
            </div>
          ) : serviceViewMode === 'list' ? (
            <div className="space-y-2">
              {services.map((service) => (
                <GlassCard key={service.id} className="border-border/30 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-sm truncate">{service.name}</h3>
                        {!service.is_active && (
                          <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/50 text-xs shrink-0">Inativo</Badge>
                        )}
                      </div>
                      {service.description && (
                        <p className="text-xs text-muted-foreground truncate mb-1">{service.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Duração: {service.duration_minutes}min</span>
                        <span>Preço: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(service.price)}</span>
                        <span>Entrada: {service.advance_payment_percentage}%</span>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        onClick={() => handleEditService(service)}
                        variant="outline"
                        size="sm"
                        className="border-border/50 hover:bg-white/5 h-8 px-2"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        onClick={async () => {
                          if (confirm('Tem certeza que deseja deletar este serviço?')) {
                            try {
                              await deleteService.mutateAsync(service.id);
                              toast.success("Serviço deletado com sucesso!");
                            } catch (error) {
                              console.error('Erro ao deletar serviço:', error);
                              toast.error('Erro ao deletar serviço');
                            }
                          }
                        }}
                        variant="outline"
                        size="sm"
                        className="border-destructive/50 text-destructive hover:bg-destructive/10 h-8 px-2"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.map((service) => (
                <GlassCard key={service.id} className="border-border/30">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-base">{service.name}</h3>
                      {service.description && (
                        <p className="text-xs text-muted-foreground mt-1">{service.description}</p>
                      )}
                    </div>
                    {!service.is_active && (
                      <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/50 text-xs">Inativo</Badge>
                    )}
                  </div>
                  <div className="space-y-2 mt-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Duração:</span>
                      <span className="font-medium">{service.duration_minutes} min</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Preço:</span>
                      <span className="font-semibold text-accent-cyan">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(service.price)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Entrada:</span>
                      <span className="font-medium text-yellow-400">
                        {service.advance_payment_percentage}% ({new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(service.price * (service.advance_payment_percentage / 100))})
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button
                      onClick={() => handleEditService(service)}
                      variant="outline"
                      size="sm"
                      className="flex-1 border-border/50 hover:bg-white/5"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Editar
                    </Button>
                    <Button
                      onClick={async () => {
                        if (confirm('Tem certeza que deseja deletar este serviço?')) {
                          try {
                            await deleteService.mutateAsync(service.id);
                            toast.success("Serviço deletado com sucesso!");
                          } catch (error) {
                            console.error('Erro ao deletar serviço:', error);
                            toast.error('Erro ao deletar serviço');
                          }
                        }
                      }}
                      variant="outline"
                      size="sm"
                      className="border-destructive/50 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Profissionais */}
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Users className="w-5 h-5 text-accent-purple" />
              Profissionais
            </h2>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1 border border-border/50">
                <Button
                  onClick={() => setProfessionalViewMode('list')}
                  variant="ghost"
                  size="sm"
                  className={`h-7 px-2 ${professionalViewMode === 'list' ? 'bg-accent-purple/20 text-accent-purple' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <span className="text-xs">Lista</span>
                </Button>
                <Button
                  onClick={() => setProfessionalViewMode('card')}
                  variant="ghost"
                  size="sm"
                  className={`h-7 px-2 ${professionalViewMode === 'card' ? 'bg-accent-purple/20 text-accent-purple' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <span className="text-xs">Card</span>
                </Button>
              </div>
              <GradientButton
                onClick={() => {
                  setProfessionalName("");
                  setProfessionalEmail("");
                  setProfessionalPhone("");
                  setProfessionalSpecialties("");
                  setEditingProfessional(null);
                  setShowProfessionalModal(true);
                }}
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Profissional
              </GradientButton>
            </div>
          </div>

          {professionalsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : professionals.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">Nenhum profissional cadastrado</p>
              <p className="text-xs text-muted-foreground mt-2">
                Cadastre profissionais para que os clientes possam escolher ou deixar o sistema escolher automaticamente
              </p>
            </div>
          ) : professionalViewMode === 'list' ? (
            <div className="space-y-2">
              {professionals.map((professional) => (
                <GlassCard key={professional.id} className="border-border/30 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-sm truncate">{professional.name}</h3>
                        {!professional.is_active && (
                          <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/50 text-xs shrink-0">Inativo</Badge>
                        )}
                        {professional.specialties && professional.specialties.length > 0 && (
                          <div className="flex gap-1 shrink-0">
                            {professional.specialties.slice(0, 2).map((specialty, idx) => (
                              <Badge key={idx} className="bg-accent-cyan/20 text-accent-cyan border-accent-cyan/50 text-xs">
                                {specialty}
                              </Badge>
                            ))}
                            {professional.specialties.length > 2 && (
                              <Badge className="bg-accent-cyan/20 text-accent-cyan border-accent-cyan/50 text-xs">
                                +{professional.specialties.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {professional.email && (
                          <span className="truncate">{professional.email}</span>
                        )}
                        {professional.phone && (
                          <span className="shrink-0">{professional.phone}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        onClick={() => {
                          setEditingProfessional(professional);
                          setProfessionalName(professional.name);
                          setProfessionalEmail(professional.email || "");
                          setProfessionalPhone(professional.phone || "");
                          setProfessionalSpecialties(professional.specialties?.join(", ") || "");
                          setShowProfessionalModal(true);
                        }}
                        variant="outline"
                        size="sm"
                        className="border-border/50 hover:bg-white/5 h-8 px-2"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        onClick={async () => {
                          if (confirm('Tem certeza que deseja deletar este profissional?')) {
                            try {
                              await deleteProfessional.mutateAsync(professional.id);
                              toast.success("Profissional deletado com sucesso!");
                            } catch (error) {
                              console.error('Erro ao deletar profissional:', error);
                              toast.error('Erro ao deletar profissional');
                            }
                          }
                        }}
                        variant="outline"
                        size="sm"
                        className="border-destructive/50 text-destructive hover:bg-destructive/10 h-8 px-2"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {professionals.map((professional) => (
                <GlassCard key={professional.id} className="border-border/30">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-base">{professional.name}</h3>
                      {professional.email && (
                        <p className="text-xs text-muted-foreground mt-1">{professional.email}</p>
                      )}
                      {professional.phone && (
                        <p className="text-xs text-muted-foreground">{professional.phone}</p>
                      )}
                    </div>
                    {!professional.is_active && (
                      <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/50 text-xs">Inativo</Badge>
                    )}
                  </div>
                  {professional.specialties && professional.specialties.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {professional.specialties.map((specialty, idx) => (
                        <Badge key={idx} className="bg-accent-cyan/20 text-accent-cyan border-accent-cyan/50 text-xs">
                          {specialty}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2 mt-4">
                    <Button
                      onClick={() => {
                        setEditingProfessional(professional);
                        setProfessionalName(professional.name);
                        setProfessionalEmail(professional.email || "");
                        setProfessionalPhone(professional.phone || "");
                        setProfessionalSpecialties(professional.specialties?.join(", ") || "");
                        setShowProfessionalModal(true);
                      }}
                      variant="outline"
                      size="sm"
                      className="flex-1 border-border/50 hover:bg-white/5"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Editar
                    </Button>
                    <Button
                      onClick={async () => {
                        if (confirm('Tem certeza que deseja deletar este profissional?')) {
                          try {
                            await deleteProfessional.mutateAsync(professional.id);
                            toast.success("Profissional deletado com sucesso!");
                          } catch (error) {
                            console.error('Erro ao deletar profissional:', error);
                            toast.error('Erro ao deletar profissional');
                          }
                        }
                      }}
                      variant="outline"
                      size="sm"
                      className="border-destructive/50 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Horários Disponíveis */}
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-accent-purple" />
              Horários Disponíveis
            </h2>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowMessageTemplatesModal(true)}
                variant="outline"
                size="sm"
                className="border-accent-purple/50 text-accent-purple hover:bg-accent-purple/10"
              >
                <Settings className="w-4 h-4 mr-2" />
                Editar Mensagens
              </Button>
              <GradientButton
                onClick={() => {
                  // Carregar horários existentes nos estados
                  const existingSlots = slots.reduce((acc, slot) => {
                    acc[slot.day_of_week] = {
                      start: slot.start_time,
                      end: slot.end_time,
                      lunchStart: slot.lunch_start_time || "",
                      lunchEnd: slot.lunch_end_time || "",
                    };
                    return acc;
                  }, {} as Record<number, { start: string; end: string; lunchStart?: string; lunchEnd?: string }>);
                  setScheduleTimes(existingSlots);
                  
                  // Carregar configurações globais se existirem
                  if (slots.length > 0) {
                    const firstSlot = slots[0];
                    if (firstSlot.service_duration_minutes) {
                      setScheduleServiceDuration(firstSlot.service_duration_minutes.toString());
                    }
                    if (firstSlot.time_interval_minutes) {
                      setScheduleTimeInterval(firstSlot.time_interval_minutes.toString());
                    }
                  }
                  
                  setShowScheduleModal(true);
                }}
                size="sm"
              >
                <Settings className="w-4 h-4 mr-2" />
                Configurar Horários
              </GradientButton>
            </div>
          </div>

          {/* Seleção de Instância Padrão */}
          {connections && connections.length > 0 && (
            <div className="mb-4 p-4 rounded-lg bg-accent-purple/5 border border-accent-purple/20">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <Label htmlFor="default-connection" className="flex items-center gap-2 mb-2">
                    <Smartphone className="w-4 h-4 text-accent-purple" />
                    <span className="font-semibold">Instância WhatsApp Padrão</span>
                  </Label>
                  <p className="text-xs text-muted-foreground mb-3">
                    Escolha a instância que será usada para enviar notificações de agendamento, QR codes e mensagens. Você pode alterar a qualquer momento.
                  </p>
                  <Select
                    value={templates?.default_connection_id || (connections.length > 0 ? connections[0].id : "")}
                    onValueChange={async (value) => {
                      try {
                        await updateTemplates.mutateAsync({
                          default_connection_id: value,
                        });
                        toast.success("Instância padrão atualizada com sucesso!");
                      } catch (error) {
                        console.error('Erro ao atualizar instância padrão:', error);
                        toast.error('Erro ao atualizar instância padrão');
                      }
                    }}
                  >
                    <SelectTrigger className="bg-bg-input border-border/50">
                      <SelectValue placeholder="Selecione a instância padrão" />
                    </SelectTrigger>
                    <SelectContent>
                      {connections.map((connection) => (
                        <SelectItem key={connection.id} value={connection.id}>
                          <div className="flex items-center gap-2">
                            <span>{connection.name}</span>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                connection.status === 'online' 
                                  ? 'border-green-500/50 text-green-400' 
                                  : connection.status === 'connecting'
                                  ? 'border-yellow-500/50 text-yellow-400'
                                  : 'border-gray-500/50 text-gray-400'
                              }`}
                            >
                              {connection.status === 'online' ? '🟢 Online' : 
                               connection.status === 'connecting' ? '🟡 Conectando' : 
                               '⚫ Offline'}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {templates?.default_connection_id && (
                    <div className="mt-3 p-2 rounded-lg bg-accent-purple/10 border border-accent-purple/20">
                      <p className="text-xs text-muted-foreground">
                        <span className="font-semibold text-accent-purple">Instância fixa selecionada:</span> {connections.find(c => c.id === templates.default_connection_id)?.name || 'Carregando...'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Esta instância será usada para todas as notificações de agendamento. Você pode alterar acima a qualquer momento.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {slotsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : slots.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">Nenhum horário configurado</p>
              <p className="text-xs text-muted-foreground mt-2">
                Configure os horários de funcionamento para que os clientes possam agendar
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map((dayName, dayIndex) => {
                const daySlot = slots.find(s => s.day_of_week === dayIndex);
                if (!daySlot || !daySlot.is_available) return null;

                return (
                  <GlassCard key={dayIndex} className="border-border/30 p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-sm w-24">{dayName}</h3>
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span>{daySlot.start_time} - {daySlot.end_time}</span>
                            {daySlot.lunch_start_time && daySlot.lunch_end_time && (
                              <>
                                <span className="text-muted-foreground mx-1">•</span>
                                <span className="text-xs text-muted-foreground">
                                  Almoço: {daySlot.lunch_start_time} - {daySlot.lunch_end_time}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                          {daySlot.service_duration_minutes && (
                            <span>Duração: {daySlot.service_duration_minutes}min</span>
                          )}
                          {daySlot.time_interval_minutes && (
                            <span>Intervalo: {daySlot.time_interval_minutes}min</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          )}
        </GlassCard>

        {/* Agendamentos */}
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-accent-purple" />
              Agendamentos
            </h2>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-48 h-9 bg-bg-input border-border/50"
              />
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40 h-9 bg-bg-input border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="confirmed">Confirmado</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                  <SelectItem value="no_show">Não Apareceu</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {appointmentsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">Nenhum agendamento encontrado</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAppointments.map((appointment) => (
                <GlassCard key={appointment.id} className="border-border/30">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-base">{appointment.client_name}</h3>
                        {getStatusBadge(appointment.status)}
                        {getPaymentBadge(appointment.payment_status)}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {(() => {
                              // Tratar data como string YYYY-MM-DD (sem conversão de timezone)
                              // Para evitar problemas de timezone no Brasil
                              if (typeof appointment.appointment_date === 'string') {
                                const [year, month, day] = appointment.appointment_date.split('-');
                                return `${day}/${month}/${year}`;
                              }
                              // Fallback para Date object
                              return format(new Date(appointment.appointment_date), "dd/MM/yyyy", { locale: ptBR });
                            })()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span>{appointment.appointment_time}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Settings className="w-4 h-4" />
                          <span>{appointment.service?.name || 'Serviço removido'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <DollarSign className="w-4 h-4" />
                          <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(appointment.total_amount)}</span>
                        </div>
                        {appointment.client_phone && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="w-4 h-4" />
                            <span>{appointment.client_phone}</span>
                          </div>
                        )}
                        {appointment.client_email && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="w-4 h-4" />
                            <span className="text-xs">{appointment.client_email}</span>
                          </div>
                        )}
                      </div>
                      {appointment.notes && (
                        <p className="text-xs text-muted-foreground italic">Obs: {appointment.notes}</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={() => {
                          setEditingAppointment(appointment);
                          setEditClientName(appointment.client_name);
                          setEditClientPhone(appointment.client_phone);
                          setEditClientEmail(appointment.client_email || "");
                          // Tratar data como string YYYY-MM-DD
                          if (typeof appointment.appointment_date === 'string') {
                            setEditAppointmentDate(appointment.appointment_date);
                          } else {
                            const date = new Date(appointment.appointment_date);
                            setEditAppointmentDate(date.toISOString().split('T')[0]);
                          }
                          setEditAppointmentTime(appointment.appointment_time);
                          setEditNotes(appointment.notes || "");
                          setEditServiceId(appointment.service_id);
                          setEditProfessionalId(appointment.professional_id || "");
                          setShowEditAppointmentModal(true);
                        }}
                        variant="outline"
                        size="sm"
                        className="border-accent-cyan/50 text-accent-cyan hover:bg-accent-cyan/10"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Editar
                      </Button>
                      {appointment.status === 'pending' && (
                        <>
                          <Button
                            onClick={() => handleUpdateStatus(appointment.id, 'confirmed')}
                            variant="outline"
                            size="sm"
                            className="border-green-500/50 text-green-400 hover:bg-green-500/10"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Confirmar
                          </Button>
                          <Button
                            onClick={() => handleUpdateStatus(appointment.id, 'cancelled')}
                            variant="outline"
                            size="sm"
                            className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Cancelar
                          </Button>
                        </>
                      )}
                      {appointment.status === 'confirmed' && (
                        <Button
                          onClick={() => handleUpdateStatus(appointment.id, 'completed')}
                          variant="outline"
                          size="sm"
                          className="border-green-500/50 text-green-400 hover:bg-green-500/10"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Concluído
                        </Button>
                      )}
                      {(appointment.status === 'pending' || appointment.status === 'confirmed') && (
                        <Button
                          onClick={async () => {
                            if (confirm('Tem certeza que deseja deletar este agendamento?')) {
                              try {
                                await deleteAppointment.mutateAsync(appointment.id);
                                toast.success("Agendamento deletado com sucesso!");
                              } catch (error) {
                                console.error('Erro ao deletar agendamento:', error);
                                toast.error('Erro ao deletar agendamento');
                              }
                            }
                          }}
                          variant="outline"
                          size="sm"
                          className="border-destructive/50 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Deletar
                        </Button>
                      )}
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Modal de Serviço */}
        <Dialog open={showServiceModal} onOpenChange={setShowServiceModal}>
        <DialogContent className="max-w-lg w-full p-0 bg-[hsl(var(--bg-primary))] border-border/50">
          <div className="glass rounded-2xl p-6 space-y-4">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">
                {editingService ? 'Editar Serviço' : 'Novo Serviço'}
              </DialogTitle>
              <DialogDescription>
                Configure os detalhes do serviço que será oferecido para agendamento
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="service-name">Nome do Serviço *</Label>
                <Input
                  id="service-name"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  placeholder="Ex: Corte de Cabelo, Consulta Médica"
                  className="bg-bg-input border-border/50 mt-1"
                />
              </div>

              <div>
                <Label htmlFor="service-description">Descrição</Label>
                <Textarea
                  id="service-description"
                  value={serviceDescription}
                  onChange={(e) => setServiceDescription(e.target.value)}
                  placeholder="Descreva o serviço oferecido..."
                  rows={3}
                  className="bg-bg-input border-border/50 mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="service-duration">Duração (minutos) *</Label>
                  <Input
                    id="service-duration"
                    type="number"
                    value={serviceDuration}
                    onChange={(e) => setServiceDuration(e.target.value)}
                    min="15"
                    step="15"
                    className="bg-bg-input border-border/50 mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="service-price">Preço Total (R$) *</Label>
                  <Input
                    id="service-price"
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
                <Label htmlFor="advance-percentage">Porcentagem de Entrada (%) *</Label>
                <Input
                  id="advance-percentage"
                  type="number"
                  value={advancePercentage}
                  onChange={(e) => setAdvancePercentage(e.target.value)}
                  min="0"
                  max="100"
                  className="bg-bg-input border-border/50 mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Valor da entrada: {servicePrice ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(servicePrice) * (parseInt(advancePercentage) / 100)) : 'R$ 0,00'}
                </p>
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
                  disabled={createService.isPending || updateService.isPending}
                  className="flex-1"
                >
                  {createService.isPending || updateService.isPending ? 'Salvando...' : 'Salvar'}
                </GradientButton>
              </div>
            </div>
          </div>
        </DialogContent>
        </Dialog>

        {/* Modal de Link Público */}
        <Dialog open={showLinkModal} onOpenChange={setShowLinkModal}>
          <DialogContent className="max-w-lg w-full p-0 bg-[hsl(var(--bg-primary))] border-border/50">
          <div className="glass rounded-2xl p-6 space-y-4">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <ExternalLink className="w-5 h-5 text-accent-cyan" />
                Link Público de Agendamento
              </DialogTitle>
              <DialogDescription>
                Configure o link público que seus clientes usarão para agendar serviços
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="custom-message">Mensagem Personalizada (Opcional)</Label>
                <Textarea
                  id="custom-message"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Ex: Bem-vindo! Agende seu horário conosco..."
                  rows={3}
                  className="bg-bg-input border-border/50 mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Esta mensagem aparecerá na página pública de agendamento
                </p>
              </div>

              {publicLink && (
                <div className="p-3 rounded-lg bg-accent-cyan/10 border border-accent-cyan/30">
                  <p className="text-xs text-accent-cyan mb-2 font-semibold">Seu link público:</p>
                  <code className="text-xs break-all block text-accent-cyan">{publicLink}</code>
                </div>
              )}

              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <p className="text-xs text-blue-400 flex items-start gap-2">
                  <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>
                    O link público permite que seus clientes agendem serviços sem precisar fazer login. 
                    Eles poderão escolher o serviço, data, horário e pagar 50% do valor no agendamento.
                  </span>
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowLinkModal(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <GradientButton
                  onClick={handleGenerateLink}
                  disabled={createOrUpdateLink.isPending}
                  className="flex-1"
                >
                  {createOrUpdateLink.isPending ? 'Gerando...' : (publicLink ? 'Atualizar' : 'Gerar Link')}
                </GradientButton>
              </div>
            </div>
          </div>
          </DialogContent>
        </Dialog>

        {/* Modal de Profissional */}
        <Dialog open={showProfessionalModal} onOpenChange={setShowProfessionalModal}>
          <DialogContent className="max-w-lg w-full p-0 bg-[hsl(var(--bg-primary))] border-border/50">
            <div className="glass rounded-2xl p-6 space-y-4">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">
                  {editingProfessional ? 'Editar Profissional' : 'Novo Profissional'}
                </DialogTitle>
                <DialogDescription>
                  Cadastre profissionais que atenderão os clientes
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="professional-name">Nome do Profissional *</Label>
                  <Input
                    id="professional-name"
                    value={professionalName}
                    onChange={(e) => setProfessionalName(e.target.value)}
                    placeholder="Ex: João Silva"
                    className="bg-bg-input border-border/50 mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="professional-email">E-mail</Label>
                  <Input
                    id="professional-email"
                    type="email"
                    value={professionalEmail}
                    onChange={(e) => setProfessionalEmail(e.target.value)}
                    placeholder="profissional@email.com"
                    className="bg-bg-input border-border/50 mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="professional-phone">WhatsApp *</Label>
                  <Input
                    id="professional-phone"
                    value={professionalPhone}
                    onChange={(e) => setProfessionalPhone(e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="bg-bg-input border-border/50 mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Número para receber notificações de agendamentos
                  </p>
                </div>

                <div>
                  <Label htmlFor="professional-specialties">Especialidades (separadas por vírgula)</Label>
                  <Input
                    id="professional-specialties"
                    value={professionalSpecialties}
                    onChange={(e) => setProfessionalSpecialties(e.target.value)}
                    placeholder="Ex: Corte, Barba, Sobrancelha"
                    className="bg-bg-input border-border/50 mt-1"
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowProfessionalModal(false);
                      setProfessionalName("");
                      setProfessionalEmail("");
                      setProfessionalPhone("");
                      setProfessionalSpecialties("");
                      setEditingProfessional(null);
                    }}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <GradientButton
                    onClick={async () => {
                      if (!professionalName.trim() || !professionalPhone.trim()) {
                        toast.error("Preencha nome e WhatsApp");
                        return;
                      }

                      try {
                        const specialties = professionalSpecialties
                          .split(',')
                          .map(s => s.trim())
                          .filter(s => s.length > 0);

                        const professionalData = {
                          name: professionalName.trim(),
                          email: professionalEmail.trim() || null,
                          phone: professionalPhone.trim(),
                          specialties: specialties.length > 0 ? specialties : null,
                          is_active: true,
                        };

                        if (editingProfessional) {
                          await updateProfessional.mutateAsync({ id: editingProfessional.id, ...professionalData });
                          toast.success("Profissional atualizado com sucesso!");
                        } else {
                          await createProfessional.mutateAsync(professionalData);
                          toast.success("Profissional criado com sucesso!");
                        }

                        setShowProfessionalModal(false);
                        setProfessionalName("");
                        setProfessionalEmail("");
                        setProfessionalPhone("");
                        setProfessionalSpecialties("");
                        setEditingProfessional(null);
                      } catch (error) {
                        console.error('Erro ao salvar profissional:', error);
                        toast.error('Erro ao salvar profissional');
                      }
                    }}
                    disabled={createProfessional.isPending || updateProfessional.isPending}
                    className="flex-1"
                  >
                    {createProfessional.isPending || updateProfessional.isPending ? 'Salvando...' : 'Salvar'}
                  </GradientButton>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal de Horários */}
        <Dialog open={showScheduleModal} onOpenChange={setShowScheduleModal}>
          <DialogContent className="max-w-2xl w-full p-0 bg-[hsl(var(--bg-primary))] border-border/50">
            <div className="glass rounded-2xl p-6 space-y-4">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">
                  Configurar Horários Disponíveis
                </DialogTitle>
                <DialogDescription>
                  Configure os horários de funcionamento por dia da semana
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Configurações Globais */}
                <GlassCard className="border-accent-cyan/30 bg-accent-cyan/5">
                  <h3 className="font-semibold mb-3">Configurações Globais</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="service-duration">Duração do Serviço (minutos) *</Label>
                      <Input
                        id="service-duration"
                        type="number"
                        value={scheduleServiceDuration}
                        onChange={(e) => setScheduleServiceDuration(e.target.value)}
                        min="10"
                        step="5"
                        className="bg-bg-input border-border/50 mt-1"
                        placeholder="30"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Tempo médio de duração de cada serviço
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="time-interval">Intervalo entre Horários (minutos) *</Label>
                      <Input
                        id="time-interval"
                        type="number"
                        value={scheduleTimeInterval}
                        onChange={(e) => setScheduleTimeInterval(e.target.value)}
                        min="5"
                        step="5"
                        className="bg-bg-input border-border/50 mt-1"
                        placeholder="10"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Intervalo entre um agendamento e outro (ex: 10min = 08:00, 08:10, 08:20...)
                      </p>
                    </div>
                  </div>
                </GlassCard>

                {/* Horários por Dia */}
                <div className="space-y-4 max-h-[50vh] overflow-y-auto">
                  {['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map((dayName, dayIndex) => {
                    const daySlots = slots.filter(s => s.day_of_week === dayIndex);
                    const currentStart = scheduleTimes[dayIndex]?.start || daySlots[0]?.start_time || "09:00";
                    const currentEnd = scheduleTimes[dayIndex]?.end || daySlots[0]?.end_time || "18:00";
                    const currentLunchStart = scheduleTimes[dayIndex]?.lunchStart || (daySlots[0] as any)?.lunch_start_time || "";
                    const currentLunchEnd = scheduleTimes[dayIndex]?.lunchEnd || (daySlots[0] as any)?.lunch_end_time || "";

                    return (
                      <GlassCard key={dayIndex} className="border-border/30">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold">{dayName}</h3>
                            <div className="flex items-center gap-2">
                              <Input
                                type="time"
                                value={currentStart}
                                onChange={(e) => setScheduleTimes(prev => ({ ...prev, [dayIndex]: { ...prev[dayIndex], start: e.target.value, end: currentEnd, lunchStart: currentLunchStart, lunchEnd: currentLunchEnd } }))}
                                className="w-32 bg-bg-input border-border/50"
                                placeholder="Início"
                              />
                              <span className="text-muted-foreground">até</span>
                              <Input
                                type="time"
                                value={currentEnd}
                                onChange={(e) => setScheduleTimes(prev => ({ ...prev, [dayIndex]: { ...prev[dayIndex], start: currentStart, end: e.target.value, lunchStart: currentLunchStart, lunchEnd: currentLunchEnd } }))}
                                className="w-32 bg-bg-input border-border/50"
                                placeholder="Fim"
                              />
                            </div>
                          </div>
                          
                          {/* Intervalo de Almoço */}
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-border/30">
                            <Label className="text-xs w-24">Almoço:</Label>
                            <Input
                              type="time"
                              value={currentLunchStart}
                              onChange={(e) => setScheduleTimes(prev => ({ ...prev, [dayIndex]: { ...prev[dayIndex], start: currentStart, end: currentEnd, lunchStart: e.target.value, lunchEnd: currentLunchEnd } }))}
                              className="w-32 bg-bg-input border-border/50"
                              placeholder="Início"
                            />
                            <span className="text-muted-foreground text-xs">até</span>
                            <Input
                              type="time"
                              value={currentLunchEnd}
                              onChange={(e) => setScheduleTimes(prev => ({ ...prev, [dayIndex]: { ...prev[dayIndex], start: currentStart, end: currentEnd, lunchStart: currentLunchStart, lunchEnd: e.target.value } }))}
                              className="w-32 bg-bg-input border-border/50"
                              placeholder="Fim"
                            />
                            <Button
                              onClick={() => {
                                setScheduleTimes(prev => ({ ...prev, [dayIndex]: { ...prev[dayIndex], start: currentStart, end: currentEnd, lunchStart: "", lunchEnd: "" } }));
                              }}
                              variant="ghost"
                              size="sm"
                              className="text-xs text-muted-foreground hover:text-foreground"
                            >
                              Remover
                            </Button>
                          </div>

                          <Button
                            onClick={async () => {
                              try {
                                const slotData: any = {
                                  day_of_week: dayIndex,
                                  start_time: currentStart,
                                  end_time: currentEnd,
                                  is_available: true,
                                  service_duration_minutes: parseInt(scheduleServiceDuration) || 30,
                                  time_interval_minutes: parseInt(scheduleTimeInterval) || 10,
                                };

                                if (currentLunchStart && currentLunchEnd) {
                                  slotData.lunch_start_time = currentLunchStart;
                                  slotData.lunch_end_time = currentLunchEnd;
                                }

                                if (daySlots.length > 0) {
                                  await saveSlot.mutateAsync({
                                    id: daySlots[0].id,
                                    ...slotData,
                                  });
                                } else {
                                  await saveSlot.mutateAsync(slotData);
                                }
                                toast.success(`Horário de ${dayName} atualizado!`);
                              } catch (error) {
                                console.error('Erro ao salvar horário:', error);
                                toast.error('Erro ao salvar horário');
                              }
                            }}
                            variant="outline"
                            size="sm"
                            className="border-accent-cyan/50 text-accent-cyan hover:bg-accent-cyan/10 w-full"
                          >
                            Salvar {dayName}
                          </Button>
                        </div>
                      </GlassCard>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowScheduleModal(false)}
                  className="flex-1"
                >
                  Fechar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal de Editar Agendamento */}
        <Dialog open={showEditAppointmentModal} onOpenChange={setShowEditAppointmentModal}>
          <DialogContent className="max-w-2xl w-full p-0 bg-[hsl(var(--bg-primary))] border-border/50">
            <div className="glass rounded-2xl p-6 space-y-4">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">
                  Editar Agendamento
                </DialogTitle>
                <DialogDescription>
                  Edite as informações do agendamento
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-client-name">Nome do Cliente *</Label>
                    <Input
                      id="edit-client-name"
                      value={editClientName}
                      onChange={(e) => setEditClientName(e.target.value)}
                      className="bg-bg-input border-border/50 mt-1"
                      placeholder="Nome completo"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-client-phone">WhatsApp *</Label>
                    <Input
                      id="edit-client-phone"
                      value={editClientPhone}
                      onChange={(e) => setEditClientPhone(e.target.value)}
                      className="bg-bg-input border-border/50 mt-1"
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="edit-client-email">E-mail (Opcional)</Label>
                  <Input
                    id="edit-client-email"
                    type="email"
                    value={editClientEmail}
                    onChange={(e) => setEditClientEmail(e.target.value)}
                    className="bg-bg-input border-border/50 mt-1"
                    placeholder="seu@email.com"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-service">Serviço *</Label>
                    <Select value={editServiceId} onValueChange={setEditServiceId}>
                      <SelectTrigger className="bg-bg-input border-border/50 mt-1">
                        <SelectValue placeholder="Selecione o serviço" />
                      </SelectTrigger>
                      <SelectContent>
                        {services.map((service) => (
                          <SelectItem key={service.id} value={service.id}>
                            {service.name} - {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(service.price)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="edit-professional">Profissional (Opcional)</Label>
                    <Select 
                      value={editProfessionalId || "none"} 
                      onValueChange={(value) => setEditProfessionalId(value === "none" ? "" : value)}
                    >
                      <SelectTrigger className="bg-bg-input border-border/50 mt-1">
                        <SelectValue placeholder="Selecione o profissional" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum (Atribuição automática)</SelectItem>
                        {professionals.map((professional) => (
                          <SelectItem key={professional.id} value={professional.id}>
                            {professional.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-appointment-date">Data *</Label>
                    <Input
                      id="edit-appointment-date"
                      type="date"
                      value={editAppointmentDate}
                      onChange={(e) => setEditAppointmentDate(e.target.value)}
                      className="bg-bg-input border-border/50 mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-appointment-time">Horário *</Label>
                    <Input
                      id="edit-appointment-time"
                      type="time"
                      value={editAppointmentTime}
                      onChange={(e) => setEditAppointmentTime(e.target.value)}
                      className="bg-bg-input border-border/50 mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="edit-notes">Observações (Opcional)</Label>
                  <Textarea
                    id="edit-notes"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="bg-bg-input border-border/50 mt-1"
                    placeholder="Alguma observação especial..."
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEditAppointmentModal(false);
                    setEditingAppointment(null);
                  }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <GradientButton
                  onClick={async () => {
                    if (!editClientName.trim() || !editClientPhone.trim() || !editAppointmentDate || !editAppointmentTime || !editServiceId) {
                      toast.error("Preencha todos os campos obrigatórios");
                      return;
                    }

                    if (!editingAppointment) return;

                    try {
                      // Garantir que a data está no formato YYYY-MM-DD
                      const dateToSave = editAppointmentDate.includes('T') ? editAppointmentDate.split('T')[0] : editAppointmentDate;
                      
                      await updateAppointment.mutateAsync({
                        id: editingAppointment.id,
                        client_name: editClientName.trim(),
                        client_phone: editClientPhone.trim(),
                        client_email: editClientEmail.trim() || null,
                        appointment_date: dateToSave,
                        appointment_time: editAppointmentTime,
                        service_id: editServiceId,
                        professional_id: editProfessionalId || null,
                        notes: editNotes.trim() || null,
                      });

                      toast.success("Agendamento atualizado com sucesso!");
                      setShowEditAppointmentModal(false);
                      setEditingAppointment(null);
                    } catch (error) {
                      console.error('Erro ao atualizar agendamento:', error);
                      toast.error('Erro ao atualizar agendamento');
                    }
                  }}
                  disabled={updateAppointment.isPending}
                  className="flex-1"
                >
                  {updateAppointment.isPending ? 'Salvando...' : 'Salvar Alterações'}
                </GradientButton>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal de Editar Mensagens */}
        <Dialog open={showMessageTemplatesModal} onOpenChange={setShowMessageTemplatesModal}>
          <DialogContent className="max-w-4xl w-full p-0 bg-[hsl(var(--bg-primary))] border-border/50 max-h-[90vh] overflow-y-auto">
            <div className="glass rounded-2xl p-6 space-y-6">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">
                  Editar Mensagens de Notificação
                </DialogTitle>
                <DialogDescription>
                  Personalize as mensagens enviadas via WhatsApp quando o status do agendamento mudar. Use as variáveis: {'{{date}}'}, {'{{time}}'}, {'{{service}}'}, {'{{amount}}'}, {'{{client_name}}'}, {'{{client_phone}}'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Mensagens para Cliente */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-accent-cyan">Mensagens para Cliente</h3>
                  
                  <div>
                    <Label htmlFor="template-confirmed">Confirmado</Label>
                    <Textarea
                      id="template-confirmed"
                      value={messageTemplateConfirmed}
                      onChange={(e) => setMessageTemplateConfirmed(e.target.value)}
                      className="bg-bg-input border-border/50 mt-1 font-mono text-sm"
                      rows={6}
                      placeholder="Mensagem quando agendamento for confirmado..."
                    />
                  </div>

                  <div>
                    <Label htmlFor="template-completed">Concluído</Label>
                    <Textarea
                      id="template-completed"
                      value={messageTemplateCompleted}
                      onChange={(e) => setMessageTemplateCompleted(e.target.value)}
                      className="bg-bg-input border-border/50 mt-1 font-mono text-sm"
                      rows={6}
                      placeholder="Mensagem quando agendamento for concluído..."
                    />
                  </div>

                  <div>
                    <Label htmlFor="template-cancelled">Cancelado</Label>
                    <Textarea
                      id="template-cancelled"
                      value={messageTemplateCancelled}
                      onChange={(e) => setMessageTemplateCancelled(e.target.value)}
                      className="bg-bg-input border-border/50 mt-1 font-mono text-sm"
                      rows={6}
                      placeholder="Mensagem quando agendamento for cancelado..."
                    />
                  </div>

                  <div>
                    <Label htmlFor="template-no-show">Não Apareceu</Label>
                    <Textarea
                      id="template-no-show"
                      value={messageTemplateNoShow}
                      onChange={(e) => setMessageTemplateNoShow(e.target.value)}
                      className="bg-bg-input border-border/50 mt-1 font-mono text-sm"
                      rows={6}
                      placeholder="Mensagem quando cliente não comparecer..."
                    />
                  </div>
                </div>

                {/* Mensagens para Profissional */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-accent-purple">Mensagens para Profissional</h3>
                  
                  <div>
                    <Label htmlFor="template-professional-confirmed">Confirmado</Label>
                    <Textarea
                      id="template-professional-confirmed"
                      value={messageTemplateProfessionalConfirmed}
                      onChange={(e) => setMessageTemplateProfessionalConfirmed(e.target.value)}
                      className="bg-bg-input border-border/50 mt-1 font-mono text-sm"
                      rows={6}
                      placeholder="Mensagem para profissional quando agendamento for confirmado..."
                    />
                  </div>

                  <div>
                    <Label htmlFor="template-professional-completed">Concluído</Label>
                    <Textarea
                      id="template-professional-completed"
                      value={messageTemplateProfessionalCompleted}
                      onChange={(e) => setMessageTemplateProfessionalCompleted(e.target.value)}
                      className="bg-bg-input border-border/50 mt-1 font-mono text-sm"
                      rows={6}
                      placeholder="Mensagem para profissional quando agendamento for concluído..."
                    />
                  </div>

                  <div>
                    <Label htmlFor="template-professional-cancelled">Cancelado</Label>
                    <Textarea
                      id="template-professional-cancelled"
                      value={messageTemplateProfessionalCancelled}
                      onChange={(e) => setMessageTemplateProfessionalCancelled(e.target.value)}
                      className="bg-bg-input border-border/50 mt-1 font-mono text-sm"
                      rows={6}
                      placeholder="Mensagem para profissional quando agendamento for cancelado..."
                    />
                  </div>

                  <div>
                    <Label htmlFor="template-professional-no-show">Não Apareceu</Label>
                    <Textarea
                      id="template-professional-no-show"
                      value={messageTemplateProfessionalNoShow}
                      onChange={(e) => setMessageTemplateProfessionalNoShow(e.target.value)}
                      className="bg-bg-input border-border/50 mt-1 font-mono text-sm"
                      rows={6}
                      placeholder="Mensagem para profissional quando cliente não comparecer..."
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowMessageTemplatesModal(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <GradientButton
                  onClick={async () => {
                    try {
                      await updateTemplates.mutateAsync({
                        message_template_confirmed: messageTemplateConfirmed || null,
                        message_template_completed: messageTemplateCompleted || null,
                        message_template_cancelled: messageTemplateCancelled || null,
                        message_template_no_show: messageTemplateNoShow || null,
                        message_template_professional_confirmed: messageTemplateProfessionalConfirmed || null,
                        message_template_professional_completed: messageTemplateProfessionalCompleted || null,
                        message_template_professional_cancelled: messageTemplateProfessionalCancelled || null,
                        message_template_professional_no_show: messageTemplateProfessionalNoShow || null,
                      });

                      toast.success("Mensagens atualizadas com sucesso!");
                      setShowMessageTemplatesModal(false);
                    } catch (error) {
                      console.error('Erro ao atualizar templates:', error);
                      toast.error('Erro ao atualizar mensagens');
                    }
                  }}
                  disabled={updateTemplates.isPending}
                  className="flex-1"
                >
                  {updateTemplates.isPending ? 'Salvando...' : 'Salvar Mensagens'}
                </GradientButton>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <BottomNav />
      </div>
      )}
    </div>
  );
});

Appointments.displayName = 'Appointments';

export default Appointments;

