import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { useCallback } from 'react';

export interface Service {
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

export interface AvailabilitySlot {
  id: string;
  user_id: string;
  day_of_week: number; // 0 = Domingo, 6 = Sábado
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  lunch_start_time?: string | null; // HH:MM
  lunch_end_time?: string | null; // HH:MM
  service_duration_minutes?: number | null;
  time_interval_minutes?: number | null;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface Professional {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  specialties: string[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  user_id: string;
  service_id: string;
  professional_id: string | null;
  client_name: string;
  client_phone: string;
  client_email: string | null;
  appointment_date: string; // YYYY-MM-DD
  appointment_time: string; // HH:MM
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  payment_status: 'pending' | 'partial' | 'paid' | 'refunded';
  advance_payment_amount: number | null;
  remaining_payment_amount: number | null;
  total_amount: number;
  payment_provider: string | null;
  payment_provider_id: string | null;
  pix_id: string | null;
  pix_qr_code: string | null;
  pix_copy_paste: string | null;
  public_link_token: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  confirmed_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  service?: Service;
  professional?: Professional;
}

export interface PublicBookingLink {
  id: string;
  user_id: string;
  public_token: string;
  is_active: boolean;
  custom_message: string | null;
  created_at: string;
  updated_at: string;
}

export function useServices() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: services = [], isLoading, refetch } = useQuery<Service[]>({
    queryKey: ['services', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      try {
        const { data, error } = await supabase
          .from('services')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          // Se a tabela não existe (código 42P01), retornar array vazio
          if (error.code === '42P01' || error.message.includes('does not exist')) {
            console.warn('Tabela services não existe ainda. Execute a migration 016_appointment_system.sql');
            return [];
          }
          throw error;
        }
        return data || [];
      } catch (error) {
        console.error('Erro ao carregar serviços:', error);
        return [];
      }
    },
    enabled: !!user,
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: false, // Não tentar novamente se falhar
  });

  const createService = useMutation({
    mutationFn: async (serviceData: Omit<Service, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      const { data, error } = await supabase
        .from('services')
        .insert({
          ...serviceData,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services', user?.id] });
    },
  });

  const updateService = useMutation({
    mutationFn: async ({ id, ...serviceData }: Partial<Service> & { id: string }) => {
      const { data, error } = await supabase
        .from('services')
        .update(serviceData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services', user?.id] });
    },
  });

  const deleteService = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services', user?.id] });
    },
  });

  return {
    services,
    isLoading,
    createService,
    updateService,
    deleteService,
    refetch,
  };
}

export function useAppointments() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: appointments = [], isLoading, refetch } = useQuery<Appointment[]>({
    queryKey: ['appointments', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      try {
        const { data, error } = await supabase
          .from('appointments')
          .select(`
            *,
            service:services(*),
            professional:professionals(*)
          `)
          .eq('user_id', user.id)
          .order('appointment_date', { ascending: true })
          .order('appointment_time', { ascending: true });

        if (error) {
          // Se a tabela não existe (código 42P01), retornar array vazio
          if (error.code === '42P01' || error.message.includes('does not exist')) {
            console.warn('Tabela appointments não existe ainda. Execute a migration 016_appointment_system.sql');
            return [];
          }
          throw error;
        }
        return data || [];
      } catch (error) {
        console.error('Erro ao carregar agendamentos:', error);
        return [];
      }
    },
    enabled: !!user,
    staleTime: 3 * 60 * 1000, // 3 minutos - agendamentos não mudam tão rápido (otimizado de 1min)
    gcTime: 10 * 60 * 1000, // 10 minutos - cache mais longo (otimizado de 5min)
    refetchOnWindowFocus: false, // Não refetch ao focar janela (reduz requisições)
    retry: false, // Não tentar novamente se falhar
  });

  const updateAppointmentStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Appointment['status'] }) => {
      const updateData: any = { status, updated_at: new Date().toISOString() };
      
      if (status === 'confirmed') {
        updateData.confirmed_at = new Date().toISOString();
      } else if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      } else if (status === 'cancelled') {
        updateData.cancelled_at = new Date().toISOString();
      } else if (status === 'no_show') {
        updateData.cancelled_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', user?.id] });
    },
  });

  const updateAppointment = useMutation({
    mutationFn: async ({ id, ...updateData }: Partial<Appointment> & { id: string }) => {
      const { data, error } = await supabase
        .from('appointments')
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', user?.id] });
    },
  });

  const deleteAppointment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', user?.id] });
    },
  });

  return {
    appointments,
    isLoading,
    updateAppointmentStatus,
    updateAppointment,
    deleteAppointment,
    refetch,
  };
}

export interface AppointmentMessageTemplates {
  id?: string;
  user_id: string;
  message_template_confirmed: string | null;
  message_template_completed: string | null;
  message_template_cancelled: string | null;
  message_template_no_show: string | null;
  message_template_professional_confirmed: string | null;
  message_template_professional_completed: string | null;
  message_template_professional_cancelled: string | null;
  message_template_professional_no_show: string | null;
  default_connection_id: string | null;
  created_at?: string;
  updated_at?: string;
}

export function useAppointmentMessageTemplates() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: templates, isLoading } = useQuery<AppointmentMessageTemplates | null>({
    queryKey: ['appointment-message-templates', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      try {
        const { data, error } = await supabase
          .from('appointment_settings')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') throw error;
        
        // Se não existir, criar com valores padrão
        if (!data) {
          const defaultTemplates: Partial<AppointmentMessageTemplates> = {
            user_id: user.id,
            message_template_confirmed: '🔔 *Atualização do seu Agendamento*\n\n✅ Seu agendamento foi *confirmado*!\n\n📅 *Data:* {{date}}\n🕐 *Horário:* {{time}}\n💼 *Serviço:* {{service}}\n💰 *Valor Total:* {{amount}}\n\nEstamos ansiosos para atendê-lo! 🎯',
            message_template_completed: '🔔 *Atualização do seu Agendamento*\n\n✅ Seu agendamento foi *concluído*!\n\n📅 *Data:* {{date}}\n🕐 *Horário:* {{time}}\n💼 *Serviço:* {{service}}\n💰 *Valor Total:* {{amount}}\n\nObrigado por escolher nossos serviços! 🙏',
            message_template_cancelled: '🔔 *Atualização do seu Agendamento*\n\n❌ Seu agendamento foi *cancelado*.\n\n📅 *Data:* {{date}}\n🕐 *Horário:* {{time}}\n💼 *Serviço:* {{service}}\n💰 *Valor Total:* {{amount}}\n\nEntre em contato conosco se tiver dúvidas.',
            message_template_no_show: '🔔 *Atualização do seu Agendamento*\n\n⚠️ Seu agendamento foi marcado como *não compareceu*.\n\n📅 *Data:* {{date}}\n🕐 *Horário:* {{time}}\n💼 *Serviço:* {{service}}\n💰 *Valor Total:* {{amount}}\n\nEntre em contato conosco se tiver dúvidas.',
            message_template_professional_confirmed: '🔔 *Atualização de Agendamento*\n\n✅ Agendamento *confirmado*:\n\n👤 *Cliente:* {{client_name}}\n📞 *Telefone:* {{client_phone}}\n📅 *Data:* {{date}}\n🕐 *Horário:* {{time}}\n💼 *Serviço:* {{service}}\n💰 *Valor Total:* {{amount}}\n\nPrepare-se para o atendimento! 🎯',
            message_template_professional_completed: '🔔 *Atualização de Agendamento*\n\n✅ Agendamento *concluído*:\n\n👤 *Cliente:* {{client_name}}\n📞 *Telefone:* {{client_phone}}\n📅 *Data:* {{date}}\n🕐 *Horário:* {{time}}\n💼 *Serviço:* {{service}}\n💰 *Valor Total:* {{amount}}\n\nAtendimento finalizado com sucesso! ✅',
            message_template_professional_cancelled: '🔔 *Atualização de Agendamento*\n\n❌ Agendamento *cancelado*:\n\n👤 *Cliente:* {{client_name}}\n📞 *Telefone:* {{client_phone}}\n📅 *Data:* {{date}}\n🕐 *Horário:* {{time}}\n💼 *Serviço:* {{service}}\n💰 *Valor Total:* {{amount}}',
            message_template_professional_no_show: '🔔 *Atualização de Agendamento*\n\n⚠️ Cliente *não compareceu*:\n\n👤 *Cliente:* {{client_name}}\n📞 *Telefone:* {{client_phone}}\n📅 *Data:* {{date}}\n🕐 *Horário:* {{time}}\n💼 *Serviço:* {{service}}\n💰 *Valor Total:* {{amount}}',
          };

          const { data: newData, error: insertError } = await supabase
            .from('appointment_settings')
            .insert(defaultTemplates)
            .select()
            .single();

          if (insertError) throw insertError;
          return newData as AppointmentMessageTemplates;
        }

        return data as AppointmentMessageTemplates;
      } catch (error) {
        console.error('Erro ao buscar templates:', error);
        return null;
      }
    },
    enabled: !!user?.id,
  });

  const updateTemplates = useMutation({
    mutationFn: async (newTemplates: Partial<AppointmentMessageTemplates>) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      
      const { data, error } = await supabase
        .from('appointment_settings')
        .upsert({
          user_id: user.id,
          ...newTemplates,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment-message-templates', user?.id] });
    },
  });

  return {
    templates,
    isLoading,
    updateTemplates,
  };
}

export function usePublicBookingLink() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: bookingLink, isLoading, refetch } = useQuery<PublicBookingLink | null>({
    queryKey: ['publicBookingLink', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      try {
        const { data, error } = await supabase
          .from('public_booking_links')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error) {
          // Se não encontrou registro, retornar null (normal)
          if (error.code === 'PGRST116') return null;
          // Se a tabela não existe (código 42P01), retornar null
          if (error.code === '42P01' || error.message.includes('does not exist')) {
            console.warn('Tabela public_booking_links não existe ainda. Execute a migration 016_appointment_system.sql');
            return null;
          }
          throw error;
        }
        return data || null;
      } catch (error) {
        console.error('Erro ao carregar link público:', error);
        return null;
      }
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: false, // Não tentar novamente se falhar
  });

  const createOrUpdateLink = useMutation({
    mutationFn: async (customMessage?: string) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      
      // Verificar se já existe
      const { data: existing } = await supabase
        .from('public_booking_links')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (existing) {
        // Atualizar
        const { data, error } = await supabase
          .from('public_booking_links')
          .update({
            custom_message: customMessage || null,
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Criar novo
        // Gerar token único
        const token = Array.from(crypto.getRandomValues(new Uint8Array(24)))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')
          .substring(0, 32);

        const { data, error } = await supabase
          .from('public_booking_links')
          .insert({
            user_id: user.id,
            public_token: token,
            is_active: true,
            custom_message: customMessage || null,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publicBookingLink', user?.id] });
    },
  });

  return {
    bookingLink,
    isLoading,
    createOrUpdateLink,
    refetch,
  };
}

export function useProfessionals() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: professionals = [], isLoading, refetch } = useQuery<Professional[]>({
    queryKey: ['professionals', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      try {
        const { data, error } = await supabase
          .from('professionals')
          .select('*')
          .eq('user_id', user.id)
          .order('name', { ascending: true });

        if (error) {
          if (error.code === '42P01' || error.message.includes('does not exist')) {
            console.warn('Tabela professionals não existe ainda. Execute a migration 017_professionals_and_schedule.sql');
            return [];
          }
          throw error;
        }
        return data || [];
      } catch (error) {
        console.error('Erro ao carregar profissionais:', error);
        return [];
      }
    },
    enabled: !!user,
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: false,
  });

  const createProfessional = useMutation({
    mutationFn: async (professionalData: Omit<Professional, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      const { data, error } = await supabase
        .from('professionals')
        .insert({
          ...professionalData,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professionals', user?.id] });
    },
  });

  const updateProfessional = useMutation({
    mutationFn: async ({ id, ...professionalData }: Partial<Professional> & { id: string }) => {
      const { data, error } = await supabase
        .from('professionals')
        .update(professionalData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professionals', user?.id] });
    },
  });

  const deleteProfessional = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('professionals')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professionals', user?.id] });
    },
  });

  return {
    professionals,
    isLoading,
    createProfessional,
    updateProfessional,
    deleteProfessional,
    refetch,
  };
}

export function useAvailabilitySlots() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: slots = [], isLoading, refetch } = useQuery<AvailabilitySlot[]>({
    queryKey: ['availabilitySlots', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      try {
        const { data, error } = await supabase
          .from('availability_slots')
          .select('*')
          .eq('user_id', user.id)
          .order('day_of_week', { ascending: true })
          .order('start_time', { ascending: true });

        if (error) {
          if (error.code === '42P01' || error.message.includes('does not exist')) {
            return [];
          }
          throw error;
        }
        return data || [];
      } catch (error) {
        console.error('Erro ao carregar horários disponíveis:', error);
        return [];
      }
    },
    enabled: !!user,
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: false,
  });

  const saveSlot = useMutation({
    mutationFn: async (slotData: Omit<AvailabilitySlot, 'id' | 'user_id' | 'created_at' | 'updated_at'> & { id?: string }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      
      if (slotData.id) {
        // Atualizar
        const { data, error } = await supabase
          .from('availability_slots')
          .update(slotData)
          .eq('id', slotData.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        // Criar
        const { data, error } = await supabase
          .from('availability_slots')
          .insert({
            ...slotData,
            user_id: user.id,
          })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availabilitySlots', user?.id] });
    },
  });

  const deleteSlot = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('availability_slots')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availabilitySlots', user?.id] });
    },
  });

  return {
    slots,
    isLoading,
    saveSlot,
    deleteSlot,
    refetch,
  };
}

