-- ============================================
-- SISTEMA DE PROFISSIONAIS E HORÁRIOS
-- ============================================

-- Tabela de profissionais
CREATE TABLE IF NOT EXISTS public.professionals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  specialties TEXT[], -- Array de especialidades
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adicionar professional_id na tabela appointments
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS professional_id UUID REFERENCES public.professionals(id) ON DELETE SET NULL;

-- Criar índice para appointments com professional_id
CREATE INDEX IF NOT EXISTS idx_appointments_professional_id ON public.appointments(professional_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date_time_professional ON public.appointments(appointment_date, appointment_time, professional_id);

-- Atualizar tabela availability_slots para incluir professional_id (horários específicos por profissional)
ALTER TABLE public.availability_slots
ADD COLUMN IF NOT EXISTS professional_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Criar índice para availability_slots com professional_id
CREATE INDEX IF NOT EXISTS idx_availability_slots_professional_id ON public.availability_slots(professional_id);

-- Atualizar tabela blocked_dates para incluir professional_id (bloqueios específicos por profissional)
ALTER TABLE public.blocked_dates
ADD COLUMN IF NOT EXISTS professional_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Criar índice para blocked_dates com professional_id
CREATE INDEX IF NOT EXISTS idx_blocked_dates_professional_id ON public.blocked_dates(professional_id);

-- RLS (Row Level Security) para professionals
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para professionals (DROP IF EXISTS para evitar erro se já existir)
DROP POLICY IF EXISTS "Users can view own professionals" ON public.professionals;
DROP POLICY IF EXISTS "Users can insert own professionals" ON public.professionals;
DROP POLICY IF EXISTS "Users can update own professionals" ON public.professionals;
DROP POLICY IF EXISTS "Users can delete own professionals" ON public.professionals;

CREATE POLICY "Users can view own professionals" ON public.professionals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own professionals" ON public.professionals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own professionals" ON public.professionals
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own professionals" ON public.professionals
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at em professionals (DROP IF EXISTS para evitar erro se já existir)
DROP TRIGGER IF EXISTS update_professionals_updated_at ON public.professionals;
CREATE TRIGGER update_professionals_updated_at
  BEFORE UPDATE ON public.professionals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Função para verificar conflitos de horário (CREATE OR REPLACE já trata se existir)
CREATE OR REPLACE FUNCTION check_appointment_conflict(
  p_appointment_date DATE,
  p_appointment_time TIME,
  p_professional_id UUID,
  p_service_duration INTEGER,
  p_exclude_appointment_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  conflict_exists BOOLEAN;
  appointment_end_time TIME;
BEGIN
  -- Calcular horário de término
  appointment_end_time := (p_appointment_time + (p_service_duration || ' minutes')::INTERVAL)::TIME;
  
  -- Verificar se existe conflito
  SELECT EXISTS(
    SELECT 1
    FROM public.appointments
    WHERE appointment_date = p_appointment_date
      AND professional_id = p_professional_id
      AND status NOT IN ('cancelled', 'no_show')
      AND (
        -- Conflito: novo agendamento começa durante um existente
        (appointment_time <= p_appointment_time AND 
         (appointment_time + ((SELECT duration_minutes FROM public.services WHERE id = (SELECT service_id FROM public.appointments WHERE id = (SELECT id FROM public.appointments WHERE appointment_date = p_appointment_date AND appointment_time = p_appointment_time AND professional_id = p_professional_id LIMIT 1) LIMIT 1)) || ' minutes')::INTERVAL)::TIME > p_appointment_time)
        OR
        -- Conflito: novo agendamento termina durante um existente
        (appointment_time < appointment_end_time AND 
         appointment_time >= p_appointment_time)
      )
      AND (p_exclude_appointment_id IS NULL OR id != p_exclude_appointment_id)
  ) INTO conflict_exists;
  
  RETURN conflict_exists;
END;
$$ LANGUAGE plpgsql;

-- Comentários
COMMENT ON TABLE public.professionals IS 'Profissionais que atendem os clientes';
COMMENT ON COLUMN public.appointments.professional_id IS 'ID do profissional que atenderá o agendamento (NULL = qualquer profissional disponível)';
COMMENT ON FUNCTION check_appointment_conflict IS 'Verifica se há conflito de horário para um agendamento';

