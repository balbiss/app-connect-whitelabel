-- ============================================
-- SISTEMA DE AGENDAMENTO COM LINK PÚBLICO
-- ============================================

-- Tabela de serviços oferecidos por cada usuário
CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- Nome do serviço (ex: "Corte de Cabelo", "Consulta Médica")
  description TEXT, -- Descrição do serviço
  duration_minutes INTEGER NOT NULL DEFAULT 30, -- Duração em minutos
  price DECIMAL(10, 2) NOT NULL, -- Preço total do serviço
  advance_payment_percentage INTEGER DEFAULT 50, -- Porcentagem a pagar no agendamento (padrão 50%)
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de horários disponíveis (configuração de disponibilidade)
CREATE TABLE IF NOT EXISTS public.availability_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Domingo, 6 = Sábado
  start_time TIME NOT NULL, -- Hora de início (ex: 09:00)
  end_time TIME NOT NULL, -- Hora de fim (ex: 18:00)
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, day_of_week, start_time, end_time)
);

-- Tabela de agendamentos
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  client_email TEXT,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid', 'refunded')),
  advance_payment_amount DECIMAL(10, 2), -- Valor pago no agendamento (50%)
  remaining_payment_amount DECIMAL(10, 2), -- Valor restante a pagar pessoalmente
  total_amount DECIMAL(10, 2) NOT NULL, -- Valor total do serviço
  payment_provider TEXT, -- 'mercado_pago', 'asaas', etc.
  payment_provider_id TEXT, -- ID do pagamento no provedor
  pix_id TEXT, -- ID do PIX gerado (se aplicável)
  pix_qr_code TEXT,
  pix_copy_paste TEXT,
  public_link_token TEXT UNIQUE, -- Token único para link público
  notes TEXT, -- Observações do agendamento
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);

-- Tabela de horários bloqueados (feriados, férias, etc.)
CREATE TABLE IF NOT EXISTS public.blocked_dates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_date DATE NOT NULL,
  reason TEXT, -- Motivo do bloqueio
  is_all_day BOOLEAN DEFAULT TRUE, -- Se bloqueia o dia inteiro
  start_time TIME, -- Se não for dia inteiro, hora de início
  end_time TIME, -- Se não for dia inteiro, hora de fim
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, blocked_date)
);

-- Tabela para link público único por usuário
CREATE TABLE IF NOT EXISTS public.public_booking_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  public_token TEXT UNIQUE NOT NULL, -- Token único para o link público
  is_active BOOLEAN DEFAULT TRUE,
  custom_message TEXT, -- Mensagem personalizada na página de agendamento
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id) -- Um link público por usuário
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_services_user_id ON public.services(user_id);
CREATE INDEX IF NOT EXISTS idx_services_is_active ON public.services(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_availability_slots_user_id ON public.availability_slots(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON public.appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_service_id ON public.appointments(service_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_public_token ON public.appointments(public_link_token);
CREATE INDEX IF NOT EXISTS idx_blocked_dates_user_id ON public.blocked_dates(user_id);
CREATE INDEX IF NOT EXISTS idx_blocked_dates_date ON public.blocked_dates(blocked_date);
CREATE INDEX IF NOT EXISTS idx_public_booking_links_user_id ON public.public_booking_links(user_id);
CREATE INDEX IF NOT EXISTS idx_public_booking_links_token ON public.public_booking_links(public_token);

-- RLS (Row Level Security)
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_booking_links ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para services
CREATE POLICY "Users can view own services" ON public.services
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own services" ON public.services
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own services" ON public.services
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own services" ON public.services
  FOR DELETE USING (auth.uid() = user_id);

-- Políticas RLS para availability_slots
CREATE POLICY "Users can view own availability" ON public.availability_slots
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own availability" ON public.availability_slots
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own availability" ON public.availability_slots
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own availability" ON public.availability_slots
  FOR DELETE USING (auth.uid() = user_id);

-- Políticas RLS para appointments
CREATE POLICY "Users can view own appointments" ON public.appointments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own appointments" ON public.appointments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own appointments" ON public.appointments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own appointments" ON public.appointments
  FOR DELETE USING (auth.uid() = user_id);

-- Política para acesso público aos agendamentos (apenas leitura via token)
-- Isso será feito via Edge Function que valida o token

-- Políticas RLS para blocked_dates
CREATE POLICY "Users can view own blocked dates" ON public.blocked_dates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own blocked dates" ON public.blocked_dates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own blocked dates" ON public.blocked_dates
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own blocked dates" ON public.blocked_dates
  FOR DELETE USING (auth.uid() = user_id);

-- Políticas RLS para public_booking_links
CREATE POLICY "Users can view own booking links" ON public.public_booking_links
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own booking links" ON public.public_booking_links
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own booking links" ON public.public_booking_links
  FOR UPDATE USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_availability_slots_updated_at
  BEFORE UPDATE ON public.availability_slots
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_public_booking_links_updated_at
  BEFORE UPDATE ON public.public_booking_links
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Função para gerar token único para link público
CREATE OR REPLACE FUNCTION generate_public_booking_token()
RETURNS TEXT AS $$
DECLARE
  token TEXT;
BEGIN
  -- Gerar token único de 32 caracteres
  token := encode(gen_random_bytes(24), 'base64');
  token := replace(replace(token, '/', '_'), '+', '-');
  token := substring(token from 1 for 32);
  RETURN token;
END;
$$ LANGUAGE plpgsql;

-- Comentários
COMMENT ON TABLE public.services IS 'Serviços oferecidos por cada usuário do SaaS';
COMMENT ON TABLE public.availability_slots IS 'Horários disponíveis para agendamento por dia da semana';
COMMENT ON TABLE public.appointments IS 'Agendamentos realizados pelos clientes';
COMMENT ON TABLE public.blocked_dates IS 'Datas bloqueadas (feriados, férias, etc.)';
COMMENT ON TABLE public.public_booking_links IS 'Links públicos únicos para cada usuário agendar serviços';


