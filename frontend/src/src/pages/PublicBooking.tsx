import { useState, useMemo, useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { GlassCard } from "@/components/GlassCard";
import { GradientButton } from "@/components/GradientButton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { 
  Calendar, Clock, User, Phone, Mail, DollarSign, Loader2,
  CheckCircle, AlertCircle, ArrowLeft, Info
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cleanPhoneNumber } from "@/lib/whatsapp-api";

interface Service {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number;
  advance_payment_percentage: number;
}

interface PublicBookingLink {
  id: string;
  user_id: string;
  public_token: string;
  is_active: boolean;
  custom_message: string | null;
}

const PublicBooking = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [services, setServices] = useState<Service[]>([]);
  const [bookingLink, setBookingLink] = useState<PublicBookingLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [generatingPayment, setGeneratingPayment] = useState(false);
  
  // Formulário
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string | null>(null); // null = roleta automática
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [notes, setNotes] = useState("");
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [availabilitySlots, setAvailabilitySlots] = useState<any[]>([]);
  const [existingAppointments, setExistingAppointments] = useState<any[]>([]);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);

  // Dados do pagamento
  const [pixQrCode, setPixQrCode] = useState<string | null>(null);
  const [pixCopyPaste, setPixCopyPaste] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [appointmentId, setAppointmentId] = useState<string | null>(null);

  // Carregar dados
  useEffect(() => {
    const loadData = async () => {
      if (!slug) {
        toast.error("Link inválido");
        navigate('/');
        return;
      }

      setLoading(true);
      try {
        // Buscar link público pelo token
        const { data: linkData, error: linkError } = await supabase
          .from('public_booking_links')
          .select('*')
          .eq('public_token', slug)
          .eq('is_active', true)
          .single();

        if (linkError || !linkData) {
          toast.error("Link de agendamento não encontrado ou inativo");
          navigate('/');
          return;
        }

        setBookingLink(linkData);

        // Buscar serviços ativos do usuário
        const { data: servicesData, error: servicesError } = await supabase
          .from('services')
          .select('id, name, description, duration_minutes, price, advance_payment_percentage')
          .eq('user_id', linkData.user_id)
          .eq('is_active', true)
          .order('name', { ascending: true });

        if (servicesError) throw servicesError;
        setServices(servicesData || []);

        // Buscar profissionais ativos do usuário
        const { data: professionalsData, error: professionalsError } = await supabase
          .from('professionals')
          .select('id, name, email, phone, specialties')
          .eq('user_id', linkData.user_id)
          .eq('is_active', true)
          .order('name', { ascending: true });

        if (professionalsError && professionalsError.code !== '42P01') {
          console.error('Erro ao carregar profissionais:', professionalsError);
        } else {
          setProfessionals(professionalsData || []);
        }

        // Buscar horários disponíveis configurados
        const { data: slotsData, error: slotsError } = await supabase
          .from('availability_slots')
          .select('*')
          .eq('user_id', linkData.user_id)
          .eq('is_available', true)
          .order('day_of_week', { ascending: true });

        if (slotsError && slotsError.code !== '42P01') {
          console.error('Erro ao carregar horários:', slotsError);
        } else {
          setAvailabilitySlots(slotsData || []);
        }

        if (servicesData?.length === 0) {
          toast.error("Nenhum serviço disponível para agendamento");
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        toast.error('Erro ao carregar informações de agendamento');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [slug, navigate]);

  // Serviço selecionado
  const selectedService = useMemo(() => {
    return services.find(s => s.id === selectedServiceId);
  }, [services, selectedServiceId]);

  // Calcular valores
  const advanceAmount = useMemo(() => {
    if (!selectedService) return 0;
    return selectedService.price * (selectedService.advance_payment_percentage / 100);
  }, [selectedService]);

  const remainingAmount = useMemo(() => {
    if (!selectedService) return 0;
    return selectedService.price - advanceAmount;
  }, [selectedService, advanceAmount]);

  // Calcular horários disponíveis baseado na data selecionada
  useEffect(() => {
    const calculateAvailableTimes = async () => {
      if (!appointmentDate || !selectedService || !bookingLink) {
        setAvailableTimes([]);
        return;
      }

      try {
        // Obter dia da semana (0 = Domingo, 6 = Sábado)
        // Usar a data diretamente sem conversão de timezone para evitar problemas
        // appointmentDate vem no formato YYYY-MM-DD do input type="date"
        const [year, month, day] = appointmentDate.split('-').map(Number);
        const selectedDate = new Date(year, month - 1, day); // month - 1 porque Date usa 0-11
        const dayOfWeek = selectedDate.getDay();

        // Buscar slot de disponibilidade para o dia
        const daySlot = availabilitySlots.find(s => s.day_of_week === dayOfWeek);
        if (!daySlot) {
          setAvailableTimes([]);
          return;
        }

        // Buscar agendamentos existentes para a data
        // IMPORTANTE: Usar a data no formato YYYY-MM-DD (sem timezone)
        // Garantir que appointmentDate está no formato correto
        const dateToSearch = appointmentDate.includes('T') ? appointmentDate.split('T')[0] : appointmentDate;
        
        const { data: existingApts, error: aptsError } = await supabase
          .from('appointments')
          .select('appointment_time, status, professional_id, service:services(duration_minutes)')
          .eq('user_id', bookingLink.user_id)
          .eq('appointment_date', dateToSearch) // Data no formato YYYY-MM-DD
          .in('status', ['pending', 'confirmed']); // Apenas pendentes e confirmados ocupam horário

        if (aptsError) {
          console.error('Erro ao buscar agendamentos existentes:', aptsError);
        }

        // Criar conjunto de horários ocupados
        // Considerar também horários que se sobrepõem devido à duração do serviço
        const bookedTimes = new Set<string>();
        const bookedTimeRanges: Array<{ start: number; end: number }> = [];
        
        existingApts?.forEach(apt => {
          const aptTime = apt.appointment_time;
          if (aptTime) {
            // Normalizar formato do horário (garantir HH:MM, remover segundos se houver)
            // O horário pode vir como "11:50:00" ou "11:50"
            const timeParts = aptTime.split(':');
            const hours = parseInt(timeParts[0] || '0', 10);
            const minutes = parseInt(timeParts[1] || '0', 10);
            const normalizedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            bookedTimes.add(normalizedTime);
            
            // Calcular duração do serviço (usar duração do serviço do agendamento ou padrão)
            const serviceDuration = (apt.service as any)?.duration_minutes || selectedService.duration_minutes || 30;
            const startMinutes = hours * 60 + minutes;
            const endMinutes = startMinutes + serviceDuration;
            
            bookedTimeRanges.push({ start: startMinutes, end: endMinutes });
          }
        });

        // Gerar horários disponíveis
        const times: string[] = [];
        const startTime = daySlot.start_time;
        const endTime = daySlot.end_time;
        const intervalMinutes = daySlot.time_interval_minutes || 10;
        const serviceDuration = selectedService.duration_minutes || daySlot.service_duration_minutes || 30;
        const lunchStart = daySlot.lunch_start_time;
        const lunchEnd = daySlot.lunch_end_time;

        // Converter horários para minutos desde meia-noite
        const timeToMinutes = (time: string) => {
          const [hours, minutes] = time.split(':').map(Number);
          return hours * 60 + minutes;
        };

        const minutesToTime = (minutes: number) => {
          const hours = Math.floor(minutes / 60);
          const mins = minutes % 60;
          return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
        };

        const startMinutes = timeToMinutes(startTime);
        const endMinutes = timeToMinutes(endTime);
        const lunchStartMinutes = lunchStart ? timeToMinutes(lunchStart) : null;
        const lunchEndMinutes = lunchEnd ? timeToMinutes(lunchEnd) : null;

        let currentMinutes = startMinutes;

        while (currentMinutes + serviceDuration <= endMinutes) {
          // Verificar se está no intervalo de almoço
          if (lunchStartMinutes && lunchEndMinutes) {
            if (currentMinutes >= lunchStartMinutes && currentMinutes < lunchEndMinutes) {
              currentMinutes = lunchEndMinutes;
              continue;
            }
          }

          const timeStr = minutesToTime(currentMinutes);

          // Verificar se o horário não está ocupado
          // Verificar se o horário exato está ocupado
          const isExactTimeBooked = bookedTimes.has(timeStr);
          
          // Verificar se há sobreposição com outros agendamentos
          // Um horário está ocupado se:
          // 1. O horário exato já está agendado, OU
          // 2. O horário se sobrepõe com algum agendamento existente
          const overlapsWithBooked = bookedTimeRanges.some(range => {
            const slotStart = currentMinutes;
            const slotEnd = currentMinutes + serviceDuration;
            // Verificar sobreposição: o slot não pode começar antes do fim de um agendamento
            // e não pode terminar depois do início de um agendamento
            return (slotStart < range.end && slotEnd > range.start);
          });
          
          if (!isExactTimeBooked && !overlapsWithBooked) {
            times.push(timeStr);
          }

          currentMinutes += intervalMinutes;
        }

        setAvailableTimes(times);
      } catch (error) {
        console.error('Erro ao calcular horários disponíveis:', error);
        setAvailableTimes([]);
      }
    };

    calculateAvailableTimes();
  }, [appointmentDate, selectedService, availabilitySlots, bookingLink]);

  // Validar formulário
  const isFormValid = useMemo(() => {
    return !!(
      selectedServiceId &&
      clientName.trim() &&
      clientPhone.trim() &&
      appointmentDate &&
      appointmentTime
    );
  }, [selectedServiceId, clientName, clientPhone, appointmentDate, appointmentTime]);

  // Submeter agendamento
  const handleSubmit = useCallback(async () => {
    if (!isFormValid || !selectedService || !bookingLink) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setSubmitting(true);
    try {
      // Se não escolheu profissional, fazer roleta automática (escolher profissional disponível)
      let finalProfessionalId = selectedProfessionalId;
      
      if (!finalProfessionalId && professionals.length > 0) {
        // Buscar profissionais disponíveis no horário escolhido
        const { data: availableProfessionals } = await supabase
          .from('appointments')
          .select('professional_id')
          .eq('user_id', bookingLink.user_id)
          .eq('appointment_date', appointmentDate)
          .eq('appointment_time', appointmentTime)
          .neq('status', 'cancelled')
          .not('professional_id', 'is', null);

        const busyProfessionalIds = new Set(availableProfessionals?.map(a => a.professional_id) || []);
        
        // Escolher profissional que não está ocupado
        const available = professionals.filter(p => !busyProfessionalIds.has(p.id));
        if (available.length > 0) {
          // Escolher aleatoriamente entre os disponíveis
          finalProfessionalId = available[Math.floor(Math.random() * available.length)].id;
        } else if (professionals.length > 0) {
          // Se todos estão ocupados, escolher aleatoriamente mesmo assim
          finalProfessionalId = professionals[Math.floor(Math.random() * professionals.length)].id;
        }
      }

      // Verificar conflito de horário ANTES de salvar (independente do profissional)
      // Verificar se já existe algum agendamento no mesmo dia e horário
      const { data: existingConflict, error: conflictError } = await supabase
        .from('appointments')
        .select('id, professional_id')
        .eq('user_id', bookingLink.user_id)
        .eq('appointment_date', appointmentDate) // Data no formato YYYY-MM-DD (sem timezone)
        .eq('appointment_time', appointmentTime)
        .in('status', ['pending', 'confirmed']) // Apenas pendentes e confirmados ocupam horário
        .maybeSingle();

      // Se encontrou conflito (e não foi erro de "não encontrado")
      if (existingConflict && !conflictError) {
        toast.error("Este horário já está ocupado. Por favor, escolha outro horário disponível.");
        setSubmitting(false);
        return;
      }

      // Se escolheu profissional específico, verificar também conflito com esse profissional
      if (finalProfessionalId && selectedProfessionalId) {
        const { data: professionalConflict, error: profConflictError } = await supabase
          .from('appointments')
          .select('id')
          .eq('user_id', bookingLink.user_id)
          .eq('professional_id', finalProfessionalId)
          .eq('appointment_date', appointmentDate)
          .eq('appointment_time', appointmentTime)
          .in('status', ['pending', 'confirmed'])
          .maybeSingle();

        if (professionalConflict && !profConflictError) {
          toast.error("Este horário já está ocupado para o profissional selecionado. Escolha outro horário.");
          setSubmitting(false);
          return;
        }
      }

      // Criar agendamento
      // Garantir que a data seja salva no formato YYYY-MM-DD (sem conversão de timezone)
      // appointmentDate já vem no formato correto do input type="date"
      const appointmentData: any = {
        user_id: bookingLink.user_id,
        service_id: selectedService.id,
        client_name: clientName.trim(),
        client_phone: cleanPhoneNumber(clientPhone),
        client_email: clientEmail.trim() || null,
        appointment_date: appointmentDate, // Formato YYYY-MM-DD (sem timezone, será tratado como data local no Brasil)
        appointment_time: appointmentTime,
        status: 'pending',
        payment_status: 'pending',
        total_amount: selectedService.price,
        advance_payment_amount: advanceAmount,
        remaining_payment_amount: remainingAmount,
        notes: notes.trim() || null,
      };

      // Adicionar professional_id apenas se foi atribuído
      if (finalProfessionalId) {
        appointmentData.professional_id = finalProfessionalId;
      }

      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert(appointmentData)
        .select()
        .single();

      if (appointmentError) {
        console.error('Erro ao criar agendamento:', appointmentError);
        throw new Error(appointmentError.message || 'Erro ao criar agendamento');
      }
      if (!appointment) throw new Error('Erro ao criar agendamento');

      setAppointmentId(appointment.id);

      // Notificar profissional sobre pré-agendamento pendente (se houver profissional atribuído)
      if (finalProfessionalId) {
        try {
          const professional = professionals.find(p => p.id === finalProfessionalId);
          if (professional?.phone) {
            const { data: connections } = await supabase
              .from('connections')
              .select('api_instance_token, status')
              .eq('user_id', bookingLink.user_id)
              .eq('status', 'online')
              .limit(1)
              .single();

            if (connections?.api_instance_token) {
              const { whatsappApi } = await import('@/lib/whatsapp-api');
              const professionalPhone = cleanPhoneNumber(professional.phone);
              
              // Verificar número com API do WhatsApp para obter JID correto
              let professionalJID = `${professionalPhone}@s.whatsapp.net`; // Fallback padrão
              
              try {
                const lidResult = await whatsappApi.getLID(connections.api_instance_token, professionalPhone);
                if (lidResult.success && lidResult.data?.jid) {
                  // Usar JID retornado pela API
                  professionalJID = lidResult.data.jid;
                } else {
                  console.warn('LID não encontrado para profissional, usando formato padrão:', professionalJID);
                }
              } catch (lidError) {
                console.warn('Erro ao verificar LID do profissional, usando formato padrão:', lidError);
              }
              
              // Enviar mensagem mesmo se não conseguir verificar LID
              const appointmentDateFormatted = new Date(appointmentDate).toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              });

              const professionalMessage = `🔔 *Novo Pré-Agendamento Pendente!*\n\n` +
                `Você tem um novo agendamento aguardando pagamento:\n\n` +
                `👤 *Cliente:* ${clientName.trim()}\n` +
                `📞 *Telefone:* ${clientPhone}\n` +
                `📅 *Data:* ${appointmentDateFormatted}\n` +
                `🕐 *Horário:* ${appointmentTime}\n` +
                `💼 *Serviço:* ${selectedService.name}\n` +
                `💰 *Valor Total:* ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedService.price)}\n` +
                `💳 *Entrada:* ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(advanceAmount)} (${selectedService.advance_payment_percentage}%)\n` +
                `📊 *Status:* ⏳ Aguardando pagamento da entrada\n\n` +
                (notes.trim() ? `📝 *Observações:* ${notes.trim()}\n\n` : '') +
                `O agendamento será confirmado automaticamente quando o pagamento for recebido. 🎯`;

              await whatsappApi.sendText(
                connections.api_instance_token,
                professionalJID,
                professionalMessage
              );
            }
          }
        } catch (notifyError) {
          console.error('Erro ao notificar profissional sobre pré-agendamento:', notifyError);
          // Não falhar o agendamento se a notificação falhar
        }
      }

      // Notificar cliente via WhatsApp
      try {
        const { data: connections } = await supabase
          .from('connections')
          .select('api_instance_token, status')
          .eq('user_id', bookingLink.user_id)
          .eq('status', 'online')
          .limit(1)
          .single();

        if (connections?.api_instance_token) {
          const { whatsappApi } = await import('@/lib/whatsapp-api');
          const cleanedClientPhone = cleanPhoneNumber(clientPhone);
          
          // Verificar número com API do WhatsApp para obter JID correto
          let clientJID = `${cleanedClientPhone}@s.whatsapp.net`; // Fallback padrão
          
          try {
            const lidResult = await whatsappApi.getLID(connections.api_instance_token, cleanedClientPhone);
            if (lidResult.success && lidResult.data?.jid) {
              // Usar JID retornado pela API
              clientJID = lidResult.data.jid;
            } else {
              console.warn('LID não encontrado para cliente, usando formato padrão:', clientJID);
            }
          } catch (lidError) {
            console.warn('Erro ao verificar LID do cliente, usando formato padrão:', lidError);
          }
          
          // Enviar mensagem mesmo se não conseguir verificar LID
          // Buscar nome do profissional apenas se o cliente escolheu explicitamente
          let professionalName: string | null = null;
          if (finalProfessionalId && selectedProfessionalId) {
            // Só mostrar nome se o cliente escolheu explicitamente
            const professional = professionals.find(p => p.id === finalProfessionalId);
            if (professional) {
              professionalName = professional.name;
            }
          }

          const appointmentDateFormatted = new Date(appointmentDate).toLocaleDateString('pt-BR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          });

          let message = `✅ *Agendamento Confirmado!*\n\n` +
            `Olá ${clientName.trim()}!\n\n` +
            `Seu agendamento foi confirmado com sucesso:\n\n` +
            `📅 *Data:* ${appointmentDateFormatted}\n` +
            `🕐 *Horário:* ${appointmentTime}\n` +
            `💼 *Serviço:* ${selectedService.name}\n`;
          
          // Só mencionar profissional se o cliente escolheu explicitamente
          if (professionalName) {
            message += `👤 *Profissional:* ${professionalName}\n`;
          }
          
          message += `💰 *Valor Total:* ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedService.price)}\n` +
            `💳 *Entrada (${selectedService.advance_payment_percentage}%):* ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(advanceAmount)}\n\n` +
            (advanceAmount > 0 
              ? `Você receberá o código PIX em seguida para pagar a entrada.\n\n`
              : `\n`) +
            `Aguardamos você! 🎉`;

          await whatsappApi.sendText(
            selectedConnection.api_instance_token,
            clientJID,
            message
          );
        }
      } catch (notifyError) {
        console.error('Erro ao notificar cliente:', notifyError);
        // Não falhar o agendamento se a notificação falhar
      }

      // Notificar profissional via WhatsApp (se houver profissional atribuído)
      if (finalProfessionalId) {
        try {
          const professional = professionals.find(p => p.id === finalProfessionalId);
          if (professional?.phone) {
            const { data: connections } = await supabase
              .from('connections')
              .select('api_instance_token, status')
              .eq('user_id', bookingLink.user_id)
              .eq('status', 'online')
              .limit(1)
              .single();

            if (connections?.api_instance_token) {
              const { whatsappApi } = await import('@/lib/whatsapp-api');
              const professionalPhone = cleanPhoneNumber(professional.phone);
              
              const appointmentDateFormatted = new Date(appointmentDate).toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              });

              const professionalMessage = `🔔 *Novo Agendamento!*\n\n` +
                `Você tem um novo agendamento:\n\n` +
                `👤 *Cliente:* ${clientName.trim()}\n` +
                `📞 *Telefone:* ${clientPhone}\n` +
                `📅 *Data:* ${appointmentDateFormatted}\n` +
                `🕐 *Horário:* ${appointmentTime}\n` +
                `💼 *Serviço:* ${selectedService.name}\n` +
                `💰 *Valor Total:* ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedService.price)}\n` +
                `💳 *Entrada:* ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(advanceAmount)} (${selectedService.advance_payment_percentage}%)\n` +
                `📊 *Status:* ${advanceAmount > 0 ? 'Aguardando pagamento' : 'Confirmado'}\n\n` +
                (notes.trim() ? `📝 *Observações:* ${notes.trim()}\n\n` : '') +
                `Prepare-se para o atendimento! 🎯`;

              await whatsappApi.sendText(
                selectedConnection.api_instance_token,
                `${professionalPhone}@s.whatsapp.net`,
                professionalMessage
              );
            }
          }
        } catch (notifyError) {
          console.error('Erro ao notificar profissional:', notifyError);
          // Não falhar o agendamento se a notificação falhar
        }
      }

      // Se precisa pagar entrada, gerar PIX
      if (advanceAmount > 0) {
        setShowPaymentModal(true);
        await generatePayment(appointment.id, advanceAmount, selectedService.name);
      } else {
        // Se não precisa pagar, apenas confirmar
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error('Erro ao criar agendamento:', error);
      toast.error('Erro ao criar agendamento. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }, [isFormValid, selectedService, bookingLink, clientName, clientPhone, clientEmail, appointmentDate, appointmentTime, notes, advanceAmount, remainingAmount, professionals, selectedProfessionalId]);

  // Gerar pagamento PIX
  const generatePayment = useCallback(async (aptId: string, amount: number, description: string) => {
    if (!bookingLink) return;

    setGeneratingPayment(true);
    try {
      // Buscar provedor de pagamento padrão do usuário
      const { data: provider } = await supabase
        .from('payment_providers')
        .select('*')
        .eq('user_id', bookingLink.user_id)
        .eq('is_active', true)
        .eq('is_default', true)
        .single();

      if (!provider?.api_key) {
        toast.error("Provedor de pagamento não configurado. O agendamento foi criado, mas o pagamento não pode ser processado.");
        setShowPaymentModal(false);
        setShowSuccessModal(true);
        return;
      }

      // Chamar Edge Function para gerar PIX
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Sessão não encontrada');
      }

      const functionName = provider.provider === 'asaas' 
        ? 'generate-asaas-payment' 
        : 'generate-mercado-pago-pix';

      const paymentResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: provider.api_key,
          amount: amount.toString(),
          description: `Entrada - ${description}`,
          external_reference: `appointment_${aptId}`,
          payment_type: 'pix', // Sempre PIX para agendamento
        }),
      });

      if (!paymentResponse.ok) {
        throw new Error('Erro ao gerar pagamento');
      }

      const paymentResult = await paymentResponse.json();

      if (paymentResult.success) {
        // Tratar QR Code - pode vir como base64, URL ou string
        let qrCodeValue = paymentResult.qr_code_base64 || paymentResult.qr_code;
        
        console.log('QR Code recebido:', {
          qr_code_base64: paymentResult.qr_code_base64,
          qr_code: paymentResult.qr_code,
          final: qrCodeValue
        });
        
        // Se for base64 sem prefixo, adicionar
        if (qrCodeValue && !qrCodeValue.startsWith('data:') && !qrCodeValue.startsWith('http')) {
          // Verificar se parece ser base64
          if (/^[A-Za-z0-9+/=]+$/.test(qrCodeValue)) {
            qrCodeValue = `data:image/png;base64,${qrCodeValue}`;
          } else if (qrCodeValue.length > 100) {
            // Se for uma string longa, pode ser a chave PIX - gerar QR Code
            qrCodeValue = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrCodeValue)}`;
          }
        }
        
        console.log('QR Code processado:', qrCodeValue);
        setPixQrCode(qrCodeValue);
        setPixCopyPaste(paymentResult.copy_paste);
        setPaymentId(paymentResult.payment_id);

        // Atualizar agendamento com dados do pagamento
        await supabase
          .from('appointments')
          .update({
            payment_provider: provider.provider,
            payment_provider_id: paymentResult.payment_id,
            pix_id: paymentResult.payment_id,
            pix_qr_code: qrCodeValue,
            pix_copy_paste: paymentResult.copy_paste,
            payment_status: 'partial',
          })
          .eq('id', aptId);

        // Notificar profissional sobre QR Code gerado (pré-agendamento pendente)
        try {
          const { data: appointmentData } = await supabase
            .from('appointments')
            .select(`
              *,
              professional:professionals(*),
              service:services(*)
            `)
            .eq('id', aptId)
            .single();

          if (appointmentData?.professional_id && appointmentData.professional?.phone) {
            // Buscar instância padrão ou primeira online disponível
            let selectedConnection = null;
            
            // Buscar instância padrão do usuário
            const { data: appointmentSettings } = await supabase
              .from('appointment_settings')
              .select('default_connection_id')
              .eq('user_id', bookingLink.user_id)
              .maybeSingle();
            
            if (appointmentSettings?.default_connection_id) {
              // Buscar instância padrão
              const { data: defaultConn } = await supabase
                .from('connections')
                .select('id, api_instance_token, status, name')
                .eq('id', appointmentSettings.default_connection_id)
                .eq('user_id', bookingLink.user_id)
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
                .eq('user_id', bookingLink.user_id)
                .eq('status', 'online')
                .limit(1)
                .maybeSingle();
              
              if (onlineConn) {
                selectedConnection = onlineConn;
              }
            }

            if (selectedConnection?.api_instance_token) {
              const { whatsappApi } = await import('@/lib/whatsapp-api');
              const professionalPhone = cleanPhoneNumber(appointmentData.professional.phone);
              
              // Verificar se o número tem WhatsApp usando checkUser (mesma lógica do sistema de disparo)
              const checkResult = await whatsappApi.checkUser(
                selectedConnection.api_instance_token,
                [professionalPhone]
              );

              if (!checkResult.success) {
                console.error('Erro ao verificar número do profissional:', checkResult.error);
                return;
              }

              // Filtrar apenas números que têm WhatsApp
              const validUser = checkResult.data?.Users?.find(user => {
                const userQuery = cleanPhoneNumber(user.Query.replace('@s.whatsapp.net', ''));
                const userJIDNumber = user.JID ? cleanPhoneNumber(user.JID.replace('@s.whatsapp.net', '')) : '';
                return (userQuery === professionalPhone || userJIDNumber === professionalPhone) && user.IsInWhatsapp === true;
              });

              if (!validUser) {
                console.warn('Número do profissional não possui WhatsApp:', professionalPhone);
                return;
              }

              // Usar o JID retornado pela API
              const professionalJID = validUser.JID || `${professionalPhone}@s.whatsapp.net`;
              
              const appointmentDateFormatted = new Date(appointmentData.appointment_date).toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              });

              const professionalMessage = `🔔 *QR Code PIX Gerado - Pré-Agendamento Pendente!*\n\n` +
                `Um cliente solicitou agendamento e o QR Code PIX foi gerado:\n\n` +
                `👤 *Cliente:* ${appointmentData.client_name}\n` +
                `📞 *Telefone:* ${appointmentData.client_phone}\n` +
                `📅 *Data:* ${appointmentDateFormatted}\n` +
                `🕐 *Horário:* ${appointmentData.appointment_time}\n` +
                `💼 *Serviço:* ${appointmentData.service?.name || 'N/A'}\n` +
                `💰 *Valor Total:* ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(appointmentData.total_amount)}\n` +
                `💳 *Entrada:* ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(appointmentData.advance_payment_amount || 0)}\n` +
                `📊 *Status:* ⏳ Aguardando pagamento da entrada\n\n` +
                `O agendamento será confirmado automaticamente quando o pagamento for recebido. 🎯`;

              await whatsappApi.sendText(
                connections.api_instance_token,
                professionalJID,
                professionalMessage
              );
            }
          }
        } catch (notifyError) {
          console.error('Erro ao notificar profissional sobre QR Code gerado:', notifyError);
        }

        // Enviar QR Code e chave PIX para o cliente via WhatsApp
        try {
          const { data: appointmentData } = await supabase
            .from('appointments')
            .select('*')
            .eq('id', aptId)
            .single();

          if (appointmentData?.client_phone) {
            const { data: connections } = await supabase
              .from('connections')
              .select('api_instance_token, status')
              .eq('user_id', bookingLink.user_id)
              .eq('status', 'online')
              .limit(1)
              .single();

            if (connections?.api_instance_token) {
              const { whatsappApi } = await import('@/lib/whatsapp-api');
              const clientPhone = cleanPhoneNumber(appointmentData.client_phone);
              
              // Verificar se o número tem WhatsApp usando checkUser (mesma lógica do sistema de disparo)
              const checkResult = await whatsappApi.checkUser(
                connections.api_instance_token,
                [clientPhone]
              );

              if (!checkResult.success) {
                console.error('Erro ao verificar número do cliente:', checkResult.error);
                return;
              }

              // Filtrar apenas números que têm WhatsApp
              const validUser = checkResult.data?.Users?.find(user => {
                const userQuery = cleanPhoneNumber(user.Query.replace('@s.whatsapp.net', ''));
                const userJIDNumber = user.JID ? cleanPhoneNumber(user.JID.replace('@s.whatsapp.net', '')) : '';
                return (userQuery === clientPhone || userJIDNumber === clientPhone) && user.IsInWhatsapp === true;
              });

              if (!validUser) {
                console.warn('Número do cliente não possui WhatsApp:', clientPhone);
                return;
              }

              // Usar o JID retornado pela API
              const clientJID = validUser.JID || `${clientPhone}@s.whatsapp.net`;
              
              // Mensagem com informações do PIX
              const pixMessage = `💳 *PIX Gerado para Pagamento da Entrada*\n\n` +
                `Olá ${appointmentData.client_name}!\n\n` +
                `O QR Code PIX foi gerado para você pagar a entrada do agendamento:\n\n` +
                `💰 *Valor da Entrada:* ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(appointmentData.advance_payment_amount || 0)}\n\n` +
                `📋 *Chave Copia e Cola:*\n\`\`\`${paymentResult.copy_paste}\`\`\`\n\n` +
                `💡 Copie o código acima e cole no app do seu banco para pagar.\n\n` +
                `📱 O QR Code será enviado em seguida para você escanear.`;

              // Enviar mensagem de texto primeiro
              await whatsappApi.sendText(
                connections.api_instance_token,
                clientJID,
                pixMessage
              );

              // Se tiver QR Code, enviar como imagem
              if (qrCodeValue) {
                try {
                  // Aguardar um pouco antes de enviar a imagem
                  await new Promise(resolve => setTimeout(resolve, 2000));

                  if (qrCodeValue.startsWith('data:image') || qrCodeValue.startsWith('http')) {
                    await whatsappApi.sendImage(
                      connections.api_instance_token,
                      clientJID,
                      qrCodeValue,
                      'QR Code PIX - Escaneie com o app do seu banco para pagar'
                    );
                  }
                } catch (imageError) {
                  console.error('Erro ao enviar QR Code como imagem:', imageError);
                  // Não falhar se não conseguir enviar a imagem
                }
              }
            }
          }
        } catch (clientNotifyError) {
          console.error('Erro ao enviar PIX para cliente via WhatsApp:', clientNotifyError);
          // Não falhar o processo se não conseguir enviar
        }
      } else {
        throw new Error(paymentResult.error || 'Erro ao gerar pagamento');
      }
    } catch (error) {
      console.error('Erro ao gerar pagamento:', error);
      toast.error('Erro ao gerar pagamento. O agendamento foi criado, mas você precisará pagar pessoalmente.');
      setShowPaymentModal(false);
      setShowSuccessModal(true);
    } finally {
      setGeneratingPayment(false);
    }
  }, [bookingLink]);

  // Data mínima (hoje)
  const minDate = useMemo(() => {
    return new Date().toISOString().split('T')[0];
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--bg-primary))]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-accent-purple border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen tech-grid-bg pb-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-accent-purple to-accent-cyan bg-clip-text text-transparent">
            Agende seu Horário
          </h1>
          {bookingLink?.custom_message && (
            <p className="text-muted-foreground">{bookingLink.custom_message}</p>
          )}
        </div>

        {/* Formulário */}
        <GlassCard>
          <div className="space-y-4">
            {/* Seleção de Serviço */}
            <div>
              <Label htmlFor="service" className="text-sm font-medium mb-2 block">
                Selecione o Serviço *
              </Label>
              <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
                <SelectTrigger className="w-full bg-bg-input border-border/50">
                  <SelectValue placeholder="Escolha um serviço" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{service.name}</span>
                        <span className="text-xs text-muted-foreground ml-4">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(service.price)}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedService && (
                <div className="mt-2 p-3 rounded-lg bg-accent-cyan/10 border border-accent-cyan/30">
                  <p className="text-xs text-muted-foreground mb-1">
                    {selectedService.description || 'Sem descrição'}
                  </p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Duração:</span>
                    <span className="font-medium">{selectedService.duration_minutes} minutos</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-muted-foreground">Preço Total:</span>
                    <span className="font-semibold text-accent-cyan">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedService.price)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-muted-foreground">Entrada ({selectedService.advance_payment_percentage}%):</span>
                    <span className="font-semibold text-yellow-400">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(advanceAmount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-muted-foreground">Restante:</span>
                    <span className="font-medium">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(remainingAmount)}
                    </span>
                  </div>
                  <p className="text-xs text-yellow-400 mt-2 italic">
                    💡 Você pagará {selectedService.advance_payment_percentage}% agora e o restante no dia do atendimento
                  </p>
                </div>
              )}
            </div>

            {/* Seleção de Profissional */}
            {professionals.length > 0 && (
              <div>
                <Label htmlFor="professional" className="text-sm font-medium mb-2 block">
                  Escolha o Profissional (Opcional)
                </Label>
                <Select 
                  value={selectedProfessionalId || ""} 
                  onValueChange={(value) => setSelectedProfessionalId(value || null)}
                >
                  <SelectTrigger className="w-full bg-bg-input border-border/50">
                    <SelectValue placeholder="Selecione um profissional (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {professionals.map((professional) => (
                      <SelectItem key={professional.id} value={professional.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{professional.name}</span>
                          {professional.specialties && professional.specialties.length > 0 && (
                            <span className="text-xs text-muted-foreground ml-2">
                              {professional.specialties.join(", ")}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Se não escolher, um profissional será atribuído automaticamente
                </p>
              </div>
            )}

            {/* Dados do Cliente */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="client-name" className="text-sm font-medium mb-2 block">
                  Nome Completo *
                </Label>
                <Input
                  id="client-name"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Seu nome"
                  className="bg-bg-input border-border/50"
                />
              </div>
              <div>
                <Label htmlFor="client-phone" className="text-sm font-medium mb-2 block">
                  WhatsApp *
                </Label>
                <Input
                  id="client-phone"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="bg-bg-input border-border/50"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="client-email" className="text-sm font-medium mb-2 block">
                E-mail (Opcional)
              </Label>
              <Input
                id="client-email"
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="seu@email.com"
                className="bg-bg-input border-border/50"
              />
            </div>

            {/* Data e Hora */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="appointment-date" className="text-sm font-medium mb-2 block">
                  Data do Agendamento *
                </Label>
                <Input
                  id="appointment-date"
                  type="date"
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  min={minDate}
                  className="bg-bg-input border-border/50"
                />
              </div>
              <div>
                <Label htmlFor="appointment-time" className="text-sm font-medium mb-2 block">
                  Horário *
                </Label>
                {appointmentDate && selectedService ? (
                  availableTimes.length > 0 ? (
                    <Select value={appointmentTime} onValueChange={setAppointmentTime}>
                      <SelectTrigger className="bg-bg-input border-border/50">
                        <SelectValue placeholder="Selecione um horário disponível" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTimes.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                      <p className="text-xs text-yellow-400">
                        Nenhum horário disponível para esta data. Escolha outra data.
                      </p>
                    </div>
                  )
                ) : (
                  <Input
                    id="appointment-time"
                    type="time"
                    value={appointmentTime}
                    onChange={(e) => setAppointmentTime(e.target.value)}
                    className="bg-bg-input border-border/50"
                    disabled
                    placeholder="Selecione primeiro a data e o serviço"
                  />
                )}
                {appointmentDate && selectedService && availableTimes.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {availableTimes.length} horário(s) disponível(is) para esta data
                  </p>
                )}
              </div>
            </div>

            {/* Observações */}
            <div>
              <Label htmlFor="notes" className="text-sm font-medium mb-2 block">
                Observações (Opcional)
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Alguma observação especial..."
                rows={3}
                className="bg-bg-input border-border/50"
              />
            </div>

            {/* Botão de Agendar */}
            <GradientButton
              onClick={handleSubmit}
              disabled={!isFormValid || submitting}
              className="w-full"
              size="lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Calendar className="w-5 h-5 mr-2" />
                  Agendar Agora
                </>
              )}
            </GradientButton>

            {advanceAmount > 0 && (
              <p className="text-xs text-center text-muted-foreground">
                Você será redirecionado para pagar {selectedService?.advance_payment_percentage}% do valor após confirmar o agendamento
              </p>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Modal de Pagamento */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-md w-full p-0 bg-[hsl(var(--bg-primary))] border-border/50">
          <div className="glass rounded-2xl p-6 space-y-4">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-accent-cyan" />
                Pagamento da Entrada
              </DialogTitle>
              <DialogDescription>
                Escaneie o QR Code ou copie a chave PIX para pagar {selectedService?.advance_payment_percentage}% do valor
              </DialogDescription>
            </DialogHeader>

            {generatingPayment ? (
              <div className="text-center py-8">
                <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-accent-cyan" />
                <p className="text-muted-foreground">Gerando pagamento...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pixQrCode ? (
                  <div className="flex flex-col items-center gap-2">
                    <Label className="text-sm font-medium">QR Code PIX</Label>
                    <div className="flex justify-center p-4 bg-white rounded-lg">
                      <img 
                        src={pixQrCode} 
                        alt="QR Code PIX" 
                        className="w-64 h-64 border-2 border-accent-cyan/30 rounded-lg"
                        onError={(e) => {
                          console.error('Erro ao carregar QR Code:', pixQrCode);
                          e.currentTarget.style.display = 'none';
                          const parent = e.currentTarget.parentElement;
                          if (parent) {
                            parent.innerHTML = '<p className="text-red-400 text-sm">Erro ao carregar QR Code. Use a chave copia e cola abaixo.</p>';
                          }
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      Escaneie com o app do seu banco
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">
                      QR Code não disponível. Use a chave copia e cola abaixo.
                    </p>
                  </div>
                )}

                {pixCopyPaste && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Chave Copia e Cola:</Label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 p-2 rounded-lg bg-white/5 border border-border/30 text-xs break-all">
                        {pixCopyPaste}
                      </code>
                      <Button
                        onClick={() => {
                          navigator.clipboard.writeText(pixCopyPaste);
                          toast.success('Chave copiada!');
                        }}
                        variant="outline"
                        size="sm"
                        className="border-accent-cyan/50 text-accent-cyan hover:bg-accent-cyan/10"
                      >
                        Copiar
                      </Button>
                    </div>
                  </div>
                )}

                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                  <p className="text-xs text-blue-400 flex items-start gap-2">
                    <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>
                      Após o pagamento ser confirmado, você receberá uma confirmação do agendamento. 
                      O restante ({remainingAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}) deve ser pago no dia do atendimento.
                    </span>
                  </p>
                </div>

                <Button
                  onClick={() => {
                    setShowPaymentModal(false);
                    setShowSuccessModal(true);
                  }}
                  className="w-full bg-gradient-to-r from-accent-purple to-accent-cyan hover:opacity-90"
                >
                  Entendi, já paguei
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Sucesso */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="max-w-md w-full p-0 bg-[hsl(var(--bg-primary))] border-border/50">
          <div className="glass rounded-2xl p-6 space-y-4 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">
                Agendamento Confirmado!
              </DialogTitle>
              <DialogDescription>
                Seu agendamento foi criado com sucesso
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground">
                <strong className="text-white">{clientName}</strong>, seu agendamento está confirmado para:
              </p>
              <div className="p-3 rounded-lg bg-accent-cyan/10 border border-accent-cyan/30">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Calendar className="w-4 h-4 text-accent-cyan" />
                  <span className="font-semibold">
                    {appointmentDate && new Date(appointmentDate).toLocaleDateString('pt-BR', { 
                      weekday: 'long', 
                      day: 'numeric', 
                      month: 'long', 
                      year: 'numeric' 
                    })}
                  </span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Clock className="w-4 h-4 text-accent-cyan" />
                  <span className="font-semibold">{appointmentTime}</span>
                </div>
              </div>
              {selectedService && (
                <p className="text-muted-foreground">
                  Serviço: <strong className="text-white">{selectedService.name}</strong>
                </p>
              )}
              {advanceAmount > 0 && paymentId && (
                <p className="text-xs text-yellow-400">
                  💡 Aguardando confirmação do pagamento da entrada ({selectedService?.advance_payment_percentage}%)
                </p>
              )}
            </div>

            <Button
              onClick={() => {
                setShowSuccessModal(false);
                // Resetar formulário
                setSelectedServiceId("");
                setClientName("");
                setClientPhone("");
                setClientEmail("");
                setAppointmentDate("");
                setAppointmentTime("");
                setNotes("");
                setPixQrCode(null);
                setPixCopyPaste(null);
                setPaymentId(null);
                setAppointmentId(null);
              }}
              className="w-full bg-gradient-to-r from-accent-purple to-accent-cyan hover:opacity-90"
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PublicBooking;
