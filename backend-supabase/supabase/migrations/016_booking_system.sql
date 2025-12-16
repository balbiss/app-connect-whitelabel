-- ============================================
-- SISTEMA DE AGENDAMENTO COM LINK PÚBLICO
-- ============================================

-- Tabela de serviços (cada usuário pode ter vários serviços)
CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- Nome do serviço (ex: "Corte de Cabelo", "Consulta Médica")
  description TEXT, -- Descrição do serviço
  duration_minutes INTEGER NOT NULL DEFAULT 30, -- Duração em minutos
  price DECIMAL(10, 2) NOT NULL, -- Preço total do serviço
  advance_payment_percentage INTEGER DEFAULT 50, -- Porcentagem de pagamento antecipado (padrão 50%)
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_services_user_id ON public.services(user_id);
CREATE INDEX IF NOT EXISTS idx_services_is_active ON public.services(user_id, is_active) WHERE is_active = TRUE;

-- RLS
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para services (já criadas em 016_appointment_system.sql, então removemos se existirem e recriamos)
DROP POLICY IF EXISTS "Users can view own services" ON public.services;
DROP POLICY IF EXISTS "Users can insert own services" ON public.services;
DROP POLICY IF EXISTS "Users can update own services" ON public.services;
DROP POLICY IF EXISTS "Users can delete own services" ON public.services;

CREATE POLICY "Users can view own services" ON public.services
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own services" ON public.services
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own services" ON public.services
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own services" ON public.services
  FOR DELETE USING (auth.uid() = user_id);

-- Tabela de agendamentos
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES public.connections(id) ON DELETE SET NULL, -- Instância WhatsApp para notificações
  
  -- Dados do cliente
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  client_email TEXT,
  
  -- Dados do agendamento
  booking_date DATE NOT NULL, -- Data do agendamento
  booking_time TIME NOT NULL, -- Horário do agendamento
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')),
  
  -- Pagamento
  total_price DECIMAL(10, 2) NOT NULL, -- Preço total
  advance_payment DECIMAL(10, 2) NOT NULL, -- Valor do pagamento antecipado (50%)
  advance_payment_status TEXT DEFAULT 'pending' CHECK (advance_payment_status IN ('pending', 'paid', 'refunded')),
  advance_payment_provider TEXT, -- 'mercado_pago', 'asaas', etc.
  advance_payment_id TEXT, -- ID do pagamento no provedor
  pix_qr_code TEXT,
  pix_copy_paste TEXT,
  
  -- Observações
  notes TEXT, -- Observações do cliente
  internal_notes TEXT, -- Observações internas do prestador
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_service_id ON public.bookings(service_id);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_date ON public.bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_client_phone ON public.bookings(client_phone);

-- RLS
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bookings" ON public.bookings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bookings" ON public.bookings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bookings" ON public.bookings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bookings" ON public.bookings
  FOR DELETE USING (auth.uid() = user_id);

-- Tabela de configurações de agendamento por usuário
CREATE TABLE IF NOT EXISTS public.booking_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Link público único
  public_link_slug TEXT UNIQUE, -- Slug único para o link público (ex: "joao-barbearia")
  
  -- Horários de funcionamento
  timezone TEXT DEFAULT 'America/Sao_Paulo',
  business_hours JSONB, -- { "monday": { "open": "09:00", "close": "18:00", "enabled": true }, ... }
  
  -- Configurações gerais
  advance_booking_days INTEGER DEFAULT 30, -- Quantos dias à frente pode agendar
  min_advance_hours INTEGER DEFAULT 2, -- Horas mínimas de antecedência
  slot_duration_minutes INTEGER DEFAULT 30, -- Duração padrão dos slots
  
  -- Mensagens automáticas
  confirmation_message_template TEXT, -- Mensagem de confirmação
  reminder_message_template TEXT, -- Mensagem de lembrete
  reminder_hours_before INTEGER DEFAULT 24, -- Horas antes do agendamento para enviar lembrete
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_booking_settings_user_id ON public.booking_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_booking_settings_public_link_slug ON public.booking_settings(public_link_slug);

-- RLS
ALTER TABLE public.booking_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own booking settings" ON public.booking_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own booking settings" ON public.booking_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own booking settings" ON public.booking_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para updated_at (já criado em 016_appointment_system.sql, então removemos se existir e recriamos)
DROP TRIGGER IF EXISTS update_services_updated_at ON public.services;
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_booking_settings_updated_at BEFORE UPDATE ON public.booking_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para gerar slug único
CREATE OR REPLACE FUNCTION generate_unique_slug(base_name TEXT)
RETURNS TEXT AS $$
DECLARE
  slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Normalizar nome para slug
  slug := lower(regexp_replace(base_name, '[^a-z0-9]+', '-', 'g'));
  slug := trim(both '-' from slug);
  
  -- Verificar se já existe e adicionar contador se necessário
  WHILE EXISTS (SELECT 1 FROM public.booking_settings WHERE public_link_slug = slug) LOOP
    counter := counter + 1;
    slug := slug || '-' || counter;
  END LOOP;
  
  RETURN slug;
END;
$$ LANGUAGE plpgsql;

