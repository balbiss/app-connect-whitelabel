-- ============================================
-- CONFIGURAÇÃO DE HORÁRIOS E INTERVALOS
-- ============================================

-- Adicionar campos de configuração na tabela availability_slots
ALTER TABLE public.availability_slots
ADD COLUMN IF NOT EXISTS lunch_start_time TIME,
ADD COLUMN IF NOT EXISTS lunch_end_time TIME,
ADD COLUMN IF NOT EXISTS service_duration_minutes INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS time_interval_minutes INTEGER DEFAULT 10;

-- Criar tabela para configurações globais de agendamento por usuário
CREATE TABLE IF NOT EXISTS public.appointment_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  default_service_duration_minutes INTEGER DEFAULT 30,
  default_time_interval_minutes INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.appointment_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own appointment settings" ON public.appointment_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own appointment settings" ON public.appointment_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own appointment settings" ON public.appointment_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_appointment_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_appointment_settings_updated_at ON public.appointment_settings;
CREATE TRIGGER update_appointment_settings_updated_at
  BEFORE UPDATE ON public.appointment_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_appointment_settings_updated_at();


