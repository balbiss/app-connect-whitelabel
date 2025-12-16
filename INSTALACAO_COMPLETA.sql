-- ============================================
-- INSTALACAO COMPLETA DO BANCO DE DADOS
-- APP CONNECT - WHITE LABEL
-- ============================================
-- Execute este arquivo NO SUPABASE SQL EDITOR
-- Ele vai criar TODAS as tabelas, funcoes e politicas
-- ============================================
-- TEMPO ESTIMADO: 1-2 minutos
-- IMPORTANTE: Execute TODO o conteudo de uma vez so
-- ============================================

DO $$ 
BEGIN 
  RAISE NOTICE 'INICIANDO INSTALACAO DO APP CONNECT...';
  RAISE NOTICE '------------------------------------------------------------';
END $$;


-- ============================================
-- Arquivo: EXTENSOES.sql
-- ============================================


-- ============================================
-- EXTENSÕES NECESSÁRIAS
-- ============================================

-- Extensão para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Extensão para HTTP requests (necessária para cron jobs)
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- Extensão para cron jobs (agendamento de tarefas)
-- Nota: No Supabase, pg_cron pode precisar ser habilitado manualmente no dashboard
-- Se der erro, habilite em: Settings > Database > Extensions > pg_cron
CREATE EXTENSION IF NOT EXISTS "pg_cron";






-- ============================================
-- Arquivo: TABELA_PROFILES.sql
-- ============================================


-- ============================================
-- TABELA: profiles (Perfis de Usuários)
-- ============================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  phone TEXT,
  plan TEXT DEFAULT 'pro' CHECK (plan IN ('pro', 'super_pro')),
  -- Limites por plano
  max_connections INTEGER DEFAULT 2, -- pro: 2, super_pro: 4
  -- Dados do Google OAuth
  google_id TEXT UNIQUE,
  avatar_url TEXT,
  -- Dados de pagamento Cakto
  cakto_customer_id TEXT UNIQUE,
  cakto_subscription_id TEXT UNIQUE,
  subscription_status TEXT CHECK (subscription_status IN ('active', 'canceled', 'past_due', 'trialing', 'paused')),
  subscription_ends_at TIMESTAMPTZ,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_profiles_plan ON public.profiles(plan);
CREATE INDEX IF NOT EXISTS idx_profiles_cakto_customer ON public.profiles(cakto_customer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON public.profiles(subscription_status);

-- RLS (Row Level Security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Função para atualizar max_connections baseado no plano
CREATE OR REPLACE FUNCTION update_max_connections()
RETURNS TRIGGER AS $$
BEGIN
  CASE NEW.plan
    WHEN 'pro' THEN
      NEW.max_connections := 2;
    WHEN 'super_pro' THEN
      NEW.max_connections := 4;
    ELSE
      NEW.max_connections := 2; -- Padrão pro
  END CASE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar max_connections quando o plano mudar
CREATE TRIGGER update_max_connections_trigger
  BEFORE INSERT OR UPDATE OF plan ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_max_connections();

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para updated_at
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Função para criar perfil automaticamente quando usuário é criado
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    email, 
    name,
    google_id,
    avatar_url,
    plan,
    max_connections
  )
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Usuário'),
    NEW.raw_user_meta_data->>'provider_id', -- Google ID se vier do OAuth
    NEW.raw_user_meta_data->>'avatar_url',
    'pro', -- Plano padrão (pro)
    2 -- Limite padrão (pro: 2 conexões)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar perfil automaticamente
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();


-- ============================================
-- Arquivo: TABELA_CONNECTIONS.sql
-- ============================================


-- ============================================
-- TABELA: connections (Conexões WhatsApp)
-- ============================================

CREATE TABLE IF NOT EXISTS public.connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  platform TEXT DEFAULT 'whatsapp',
  status TEXT DEFAULT 'offline' CHECK (status IN ('offline', 'connecting', 'online', 'disconnected')),
  
  -- Dados da API WUZAPI
  api_instance_id TEXT UNIQUE,
  api_instance_token TEXT NOT NULL UNIQUE,
  
  -- Dados do WhatsApp
  avatar_url TEXT,
  qr_code TEXT,
  last_connected_at TIMESTAMPTZ,
  
  -- Estatísticas
  messages_sent INTEGER DEFAULT 0,
  active_days INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT user_connection_unique UNIQUE (user_id, name)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_connections_user_id ON public.connections(user_id);
CREATE INDEX IF NOT EXISTS idx_connections_status ON public.connections(status);
CREATE INDEX IF NOT EXISTS idx_connections_api_instance_id ON public.connections(api_instance_id);

-- RLS (Row Level Security)
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view own connections" ON public.connections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own connections" ON public.connections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own connections" ON public.connections
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own connections" ON public.connections
  FOR DELETE USING (auth.uid() = user_id);

-- Função para verificar limite de conexões por plano
CREATE OR REPLACE FUNCTION check_connection_limit()
RETURNS TRIGGER AS $$
DECLARE
  user_plan TEXT;
  max_conn INTEGER;
  current_count INTEGER;
BEGIN
  -- Buscar plano e limite do usuário
  SELECT plan, max_connections INTO user_plan, max_conn
  FROM public.profiles
  WHERE id = NEW.user_id;

  -- Contar conexões ativas do usuário
  SELECT COUNT(*) INTO current_count
  FROM public.connections
  WHERE user_id = NEW.user_id;

  -- Verificar se excede o limite
  IF current_count >= max_conn THEN
    RAISE EXCEPTION 'Limite de conexões excedido. Plano: %, Limite: %', user_plan, max_conn;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para verificar limite antes de inserir conexão
CREATE TRIGGER check_connection_limit_trigger
  BEFORE INSERT ON public.connections
  FOR EACH ROW
  EXECUTE FUNCTION check_connection_limit();

-- Trigger para updated_at
CREATE TRIGGER update_connections_updated_at 
  BEFORE UPDATE ON public.connections
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();






-- ============================================
-- Arquivo: TABELA_DISPAROS.sql
-- ============================================


-- ============================================
-- TABELA: disparos (Campanhas de Disparo)
-- ============================================

CREATE TABLE IF NOT EXISTS public.disparos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES public.connections(id) ON DELETE CASCADE,
  
  campaign_name TEXT NOT NULL,
  platform TEXT DEFAULT 'whatsapp',
  
  -- Mensagens
  message_variations JSONB DEFAULT '[]'::jsonb, -- Array de variações de mensagem
  
  -- Contadores
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  pending_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'failed', 'paused', 'cancelled')),
  
  -- Agendamento
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Delay entre mensagens (em milissegundos)
  delay_min INTEGER DEFAULT 7000, -- 7 segundos
  delay_max INTEGER DEFAULT 13000, -- 13 segundos
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_disparos_user_id ON public.disparos(user_id);
CREATE INDEX IF NOT EXISTS idx_disparos_connection_id ON public.disparos(connection_id);
CREATE INDEX IF NOT EXISTS idx_disparos_status ON public.disparos(status);
CREATE INDEX IF NOT EXISTS idx_disparos_scheduled_at ON public.disparos(scheduled_at) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_disparos_created_at ON public.disparos(created_at);

-- RLS (Row Level Security)
ALTER TABLE public.disparos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view own disparos" ON public.disparos
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own disparos" ON public.disparos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own disparos" ON public.disparos
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own disparos" ON public.disparos
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER update_disparos_updated_at 
  BEFORE UPDATE ON public.disparos
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();






-- ============================================
-- Arquivo: TABELA_DISPARO_RECIPIENTS.sql
-- ============================================


-- ============================================
-- TABELA: disparo_recipients (Destinatários das Campanhas)
-- ============================================

CREATE TABLE IF NOT EXISTS public.disparo_recipients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  disparo_id UUID NOT NULL REFERENCES public.disparos(id) ON DELETE CASCADE,
  
  name TEXT,
  phone_number TEXT NOT NULL,
  
  -- Mensagem personalizada
  message_variation_id INTEGER,
  personalized_message TEXT,
  
  -- Mídia
  media_url TEXT,
  media_type TEXT CHECK (media_type IN ('image', 'video', 'document', 'audio')),
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'delivered')),
  
  -- Timestamps
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_disparo_recipients_disparo_id ON public.disparo_recipients(disparo_id);
CREATE INDEX IF NOT EXISTS idx_disparo_recipients_status ON public.disparo_recipients(status);
CREATE INDEX IF NOT EXISTS idx_disparo_recipients_phone ON public.disparo_recipients(phone_number);

-- RLS (Row Level Security)
ALTER TABLE public.disparo_recipients ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view own recipients" ON public.disparo_recipients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.disparos
      WHERE disparos.id = disparo_recipients.disparo_id
      AND disparos.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own recipients" ON public.disparo_recipients
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.disparos
      WHERE disparos.id = disparo_recipients.disparo_id
      AND disparos.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own recipients" ON public.disparo_recipients
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.disparos
      WHERE disparos.id = disparo_recipients.disparo_id
      AND disparos.user_id = auth.uid()
    )
  );






-- ============================================
-- Arquivo: TABELA_PAGAMENTOS.sql
-- ============================================


-- ============================================
-- TABELA: pagamentos (Histórico de Pagamentos Cakto)
-- ============================================

CREATE TABLE IF NOT EXISTS public.pagamentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Dados Cakto
  cakto_payment_id TEXT UNIQUE NOT NULL,
  cakto_subscription_id TEXT,
  cakto_customer_id TEXT,
  
  -- Dados do pagamento
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'BRL',
  plan TEXT NOT NULL CHECK (plan IN ('pro', 'super_pro')),
  
  -- Status
  status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'failed', 'refunded', 'canceled')),
  
  -- Método de pagamento
  payment_method TEXT,
  
  -- Timestamps
  paid_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_pagamentos_user_id ON public.pagamentos(user_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_cakto_payment_id ON public.pagamentos(cakto_payment_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_status ON public.pagamentos(status);
CREATE INDEX IF NOT EXISTS idx_pagamentos_created_at ON public.pagamentos(created_at);

-- RLS (Row Level Security)
ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view own payments" ON public.pagamentos
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payments" ON public.pagamentos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER update_pagamentos_updated_at 
  BEFORE UPDATE ON public.pagamentos
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();






-- ============================================
-- Arquivo: FUNCOES_AUXILIARES.sql
-- ============================================


-- ============================================
-- FUNÇÕES AUXILIARES
-- ============================================

-- Função para incrementar contador de enviados
CREATE OR REPLACE FUNCTION increment_disparo_sent(disparo_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.disparos
  SET 
    sent_count = sent_count + 1,
    pending_count = GREATEST(0, pending_count - 1),
    updated_at = NOW()
  WHERE id = disparo_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para incrementar contador de falhas
CREATE OR REPLACE FUNCTION increment_disparo_failed(disparo_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.disparos
  SET 
    failed_count = failed_count + 1,
    pending_count = GREATEST(0, pending_count - 1),
    updated_at = NOW()
  WHERE id = disparo_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para incrementar contador de entregues
CREATE OR REPLACE FUNCTION increment_disparo_delivered(disparo_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.disparos
  SET 
    delivered_count = delivered_count + 1,
    updated_at = NOW()
  WHERE id = disparo_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter limite de conexões do usuário
CREATE OR REPLACE FUNCTION get_user_connection_limit(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  user_limit INTEGER;
BEGIN
  SELECT max_connections INTO user_limit
  FROM public.profiles
  WHERE id = user_uuid;
  
  RETURN COALESCE(user_limit, 2); -- Padrão: 2 (pro)
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para contar conexões ativas do usuário
CREATE OR REPLACE FUNCTION count_user_connections(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  conn_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO conn_count
  FROM public.connections
  WHERE user_id = user_uuid;
  
  RETURN COALESCE(conn_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View para verificar status de conexões do usuário
CREATE OR REPLACE VIEW user_connection_status AS
SELECT 
  p.id as user_id,
  p.plan,
  p.max_connections,
  COUNT(c.id) as current_connections,
  (p.max_connections - COUNT(c.id)) as remaining_connections,
  CASE 
    WHEN COUNT(c.id) < p.max_connections THEN true
    ELSE false
  END as can_create_connection
FROM public.profiles p
LEFT JOIN public.connections c ON c.user_id = p.id
GROUP BY p.id, p.plan, p.max_connections;






-- ============================================
-- Arquivo: 001_initial_schema.sql
-- ============================================


-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- Tabela de usuários (já existe no Supabase Auth, mas criamos perfil)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  phone TEXT,
  plan TEXT DEFAULT 'pro' CHECK (plan IN ('pro', 'super_pro')),
  -- Limites por plano
  max_connections INTEGER DEFAULT 2, -- pro: 2, super_pro: 4
  -- Dados de pagamento Cakto
  cakto_customer_id TEXT UNIQUE,
  cakto_subscription_id TEXT UNIQUE,
  subscription_status TEXT CHECK (subscription_status IN ('active', 'canceled', 'past_due', 'trialing', 'paused')),
  subscription_ends_at TIMESTAMPTZ,
  -- Dados do Google OAuth
  google_id TEXT UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Função para atualizar max_connections baseado no plano
CREATE OR REPLACE FUNCTION update_max_connections()
RETURNS TRIGGER AS $$
BEGIN
  CASE NEW.plan
    WHEN 'pro' THEN
      NEW.max_connections := 2;
    WHEN 'super_pro' THEN
      NEW.max_connections := 4;
    ELSE
      NEW.max_connections := 2; -- Padrão pro
  END CASE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar max_connections quando o plano mudar
-- (Já criado em TABELA_PROFILES.sql, então removemos se existir e recriamos)
DROP TRIGGER IF EXISTS update_max_connections_trigger ON public.profiles;
CREATE TRIGGER update_max_connections_trigger
  BEFORE INSERT OR UPDATE OF plan ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_max_connections();

-- Tabela de conexões WhatsApp (instâncias)
CREATE TABLE IF NOT EXISTS public.connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  platform TEXT DEFAULT 'whatsapp',
  status TEXT DEFAULT 'offline' CHECK (status IN ('offline', 'connecting', 'online', 'disconnected')),
  
  -- Dados da API WUZAPI
  api_instance_id TEXT UNIQUE,
  api_instance_token TEXT NOT NULL UNIQUE,
  
  -- Dados do WhatsApp
  avatar_url TEXT,
  qr_code TEXT,
  last_connected_at TIMESTAMPTZ,
  
  -- Estatísticas
  messages_sent INTEGER DEFAULT 0,
  active_days INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT user_connection_unique UNIQUE (user_id, name)
);

-- Tabela de disparos (campanhas)
CREATE TABLE IF NOT EXISTS public.disparos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES public.connections(id) ON DELETE CASCADE,
  
  campaign_name TEXT NOT NULL,
  platform TEXT DEFAULT 'whatsapp',
  
  -- Mensagens
  message_variations JSONB DEFAULT '[]'::jsonb, -- Array de variações de mensagem
  
  -- Contadores
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  pending_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'failed', 'paused', 'cancelled')),
  
  -- Agendamento
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Delay entre mensagens (em milissegundos)
  delay_min INTEGER DEFAULT 7000, -- 7 segundos
  delay_max INTEGER DEFAULT 13000, -- 13 segundos
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de destinatários dos disparos
CREATE TABLE IF NOT EXISTS public.disparo_recipients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  disparo_id UUID NOT NULL REFERENCES public.disparos(id) ON DELETE CASCADE,
  
  name TEXT,
  phone_number TEXT NOT NULL,
  
  -- Mensagem personalizada
  message_variation_id INTEGER,
  personalized_message TEXT,
  
  -- Mídia
  media_url TEXT,
  media_type TEXT CHECK (media_type IN ('image', 'video', 'document', 'audio')),
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'delivered')),
  
  -- Timestamps
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_connections_user_id ON public.connections(user_id);
CREATE INDEX IF NOT EXISTS idx_connections_status ON public.connections(status);
CREATE INDEX IF NOT EXISTS idx_disparos_user_id ON public.disparos(user_id);
CREATE INDEX IF NOT EXISTS idx_disparos_connection_id ON public.disparos(connection_id);
CREATE INDEX IF NOT EXISTS idx_disparos_status ON public.disparos(status);
CREATE INDEX IF NOT EXISTS idx_disparos_scheduled_at ON public.disparos(scheduled_at) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_disparo_recipients_disparo_id ON public.disparo_recipients(disparo_id);
CREATE INDEX IF NOT EXISTS idx_disparo_recipients_status ON public.disparo_recipients(status);

-- RLS (Row Level Security) - Isolamento de dados por usuário
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disparos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disparo_recipients ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para profiles
-- Políticas RLS (já criadas em TABELA_PROFILES.sql, então removemos se existirem e recriamos)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Função para verificar limite de conexões por plano
CREATE OR REPLACE FUNCTION check_connection_limit()
RETURNS TRIGGER AS $$
DECLARE
  user_plan TEXT;
  max_conn INTEGER;
  current_count INTEGER;
BEGIN
  -- Buscar plano e limite do usuário
  SELECT plan, max_connections INTO user_plan, max_conn
  FROM public.profiles
  WHERE id = NEW.user_id;

  -- Contar conexões ativas do usuário
  SELECT COUNT(*) INTO current_count
  FROM public.connections
  WHERE user_id = NEW.user_id;

  -- Verificar se excede o limite
  IF current_count >= max_conn THEN
    RAISE EXCEPTION 'Limite de conexões excedido. Plano: %, Limite: %', user_plan, max_conn;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para verificar limite antes de inserir conexão
-- (Já criado em TABELA_CONNECTIONS.sql, então removemos se existir e recriamos)
DROP TRIGGER IF EXISTS check_connection_limit_trigger ON public.connections;
CREATE TRIGGER check_connection_limit_trigger
  BEFORE INSERT ON public.connections
  FOR EACH ROW
  EXECUTE FUNCTION check_connection_limit();

-- Políticas RLS para connections (já criadas em TABELA_CONNECTIONS.sql, então removemos se existirem e recriamos)
DROP POLICY IF EXISTS "Users can view own connections" ON public.connections;
DROP POLICY IF EXISTS "Users can insert own connections" ON public.connections;
DROP POLICY IF EXISTS "Users can update own connections" ON public.connections;
DROP POLICY IF EXISTS "Users can delete own connections" ON public.connections;

CREATE POLICY "Users can view own connections" ON public.connections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own connections" ON public.connections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own connections" ON public.connections
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own connections" ON public.connections
  FOR DELETE USING (auth.uid() = user_id);

-- Políticas RLS para disparos (já criadas em TABELA_DISPAROS.sql, então removemos se existirem e recriamos)
DROP POLICY IF EXISTS "Users can view own disparos" ON public.disparos;
DROP POLICY IF EXISTS "Users can insert own disparos" ON public.disparos;
DROP POLICY IF EXISTS "Users can update own disparos" ON public.disparos;
DROP POLICY IF EXISTS "Users can delete own disparos" ON public.disparos;

CREATE POLICY "Users can view own disparos" ON public.disparos
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own disparos" ON public.disparos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own disparos" ON public.disparos
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own disparos" ON public.disparos
  FOR DELETE USING (auth.uid() = user_id);

-- Políticas RLS para disparo_recipients (já criadas em TABELA_DISPARO_RECIPIENTS.sql, então removemos se existirem e recriamos)
DROP POLICY IF EXISTS "Users can view own recipients" ON public.disparo_recipients;
DROP POLICY IF EXISTS "Users can insert own recipients" ON public.disparo_recipients;
DROP POLICY IF EXISTS "Users can update own recipients" ON public.disparo_recipients;

CREATE POLICY "Users can view own recipients" ON public.disparo_recipients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.disparos
      WHERE disparos.id = disparo_recipients.disparo_id
      AND disparos.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own recipients" ON public.disparo_recipients
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.disparos
      WHERE disparos.id = disparo_recipients.disparo_id
      AND disparos.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own recipients" ON public.disparo_recipients
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.disparos
      WHERE disparos.id = disparo_recipients.disparo_id
      AND disparos.user_id = auth.uid()
    )
  );

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
-- Triggers para updated_at (já criados nas tabelas, então removemos se existirem e recriamos)
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_connections_updated_at ON public.connections;
DROP TRIGGER IF EXISTS update_disparos_updated_at ON public.disparos;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_connections_updated_at BEFORE UPDATE ON public.connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_disparos_updated_at BEFORE UPDATE ON public.disparos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para criar perfil automaticamente quando usuário é criado
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    email, 
    name,
    google_id,
    avatar_url,
    plan,
    max_connections
  )
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Usuário'),
    NEW.raw_user_meta_data->>'provider_id', -- Google ID se vier do OAuth
    NEW.raw_user_meta_data->>'avatar_url',
    'pro', -- Plano padrão (pro)
    2 -- Limite padrão (pro: 2 conexões)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar perfil automaticamente quando usuário é criado
-- (Já criado em TABELA_PROFILES.sql, então removemos se existir e recriamos)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();



-- ============================================
-- Arquivo: 002_functions.sql
-- ============================================


-- Funções para incrementar contadores de disparos

CREATE OR REPLACE FUNCTION increment_disparo_sent(disparo_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.disparos
  SET 
    sent_count = sent_count + 1,
    pending_count = GREATEST(0, pending_count - 1),
    updated_at = NOW()
  WHERE id = disparo_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_disparo_failed(disparo_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.disparos
  SET 
    failed_count = failed_count + 1,
    pending_count = GREATEST(0, pending_count - 1),
    updated_at = NOW()
  WHERE id = disparo_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_disparo_delivered(disparo_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.disparos
  SET 
    delivered_count = delivered_count + 1,
    updated_at = NOW()
  WHERE id = disparo_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;







-- ============================================
-- Arquivo: 003_cron_job.sql
-- ============================================


-- Criar cron job para executar disparos agendados
-- Executa a cada minuto

-- Remover job se já existir
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'execute-scheduled-disparos') THEN
    PERFORM cron.unschedule('execute-scheduled-disparos');
  END IF;
END $$;

-- Criar novo job usando cast explícito na função
-- NOTA: Se der erro de ambiguidade, execute este SQL manualmente depois da instalação
-- Veja o arquivo: INSTALAR_CRON_JOBS.sql

-- Comentado temporariamente para evitar erro de ambiguidade
-- Execute manualmente depois da instalação completa:
/*
SELECT cron.schedule(
  'execute-scheduled-disparos'::text,
  '* * * * *'::text,
  ('SELECT net.http_post(url := current_setting(''app.supabase_url'') || ''/functions/v1/execute-scheduled-disparos'', headers := jsonb_build_object(''Content-Type'', ''application/json'', ''Authorization'', ''Bearer '' || current_setting(''app.supabase_service_role_key'')), body := ''{}''::jsonb) AS request_id;')::text
);
*/







-- ============================================
-- Arquivo: 004_add_ai_config.sql
-- ============================================


-- ============================================
-- ADICIONAR CAMPOS DE CONFIGURAÇÃO DE IA
-- ============================================

-- Adicionar colunas para configuração de IA no perfil
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS ai_provider TEXT CHECK (ai_provider IN ('openai', 'gemini', 'grok', NULL)),
ADD COLUMN IF NOT EXISTS ai_api_key TEXT,
ADD COLUMN IF NOT EXISTS ai_model TEXT;

-- Comentários
COMMENT ON COLUMN public.profiles.ai_provider IS 'Provedor de IA escolhido: openai, gemini ou grok';
COMMENT ON COLUMN public.profiles.ai_api_key IS 'API Key do provedor de IA (criptografado)';
COMMENT ON COLUMN public.profiles.ai_model IS 'Modelo de IA escolhido (ex: gpt-4, gemini-pro, etc)';

-- Índice para busca
CREATE INDEX IF NOT EXISTS idx_profiles_ai_provider ON public.profiles(ai_provider) WHERE ai_provider IS NOT NULL;






-- ============================================
-- Arquivo: 004_plans_and_limits.sql
-- ============================================


-- Atualizar perfis existentes com limites corretos
UPDATE public.profiles
SET max_connections = CASE
  WHEN plan = 'free' THEN 1
  WHEN plan = 'pro' THEN 2
  WHEN plan = 'super_pro' THEN 4
  ELSE 1
END
WHERE max_connections IS NULL OR max_connections = 1;

-- Função para obter limite de conexões do usuário
CREATE OR REPLACE FUNCTION get_user_connection_limit(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  user_limit INTEGER;
BEGIN
  SELECT max_connections INTO user_limit
  FROM public.profiles
  WHERE id = user_uuid;
  
  RETURN COALESCE(user_limit, 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para contar conexões ativas do usuário
CREATE OR REPLACE FUNCTION count_user_connections(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  conn_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO conn_count
  FROM public.connections
  WHERE user_id = user_uuid;
  
  RETURN COALESCE(conn_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View para verificar se usuário pode criar mais conexões
CREATE OR REPLACE VIEW user_connection_status AS
SELECT 
  p.id as user_id,
  p.plan,
  p.max_connections,
  COUNT(c.id) as current_connections,
  (p.max_connections - COUNT(c.id)) as remaining_connections,
  CASE 
    WHEN COUNT(c.id) < p.max_connections THEN true
    ELSE false
  END as can_create_connection
FROM public.profiles p
LEFT JOIN public.connections c ON c.user_id = p.id
GROUP BY p.id, p.plan, p.max_connections;






-- ============================================
-- Arquivo: 005_add_settings_to_profiles.sql
-- ============================================


-- Adicionar coluna settings à tabela profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{"darkTheme": true, "notifications": true, "sounds": true, "analytics": true}'::jsonb;

-- Comentário na coluna
COMMENT ON COLUMN profiles.settings IS 'Configurações do usuário (preferências, notificações, sons, analytics)';






-- ============================================
-- Arquivo: 005_fix_profiles_rls.sql
-- ============================================


-- ============================================
-- CORREÇÃO: Adicionar política RLS para INSERT em profiles
-- ============================================

-- Adicionar política para permitir que usuários criem seu próprio perfil
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);






-- ============================================
-- Arquivo: 006_admin_system.sql
-- ============================================


-- ============================================
-- SISTEMA DE ADMINISTRAÇÃO
-- ============================================

-- 1. Adicionar campo is_admin na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- 2. Adicionar campo is_blocked na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE;

-- 3. Criar tabela de configurações do sistema
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Criar tabela de planos (configurável pelo admin)
CREATE TABLE IF NOT EXISTS public.plans_config (
  id TEXT PRIMARY KEY, -- 'pro', 'super_pro'
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  checkout_url TEXT,
  max_connections INTEGER NOT NULL,
  features JSONB, -- Array de features
  active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Inserir planos padrão
INSERT INTO public.plans_config (id, name, description, price, checkout_url, max_connections, features, display_order)
VALUES 
  (
    'pro',
    'PRO',
    'Plano profissional com recursos essenciais',
    64.90,
    'https://pay.cakto.com.br/36f3bmf_641100',
    2,
    '["2 conexões WhatsApp", "Disparo ilimitado", "Suporte por email", "Relatórios básicos", "Agendamento de campanhas"]'::jsonb,
    1
  ),
  (
    'super_pro',
    'SUPER PRO',
    'Plano completo com todos os recursos',
    99.90,
    'https://pay.cakto.com.br/schmi6m_641106',
    4,
    '["4 conexões WhatsApp", "Disparo ilimitado", "Suporte prioritário", "Relatórios avançados", "Agendamento de campanhas", "API personalizada", "Webhooks"]'::jsonb,
    2
  )
ON CONFLICT (id) DO NOTHING;

-- 6. Inserir configurações padrão do sistema
INSERT INTO public.system_settings (key, value, description)
VALUES 
  (
    'support_email',
    '"inoovawebpro@gmail.com"'::jsonb,
    'Email de suporte'
  ),
  (
    'support_phone',
    '""'::jsonb,
    'Telefone de suporte'
  ),
  (
    'support_whatsapp',
    '""'::jsonb,
    'WhatsApp de suporte'
  ),
  (
    'company_name',
    '"Connect"'::jsonb,
    'Nome da empresa'
  ),
  (
    'company_url',
    '"https://connect.inoovaweb.com.br"'::jsonb,
    'URL da empresa'
  )
ON CONFLICT (key) DO NOTHING;

-- 7. Criar índices
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON public.profiles(is_admin);
CREATE INDEX IF NOT EXISTS idx_profiles_is_blocked ON public.profiles(is_blocked);
CREATE INDEX IF NOT EXISTS idx_plans_config_active ON public.plans_config(active);

-- 8. Criar função auxiliar para verificar admin (sem recursão)
CREATE OR REPLACE FUNCTION is_admin_user(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_is_admin BOOLEAN;
BEGIN
  -- Verificar diretamente na tabela sem usar políticas RLS
  SELECT COALESCE(is_admin, false) INTO user_is_admin
  FROM public.profiles
  WHERE id = user_id;
  
  RETURN COALESCE(user_is_admin, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Atualizar RLS para permitir admins verem todos os perfis (sem recursão)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id OR 
    is_admin_user(auth.uid())
  );

-- 10. Atualizar RLS para permitir admins atualizarem perfis (sem recursão)
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (
    auth.uid() = id OR 
    is_admin_user(auth.uid())
  );

-- 11. RLS para system_settings (apenas admins)
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage system settings" ON public.system_settings;
CREATE POLICY "Admins can manage system settings" ON public.system_settings
  FOR ALL USING (
    is_admin_user(auth.uid())
  );

-- 12. RLS para plans_config (todos podem ler, apenas admins podem editar)
ALTER TABLE public.plans_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can view plans" ON public.plans_config;
CREATE POLICY "Everyone can view plans" ON public.plans_config
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Admins can manage plans" ON public.plans_config;
CREATE POLICY "Admins can manage plans" ON public.plans_config
  FOR ALL USING (
    is_admin_user(auth.uid())
  );

-- 13. Função para verificar se usuário é admin (mantida para compatibilidade)
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN is_admin_user(user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. Tornar inoovawebpro@gmail.com super admin
UPDATE public.profiles
SET is_admin = TRUE
WHERE email = 'inoovawebpro@gmail.com';

-- 15. Comentários
COMMENT ON COLUMN public.profiles.is_admin IS 'Indica se o usuário é administrador do sistema';
COMMENT ON COLUMN public.profiles.is_blocked IS 'Indica se o usuário está bloqueado';
COMMENT ON TABLE public.system_settings IS 'Configurações gerais do sistema (email de suporte, telefone, etc)';
COMMENT ON TABLE public.plans_config IS 'Configuração dos planos (preços, descrições, links de checkout)';


-- ============================================
-- Arquivo: 007_fix_rls_recursion.sql
-- ============================================


-- ============================================
-- CORRIGIR RECURSÃO INFINITA NAS POLÍTICAS RLS
-- ============================================
-- Este SQL corrige o erro "infinite recursion detected in policy for relation 'profiles'"

-- 1. Remover políticas problemáticas
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- 2. Criar função auxiliar para verificar admin (sem recursão)
CREATE OR REPLACE FUNCTION is_admin_user(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_is_admin BOOLEAN;
BEGIN
  -- Verificar diretamente na tabela sem usar políticas RLS
  SELECT COALESCE(is_admin, false) INTO user_is_admin
  FROM public.profiles
  WHERE id = user_id;
  
  RETURN COALESCE(user_is_admin, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Criar políticas RLS corrigidas (sem recursão)
-- Política para usuários verem seu próprio perfil
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Política para admins verem todos os perfis (usando função SECURITY DEFINER)
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id OR 
    is_admin_user(auth.uid())
  );

-- Política para usuários atualizarem seu próprio perfil
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Política para admins atualizarem todos os perfis (usando função SECURITY DEFINER)
CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (
    auth.uid() = id OR 
    is_admin_user(auth.uid())
  );

-- 4. Comentários
COMMENT ON FUNCTION is_admin_user(UUID) IS 'Função auxiliar para verificar se usuário é admin sem causar recursão nas políticas RLS';





-- ============================================
-- Arquivo: 009_plano_teste.sql
-- ============================================


-- ============================================
-- PLANO DE TESTE - R$ 12,00
-- ============================================
-- Plano teste: 1 conexão, 20 disparos/dia, válido por 3 dias

-- Adicionar plano "teste" ao CHECK constraint
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_plan_check;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_plan_check 
CHECK (plan IN ('pro', 'super_pro', 'teste'));

-- Adicionar campos para controle do plano teste
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS daily_disparos_limit INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS daily_disparos_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_disparos_reset_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT NULL;

-- Atualizar função para incluir plano teste
CREATE OR REPLACE FUNCTION update_max_connections()
RETURNS TRIGGER AS $$
BEGIN
  CASE NEW.plan
    WHEN 'pro' THEN
      NEW.max_connections := 2;
      NEW.daily_disparos_limit := NULL; -- Ilimitado
    WHEN 'super_pro' THEN
      NEW.max_connections := 4;
      NEW.daily_disparos_limit := NULL; -- Ilimitado
    WHEN 'teste' THEN
      NEW.max_connections := 1;
      NEW.daily_disparos_limit := 20; -- 20 disparos por dia
      -- Se está criando um novo plano teste, definir expiração em 3 dias
      IF OLD.plan != 'teste' OR OLD.plan IS NULL THEN
        NEW.trial_ends_at := NOW() + INTERVAL '3 days';
        NEW.daily_disparos_count := 0;
        NEW.last_disparos_reset_date := CURRENT_DATE;
      END IF;
    ELSE
      NEW.max_connections := 2;
      NEW.daily_disparos_limit := NULL;
  END CASE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Função para resetar contador diário de disparos
CREATE OR REPLACE FUNCTION reset_daily_disparos_count()
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET 
    daily_disparos_count = 0,
    last_disparos_reset_date = CURRENT_DATE
  WHERE 
    plan = 'teste' 
    AND last_disparos_reset_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Função para verificar se usuário pode criar disparo (verificar limite diário)
CREATE OR REPLACE FUNCTION can_create_disparo(user_uuid UUID, recipients_count INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  user_plan TEXT;
  daily_limit INTEGER;
  current_count INTEGER;
  trial_expired BOOLEAN;
BEGIN
  SELECT plan, daily_disparos_limit, daily_disparos_count, 
         (trial_ends_at IS NOT NULL AND trial_ends_at < NOW())
  INTO user_plan, daily_limit, current_count, trial_expired
  FROM public.profiles
  WHERE id = user_uuid;

  -- Se plano teste expirou
  IF trial_expired THEN
    RETURN FALSE;
  END IF;

  -- Se não tem limite diário (planos pro/super_pro), permitir
  IF daily_limit IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Verificar se excedeu limite diário
  IF (current_count + recipients_count) > daily_limit THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para incrementar contador de disparos diários
CREATE OR REPLACE FUNCTION increment_daily_disparos(user_uuid UUID, count INTEGER)
RETURNS void AS $$
BEGIN
  -- Resetar contador se mudou o dia
  UPDATE public.profiles
  SET 
    daily_disparos_count = 0,
    last_disparos_reset_date = CURRENT_DATE
  WHERE 
    id = user_uuid 
    AND plan = 'teste'
    AND last_disparos_reset_date < CURRENT_DATE;

  -- Incrementar contador
  UPDATE public.profiles
  SET 
    daily_disparos_count = daily_disparos_count + count,
    updated_at = NOW()
  WHERE id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se plano teste expirou e desativar
CREATE OR REPLACE FUNCTION check_trial_expiration()
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET 
    subscription_status = 'canceled',
    subscription_ends_at = NOW()
  WHERE 
    plan = 'teste'
    AND trial_ends_at IS NOT NULL
    AND trial_ends_at < NOW()
    AND subscription_status = 'active';
END;
$$ LANGUAGE plpgsql;

-- Trigger para resetar contador diário automaticamente
CREATE OR REPLACE FUNCTION auto_reset_daily_disparos()
RETURNS TRIGGER AS $$
BEGIN
  -- Resetar contador se mudou o dia
  IF OLD.last_disparos_reset_date < CURRENT_DATE THEN
    NEW.daily_disparos_count := 0;
    NEW.last_disparos_reset_date := CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_reset_daily_disparos_trigger ON public.profiles;
CREATE TRIGGER auto_reset_daily_disparos_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (OLD.plan = 'teste' AND NEW.plan = 'teste')
  EXECUTE FUNCTION auto_reset_daily_disparos();

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_profiles_trial_ends_at ON public.profiles(trial_ends_at);
CREATE INDEX IF NOT EXISTS idx_profiles_plan_trial ON public.profiles(plan, trial_ends_at);

-- Comentários
COMMENT ON COLUMN public.profiles.daily_disparos_limit IS 'Limite diário de disparos (NULL = ilimitado)';
COMMENT ON COLUMN public.profiles.daily_disparos_count IS 'Contador de disparos no dia atual';
COMMENT ON COLUMN public.profiles.last_disparos_reset_date IS 'Data do último reset do contador diário';
COMMENT ON COLUMN public.profiles.trial_ends_at IS 'Data de expiração do plano teste (3 dias após ativação)';




-- ============================================
-- Arquivo: 010_delete_old_campaigns.sql
-- ============================================


-- ============================================
-- DELETAR CAMPANHAS ANTIGAS AUTOMATICAMENTE
-- ============================================
-- Este cron job deleta campanhas com mais de 5 dias automaticamente
-- Apenas campanhas concluídas, canceladas ou falhadas são deletadas
-- Executa diariamente às 2h da manhã

-- Criar cron job para deletar campanhas antigas
-- Remover job se já existir
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'delete-old-campaigns') THEN
    PERFORM cron.unschedule('delete-old-campaigns');
  END IF;
END $$;

-- Criar novo job usando cast explícito na função
-- NOTA: Se der erro de ambiguidade, execute este SQL manualmente depois da instalação
-- Veja o arquivo: INSTALAR_CRON_JOBS.sql

-- Comentado temporariamente para evitar erro de ambiguidade
-- Execute manualmente depois da instalação completa:
/*
SELECT cron.schedule(
  'delete-old-campaigns'::text,
  '0 2 * * *'::text,
  ('SELECT net.http_post(url := current_setting(''app.supabase_url'') || ''/functions/v1/delete-old-campaigns'', headers := jsonb_build_object(''Content-Type'', ''application/json'', ''Authorization'', ''Bearer '' || current_setting(''app.supabase_service_role_key'')), body := ''{}''::jsonb) AS request_id;')::text
);
*/

-- Comentário explicativo (comentado para evitar erro de ambiguidade)
-- COMMENT ON FUNCTION cron.schedule(text, text, text) IS 'Cron job para deletar campanhas antigas (mais de 5 dias) automaticamente';

-- Verificar se o cron job foi criado (comentado para evitar problemas)
-- Execute manualmente depois de instalar os cron jobs:
/*
SELECT 
  jobid,
  jobname,
  schedule,
  active,
  command
FROM cron.job 
WHERE jobname = 'delete-old-campaigns';
*/




-- ============================================
-- Arquivo: 011_billing_system.sql
-- ============================================


-- ============================================
-- SISTEMA DE COBRANÇA AUTOMÁTICA
-- ============================================

-- Tabela de cobranças
CREATE TABLE IF NOT EXISTS public.billings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES public.connections(id) ON DELETE CASCADE,
  
  -- Dados do cliente
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL, -- Número no formato internacional (ex: 5511999999999@s.whatsapp.net)
  
  -- Dados da cobrança
  description TEXT,
  amount DECIMAL(10, 2) NOT NULL,
  due_date DATE NOT NULL, -- Data de vencimento
  
  -- Mensagem de cobrança
  message_template TEXT, -- Template da mensagem (pode usar variáveis {{nome}}, {{valor}}, {{data}}, etc.)
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'paid', 'overdue', 'cancelled')),
  
  -- Controle de envio
  last_sent_at TIMESTAMPTZ, -- Última vez que a mensagem foi enviada
  sent_count INTEGER DEFAULT 0, -- Quantas vezes a mensagem foi enviada
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_billings_user_id ON public.billings(user_id);
CREATE INDEX IF NOT EXISTS idx_billings_connection_id ON public.billings(connection_id);
CREATE INDEX IF NOT EXISTS idx_billings_due_date ON public.billings(due_date) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_billings_status ON public.billings(status);
CREATE INDEX IF NOT EXISTS idx_billings_created_at ON public.billings(created_at);

-- RLS (Row Level Security)
ALTER TABLE public.billings ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view own billings" ON public.billings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own billings" ON public.billings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own billings" ON public.billings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own billings" ON public.billings
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER update_billings_updated_at 
  BEFORE UPDATE ON public.billings
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Função para verificar e disparar cobranças vencidas
CREATE OR REPLACE FUNCTION check_and_send_billings()
RETURNS void AS $$
DECLARE
  billing_record RECORD;
  message_text TEXT;
  formatted_date TEXT;
  formatted_amount TEXT;
BEGIN
  -- Buscar cobranças pendentes com vencimento hoje
  FOR billing_record IN 
    SELECT 
      b.*,
      c.api_instance_token,
      c.name as connection_name
    FROM public.billings b
    INNER JOIN public.connections c ON c.id = b.connection_id
    WHERE b.status = 'pending'
      AND b.due_date = CURRENT_DATE
      AND (b.last_sent_at IS NULL OR b.last_sent_at::date < CURRENT_DATE)
  LOOP
    -- Formatar data e valor
    formatted_date := TO_CHAR(billing_record.due_date, 'DD/MM/YYYY');
    formatted_amount := TO_CHAR(billing_record.amount, 'FM999G999G999D90', 'pt_BR');
    
    -- Substituir variáveis na mensagem
    message_text := COALESCE(billing_record.message_template, 
      'Olá {{nome}}! Você tem uma cobrança pendente de R$ {{valor}} com vencimento em {{data}}. Por favor, entre em contato para quitar.');
    
    message_text := REPLACE(message_text, '{{nome}}', billing_record.client_name);
    message_text := REPLACE(message_text, '{{valor}}', formatted_amount);
    message_text := REPLACE(message_text, '{{data}}', formatted_date);
    message_text := REPLACE(message_text, '{{descricao}}', COALESCE(billing_record.description, ''));
    
    -- Aqui seria feita a chamada para a API do WhatsApp
    -- Por enquanto, apenas atualizamos o status
    -- A lógica de envio será feita pela Edge Function
    
    -- Atualizar registro
    UPDATE public.billings
    SET 
      last_sent_at = NOW(),
      sent_count = sent_count + 1,
      status = CASE 
        WHEN due_date < CURRENT_DATE THEN 'overdue'
        ELSE 'pending'
      END,
      updated_at = NOW()
    WHERE id = billing_record.id;
    
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Criar job do pg_cron para executar diariamente às 08:00 (horário de Brasília = UTC-3)
-- Nota: pg_cron usa UTC, então 08:00 BRT = 11:00 UTC (considerando horário de verão pode variar)
-- Usar Edge Function para envio real das mensagens

-- Remover job se já existir
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-daily-billings') THEN
    PERFORM cron.unschedule('send-daily-billings');
  END IF;
END $$;

-- Criar novo job usando cast explícito na função
-- NOTA: Se der erro de ambiguidade, execute este SQL manualmente depois da instalação
-- Veja o arquivo: INSTALAR_CRON_JOBS.sql

-- Comentado temporariamente para evitar erro de ambiguidade
-- Execute manualmente depois da instalação completa:
/*
SELECT cron.schedule(
  'send-daily-billings'::text,
  '0 11 * * *'::text,
  ('SELECT net.http_post(url := current_setting(''app.supabase_url'') || ''/functions/v1/send-billings'', headers := jsonb_build_object(''Content-Type'', ''application/json'', ''Authorization'', ''Bearer '' || current_setting(''app.supabase_service_role_key'')), body := ''{}''::jsonb) AS request_id;')::text
);
*/


-- ============================================
-- Arquivo: 012_notifications_system.sql
-- ============================================


-- ============================================
-- SISTEMA DE NOTIFICAÇÕES
-- ============================================

-- Tabela de notificações
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Dados da notificação
  type TEXT NOT NULL CHECK (type IN ('success', 'warning', 'error', 'info')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  
  -- Status
  read BOOLEAN DEFAULT false,
  
  -- Referências opcionais
  reference_type TEXT, -- 'disparo', 'connection', 'billing', etc.
  reference_id UUID, -- ID do recurso relacionado
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(user_id, read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- RLS (Row Level Security)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Função para criar notificação quando campanha é concluída
CREATE OR REPLACE FUNCTION create_notification_on_campaign_completed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    INSERT INTO public.notifications (user_id, type, title, message, reference_type, reference_id)
    VALUES (
      NEW.user_id,
      'success',
      'Campanha concluída',
      'A campanha "' || NEW.campaign_name || '" foi finalizada com sucesso',
      'disparo',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para disparos
CREATE TRIGGER trigger_campaign_completed
  AFTER UPDATE ON public.disparos
  FOR EACH ROW
  EXECUTE FUNCTION create_notification_on_campaign_completed();

-- Função para criar notificação quando instância é conectada
CREATE OR REPLACE FUNCTION create_notification_on_connection_online()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'online' AND OLD.status != 'online' THEN
    INSERT INTO public.notifications (user_id, type, title, message, reference_type, reference_id)
    VALUES (
      NEW.user_id,
      'info',
      'Nova instância conectada',
      'A instância "' || NEW.name || '" foi conectada com sucesso',
      'connection',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para conexões
CREATE TRIGGER trigger_connection_online
  AFTER UPDATE ON public.connections
  FOR EACH ROW
  EXECUTE FUNCTION create_notification_on_connection_online();



-- ============================================
-- Arquivo: 013_improve_notifications.sql
-- ============================================


-- ============================================
-- MELHORIAS NO SISTEMA DE NOTIFICAÇÕES
-- ============================================
-- Adiciona notificações para todos os eventos importantes
-- ============================================

-- Função para criar notificação quando campanha é criada/iniciada
CREATE OR REPLACE FUNCTION create_notification_on_campaign_started()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'in_progress' AND (OLD.status IS NULL OR OLD.status != 'in_progress') THEN
    INSERT INTO public.notifications (user_id, type, title, message, reference_type, reference_id)
    VALUES (
      NEW.user_id,
      'info',
      '▶️ Campanha Iniciada',
      'A campanha "' || NEW.campaign_name || '" foi iniciada e está enviando mensagens.',
      'disparo',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para campanha iniciada
DROP TRIGGER IF EXISTS trigger_campaign_started ON public.disparos;
CREATE TRIGGER trigger_campaign_started
  AFTER INSERT OR UPDATE ON public.disparos
  FOR EACH ROW
  EXECUTE FUNCTION create_notification_on_campaign_started();

-- Função para criar notificação quando campanha é pausada
CREATE OR REPLACE FUNCTION create_notification_on_campaign_paused()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'paused' AND OLD.status != 'paused' THEN
    INSERT INTO public.notifications (user_id, type, title, message, reference_type, reference_id)
    VALUES (
      NEW.user_id,
      'warning',
      '⏸️ Campanha Pausada',
      'A campanha "' || NEW.campaign_name || '" foi pausada. Você pode retomar quando quiser.',
      'disparo',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para campanha pausada
DROP TRIGGER IF EXISTS trigger_campaign_paused ON public.disparos;
CREATE TRIGGER trigger_campaign_paused
  AFTER UPDATE ON public.disparos
  FOR EACH ROW
  EXECUTE FUNCTION create_notification_on_campaign_paused();

-- Função para criar notificação quando campanha é cancelada
CREATE OR REPLACE FUNCTION create_notification_on_campaign_cancelled()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    INSERT INTO public.notifications (user_id, type, title, message, reference_type, reference_id)
    VALUES (
      NEW.user_id,
      'warning',
      '⏹️ Campanha Cancelada',
      'A campanha "' || NEW.campaign_name || '" foi cancelada.',
      'disparo',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para campanha cancelada
DROP TRIGGER IF EXISTS trigger_campaign_cancelled ON public.disparos;
CREATE TRIGGER trigger_campaign_cancelled
  AFTER UPDATE ON public.disparos
  FOR EACH ROW
  EXECUTE FUNCTION create_notification_on_campaign_cancelled();

-- Função melhorada para criar notificação quando campanha é concluída
CREATE OR REPLACE FUNCTION create_notification_on_campaign_completed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    INSERT INTO public.notifications (user_id, type, title, message, reference_type, reference_id)
    VALUES (
      NEW.user_id,
      'success',
      '✅ Campanha Concluída',
      'A campanha "' || NEW.campaign_name || '" foi finalizada! ' || 
      COALESCE(NEW.sent_count::text, '0') || ' de ' || 
      COALESCE(NEW.total_recipients::text, '0') || ' mensagens enviadas com sucesso.',
      'disparo',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Atualizar trigger de campanha concluída
DROP TRIGGER IF EXISTS trigger_campaign_completed ON public.disparos;
CREATE TRIGGER trigger_campaign_completed
  AFTER UPDATE ON public.disparos
  FOR EACH ROW
  EXECUTE FUNCTION create_notification_on_campaign_completed();

-- Função para criar notificação quando campanha falha
CREATE OR REPLACE FUNCTION create_notification_on_campaign_failed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'failed' AND OLD.status != 'failed' THEN
    INSERT INTO public.notifications (user_id, type, title, message, reference_type, reference_id)
    VALUES (
      NEW.user_id,
      'error',
      '❌ Campanha Falhou',
      'A campanha "' || NEW.campaign_name || '" falhou. Verifique os detalhes.',
      'disparo',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para campanha falhada
DROP TRIGGER IF EXISTS trigger_campaign_failed ON public.disparos;
CREATE TRIGGER trigger_campaign_failed
  AFTER UPDATE ON public.disparos
  FOR EACH ROW
  EXECUTE FUNCTION create_notification_on_campaign_failed();

-- Função melhorada para criar notificação quando instância é conectada
CREATE OR REPLACE FUNCTION create_notification_on_connection_online()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'online' AND (OLD.status IS NULL OR OLD.status != 'online') THEN
    INSERT INTO public.notifications (user_id, type, title, message, reference_type, reference_id)
    VALUES (
      NEW.user_id,
      'success',
      '📱 Instância Conectada',
      'A instância "' || NEW.name || '" foi conectada com sucesso!',
      'connection',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Atualizar trigger de conexão online
DROP TRIGGER IF EXISTS trigger_connection_online ON public.connections;
CREATE TRIGGER trigger_connection_online
  AFTER INSERT OR UPDATE ON public.connections
  FOR EACH ROW
  EXECUTE FUNCTION create_notification_on_connection_online();

-- Função para criar notificação quando instância é desconectada
CREATE OR REPLACE FUNCTION create_notification_on_connection_offline()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('offline', 'disconnected') AND OLD.status = 'online' THEN
    INSERT INTO public.notifications (user_id, type, title, message, reference_type, reference_id)
    VALUES (
      NEW.user_id,
      'warning',
      '📱 Instância Desconectada',
      'A instância "' || NEW.name || '" foi desconectada.',
      'connection',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para instância desconectada
DROP TRIGGER IF EXISTS trigger_connection_offline ON public.connections;
CREATE TRIGGER trigger_connection_offline
  AFTER UPDATE ON public.connections
  FOR EACH ROW
  EXECUTE FUNCTION create_notification_on_connection_offline();

-- Função para criar notificação quando assinatura é ativada
CREATE OR REPLACE FUNCTION create_notification_on_subscription_activated()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.subscription_status = 'active' AND (OLD.subscription_status IS NULL OR OLD.subscription_status != 'active') THEN
    DECLARE
      plan_name TEXT;
    BEGIN
      plan_name := CASE 
        WHEN NEW.plan = 'teste' THEN 'Plano Teste'
        WHEN NEW.plan = 'pro' THEN 'PRO'
        WHEN NEW.plan = 'super_pro' THEN 'SUPER PRO'
        ELSE COALESCE(NEW.plan::text, 'Plano')
      END;
      
      INSERT INTO public.notifications (user_id, type, title, message, reference_type, reference_id)
      VALUES (
        NEW.id,
        'success',
        '🎉 Assinatura Ativada!',
        'Sua assinatura do plano ' || plan_name || ' foi ativada com sucesso!',
        'subscription',
        NULL
      );
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para assinatura ativada
DROP TRIGGER IF EXISTS trigger_subscription_activated ON public.profiles;
CREATE TRIGGER trigger_subscription_activated
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_notification_on_subscription_activated();

-- Função para criar notificação quando assinatura expira
CREATE OR REPLACE FUNCTION create_notification_on_subscription_expired()
RETURNS TRIGGER AS $$
BEGIN
  -- Verificar se a data de expiração passou
  IF NEW.subscription_ends_at IS NOT NULL AND 
     NEW.subscription_ends_at < NOW() AND 
     (OLD.subscription_ends_at IS NULL OR OLD.subscription_ends_at >= NOW()) THEN
    INSERT INTO public.notifications (user_id, type, title, message, reference_type, reference_id)
    VALUES (
      NEW.id,
      'warning',
      '⚠️ Assinatura Expirada',
      'Sua assinatura expirou. Renove para continuar usando o sistema.',
      'subscription',
      NULL
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para assinatura expirada
DROP TRIGGER IF EXISTS trigger_subscription_expired ON public.profiles;
CREATE TRIGGER trigger_subscription_expired
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_notification_on_subscription_expired();

-- ============================================
-- COMENTÁRIOS
-- ============================================
-- Este SQL adiciona triggers para criar notificações automaticamente quando:
-- 1. Campanha é criada/iniciada
-- 2. Campanha é pausada
-- 3. Campanha é cancelada
-- 4. Campanha é concluída
-- 5. Campanha falha
-- 6. Instância é conectada
-- 7. Instância é desconectada
-- 8. Assinatura é ativada
-- 9. Assinatura expira
-- ============================================





-- ============================================
-- Arquivo: 013_mercado_pago_integration.sql
-- ============================================


-- ============================================
-- INTEGRAÇÃO COM MERCADO PAGO
-- ============================================

-- Adicionar campo para API Key do Mercado Pago na tabela profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS mercado_pago_api_key TEXT;

-- Adicionar campo para armazenar dados do PIX gerado na tabela billings
ALTER TABLE public.billings
ADD COLUMN IF NOT EXISTS pix_qr_code TEXT,
ADD COLUMN IF NOT EXISTS pix_copy_paste TEXT,
ADD COLUMN IF NOT EXISTS pix_id TEXT; -- ID do pagamento no Mercado Pago

-- Comentário explicativo
COMMENT ON COLUMN public.profiles.mercado_pago_api_key IS 'API Key do Mercado Pago para gerar PIX automaticamente';
COMMENT ON COLUMN public.billings.pix_qr_code IS 'QR Code do PIX gerado (base64 ou URL)';
COMMENT ON COLUMN public.billings.pix_copy_paste IS 'Chave copia e cola do PIX';
COMMENT ON COLUMN public.billings.pix_id IS 'ID do pagamento no Mercado Pago';



-- ============================================
-- Arquivo: 014_multi_payment_providers.sql
-- ============================================


-- ============================================
-- SUPORTE A MÚLTIPLOS PROVEDORES DE PAGAMENTO
-- ============================================

-- Tabela para armazenar configurações de provedores de pagamento
CREATE TABLE IF NOT EXISTS public.payment_providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('mercado_pago', 'gerencianet', 'stripe', 'pagseguro')),
  api_key TEXT,
  api_secret TEXT, -- Para provedores que precisam de secret
  client_id TEXT, -- Para OAuth ou client credentials
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false, -- Provedor padrão do usuário
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Um usuário pode ter apenas um provedor ativo por tipo
  UNIQUE(user_id, provider)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_payment_providers_user_id ON public.payment_providers(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_providers_provider ON public.payment_providers(provider);
CREATE INDEX IF NOT EXISTS idx_payment_providers_active ON public.payment_providers(user_id, is_active) WHERE is_active = true;

-- RLS
ALTER TABLE public.payment_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payment providers" ON public.payment_providers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payment providers" ON public.payment_providers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own payment providers" ON public.payment_providers
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own payment providers" ON public.payment_providers
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER update_payment_providers_updated_at
  BEFORE UPDATE ON public.payment_providers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Atualizar tabela billings para suportar múltiplos provedores
ALTER TABLE public.billings
ADD COLUMN IF NOT EXISTS payment_provider TEXT CHECK (payment_provider IN ('mercado_pago', 'gerencianet', 'asaas', 'stripe', 'pagseguro')),
ADD COLUMN IF NOT EXISTS payment_provider_id TEXT; -- ID do pagamento no provedor

-- Comentários
COMMENT ON TABLE public.payment_providers IS 'Configurações de provedores de pagamento por usuário';
COMMENT ON COLUMN public.payment_providers.provider IS 'Tipo de provedor: mercado_pago, gerencianet, asaas, stripe, pagseguro';
COMMENT ON COLUMN public.payment_providers.is_default IS 'Se true, este é o provedor padrão usado para gerar PIX';
COMMENT ON COLUMN public.billings.payment_provider IS 'Qual provedor foi usado para gerar o PIX';
COMMENT ON COLUMN public.billings.payment_provider_id IS 'ID do pagamento no provedor (ex: payment_id do Mercado Pago)';

-- Migrar dados existentes do Mercado Pago
-- Se já existir mercado_pago_api_key no profiles, criar registro em payment_providers
INSERT INTO public.payment_providers (user_id, provider, api_key, is_active, is_default)
SELECT 
  id as user_id,
  'mercado_pago' as provider,
  mercado_pago_api_key as api_key,
  (mercado_pago_api_key IS NOT NULL) as is_active,
  true as is_default
FROM public.profiles
WHERE mercado_pago_api_key IS NOT NULL
ON CONFLICT (user_id, provider) DO NOTHING;



-- ============================================
-- Arquivo: 015_add_boleto_support.sql
-- ============================================


-- ============================================
-- SUPORTE A BOLETO BANCÁRIO
-- ============================================

-- Adicionar campos para boleto na tabela billings
ALTER TABLE public.billings
ADD COLUMN IF NOT EXISTS payment_type TEXT CHECK (payment_type IN ('pix', 'boleto')) DEFAULT 'pix',
ADD COLUMN IF NOT EXISTS boleto_url TEXT,
ADD COLUMN IF NOT EXISTS boleto_barcode TEXT,
ADD COLUMN IF NOT EXISTS boleto_pdf TEXT;

-- Comentários
COMMENT ON COLUMN public.billings.payment_type IS 'Tipo de pagamento: pix ou boleto';
COMMENT ON COLUMN public.billings.boleto_url IS 'URL do boleto para visualização';
COMMENT ON COLUMN public.billings.boleto_barcode IS 'Código de barras do boleto';
COMMENT ON COLUMN public.billings.boleto_pdf IS 'URL do PDF do boleto';

-- ============================================
-- Arquivo: 015_add_payment_type.sql
-- ============================================


-- ============================================
-- ADICIONAR TIPO DE PAGAMENTO (PIX OU BOLETO)
-- ============================================

-- Adicionar campo payment_type na tabela billings
ALTER TABLE public.billings
ADD COLUMN IF NOT EXISTS payment_type TEXT CHECK (payment_type IN ('pix', 'boleto')) DEFAULT 'pix';

-- Adicionar campos para dados do boleto
ALTER TABLE public.billings
ADD COLUMN IF NOT EXISTS boleto_url TEXT,
ADD COLUMN IF NOT EXISTS boleto_barcode TEXT,
ADD COLUMN IF NOT EXISTS boleto_pdf TEXT;

-- Comentários
COMMENT ON COLUMN public.billings.payment_type IS 'Tipo de pagamento: pix ou boleto';
COMMENT ON COLUMN public.billings.boleto_url IS 'URL do boleto para visualização';
COMMENT ON COLUMN public.billings.boleto_barcode IS 'Código de barras do boleto';
COMMENT ON COLUMN public.billings.boleto_pdf IS 'URL do PDF do boleto';


-- ============================================
-- Arquivo: 016_appointment_system.sql
-- ============================================


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



-- ============================================
-- Arquivo: 016_booking_system.sql
-- ============================================


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


-- ============================================
-- Arquivo: 017_professionals_and_schedule.sql
-- ============================================


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


-- ============================================
-- Arquivo: 017_syncpay_transactions.sql
-- ============================================


-- ============================================
-- TABELA: syncpay_transactions
-- Armazena transações do Sync Pay
-- ============================================

CREATE TABLE IF NOT EXISTS public.syncpay_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id TEXT REFERENCES public.plans_config(id),
  
  -- Dados da transação Sync Pay
  transaction_id TEXT UNIQUE NOT NULL,
  external_reference TEXT,
  
  -- Dados do pagamento
  amount DECIMAL(10, 2) NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'approved', 'completed', 'failed', 'cancelled', 'expired')),
  
  -- Dados do PIX
  qr_code TEXT,
  qr_code_base64 TEXT,
  copy_paste TEXT,
  
  -- Dados brutos
  raw_response JSONB,
  raw_webhook JSONB,
  
  -- Timestamps
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_syncpay_transactions_user_id ON public.syncpay_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_syncpay_transactions_plan_id ON public.syncpay_transactions(plan_id);
CREATE INDEX IF NOT EXISTS idx_syncpay_transactions_transaction_id ON public.syncpay_transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_syncpay_transactions_status ON public.syncpay_transactions(status);
CREATE INDEX IF NOT EXISTS idx_syncpay_transactions_external_reference ON public.syncpay_transactions(external_reference);
CREATE INDEX IF NOT EXISTS idx_syncpay_transactions_created_at ON public.syncpay_transactions(created_at);

-- RLS (Row Level Security)
ALTER TABLE public.syncpay_transactions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
DROP POLICY IF EXISTS "Users can view own transactions" ON public.syncpay_transactions;
CREATE POLICY "Users can view own transactions" ON public.syncpay_transactions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage all transactions" ON public.syncpay_transactions;
CREATE POLICY "Service role can manage all transactions" ON public.syncpay_transactions
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Função para atualizar updated_at (criar se não existir)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para updated_at
CREATE TRIGGER update_syncpay_transactions_updated_at 
  BEFORE UPDATE ON public.syncpay_transactions
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();


-- ============================================
-- Arquivo: 018_fix_professional_id_fk.sql
-- ============================================


-- ============================================
-- CORRIGIR FOREIGN KEY DO PROFESSIONAL_ID
-- ============================================

-- Remover a foreign key incorreta se existir
DO $$ 
BEGIN
  -- Verificar se a coluna existe e tem constraint
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name LIKE '%professional_id%' 
    AND table_name = 'appointments'
  ) THEN
    -- Remover constraint antiga
    ALTER TABLE public.appointments 
    DROP CONSTRAINT IF EXISTS appointments_professional_id_fkey;
  END IF;
END $$;

-- Adicionar a foreign key correta apontando para professionals
DO $$ 
BEGIN
  -- Verificar se a coluna existe
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'appointments' 
    AND column_name = 'professional_id'
  ) THEN
    -- Verificar se a tabela professionals existe
    IF EXISTS (
      SELECT 1 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'professionals'
    ) THEN
      -- Adicionar constraint correta
      ALTER TABLE public.appointments
      ADD CONSTRAINT appointments_professional_id_fkey 
      FOREIGN KEY (professional_id) 
      REFERENCES public.professionals(id) 
      ON DELETE SET NULL;
    END IF;
  END IF;
END $$;



-- ============================================
-- Arquivo: 018_push_subscriptions.sql
-- ============================================


-- ============================================
-- TABELA PARA PUSH NOTIFICATIONS
-- ============================================
-- Armazena subscriptions de Push Notifications dos usuários
-- ============================================

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Dados da subscription
  endpoint TEXT NOT NULL,
  keys JSONB NOT NULL, -- { p256dh: string, auth: string }
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint: um usuário pode ter múltiplas subscriptions (diferentes dispositivos)
  UNIQUE(user_id, endpoint)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON public.push_subscriptions(endpoint);

-- RLS (Row Level Security)
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can manage own push subscriptions" ON public.push_subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_push_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_push_subscriptions_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_push_subscriptions_updated_at();

-- Comentários
COMMENT ON TABLE public.push_subscriptions IS 'Armazena subscriptions de Push Notifications para notificar usuários mesmo com app fechado';
COMMENT ON COLUMN public.push_subscriptions.endpoint IS 'URL única da subscription do Push API';
COMMENT ON COLUMN public.push_subscriptions.keys IS 'Chaves de criptografia da subscription (p256dh e auth)';




-- ============================================
-- Arquivo: 019_appointment_schedule_config.sql
-- ============================================


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



-- ============================================
-- Arquivo: 019_push_on_campaign_completed.sql
-- ============================================


-- ============================================
-- ENVIAR PUSH NOTIFICATION QUANDO CAMPANHA FINALIZAR
-- ============================================
-- Atualiza o trigger de campanha concluída para enviar push notification
-- ============================================

-- Função para enviar push notification quando campanha é concluída
CREATE OR REPLACE FUNCTION send_push_on_campaign_completed()
RETURNS TRIGGER AS $$
DECLARE
  supabase_url TEXT;
  supabase_service_key TEXT;
  push_response JSONB;
BEGIN
  -- Só processar se status mudou para 'completed'
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    
    -- Buscar URL e Service Key do Supabase (via system_settings ou variáveis de ambiente)
    SELECT value->>'url' INTO supabase_url
    FROM system_settings
    WHERE key = 'supabase_url'
    LIMIT 1;
    
    -- Se não encontrar, usar valor padrão (será configurado via env vars na Edge Function)
    IF supabase_url IS NULL THEN
      supabase_url := 'https://your-project.supabase.co';
    END IF;
    
    -- Chamar Edge Function para enviar push notification
    -- Nota: A Edge Function vai buscar as subscriptions e enviar
    -- Usamos pg_net para fazer requisição HTTP
    BEGIN
      SELECT content INTO push_response
      FROM http_post(
        supabase_url || '/functions/v1/send-push-notification',
        jsonb_build_object(
          'userId', NEW.user_id::text,
          'title', '✅ Campanha Concluída',
          'body', 'A campanha "' || NEW.campaign_name || '" foi finalizada! ' || 
                  COALESCE(NEW.sent_count::text, '0') || ' de ' || 
                  COALESCE(NEW.total_recipients::text, '0') || ' mensagens enviadas.',
          'data', jsonb_build_object(
            'type', 'campaign_completed',
            'campaignId', NEW.id::text,
            'url', '/campanhas'
          ),
          'icon', '/favicon.ico',
          'tag', 'campaign_' || NEW.id::text
        )::text,
        'application/json'
      );
      
      -- Log do resultado (opcional)
      RAISE NOTICE 'Push notification enviada para campanha %: %', NEW.id, push_response;
    EXCEPTION WHEN OTHERS THEN
      -- Se falhar, apenas logar erro mas não impedir o trigger
      RAISE WARNING 'Erro ao enviar push notification: %', SQLERRM;
    END;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Atualizar trigger para também chamar função de push
-- Primeiro, vamos criar um novo trigger que chama ambas as funções
DROP TRIGGER IF EXISTS trigger_campaign_completed_push ON public.disparos;

-- Criar trigger que chama a função de push (a notificação no banco já é criada pelo trigger anterior)
CREATE TRIGGER trigger_campaign_completed_push
  AFTER UPDATE ON public.disparos
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
  EXECUTE FUNCTION send_push_on_campaign_completed();

-- Comentário
COMMENT ON FUNCTION send_push_on_campaign_completed() IS 'Envia push notification quando uma campanha é concluída';




-- ============================================
-- Arquivo: 020_appointment_message_templates.sql
-- ============================================


-- ============================================
-- TEMPLATES DE MENSAGENS DE NOTIFICAÇÃO
-- ============================================

-- Adicionar campos de templates de mensagens na tabela appointment_settings
ALTER TABLE public.appointment_settings
ADD COLUMN IF NOT EXISTS message_template_confirmed TEXT,
ADD COLUMN IF NOT EXISTS message_template_completed TEXT,
ADD COLUMN IF NOT EXISTS message_template_cancelled TEXT,
ADD COLUMN IF NOT EXISTS message_template_no_show TEXT,
ADD COLUMN IF NOT EXISTS message_template_professional_confirmed TEXT,
ADD COLUMN IF NOT EXISTS message_template_professional_completed TEXT,
ADD COLUMN IF NOT EXISTS message_template_professional_cancelled TEXT,
ADD COLUMN IF NOT EXISTS message_template_professional_no_show TEXT;

-- Valores padrão para mensagens de cliente
UPDATE public.appointment_settings
SET 
  message_template_confirmed = COALESCE(message_template_confirmed, '🔔 *Atualização do seu Agendamento*\n\n✅ Seu agendamento foi *confirmado*!\n\n📅 *Data:* {{date}}\n🕐 *Horário:* {{time}}\n💼 *Serviço:* {{service}}\n💰 *Valor Total:* {{amount}}\n\nEstamos ansiosos para atendê-lo! 🎯'),
  message_template_completed = COALESCE(message_template_completed, '🔔 *Atualização do seu Agendamento*\n\n✅ Seu agendamento foi *concluído*!\n\n📅 *Data:* {{date}}\n🕐 *Horário:* {{time}}\n💼 *Serviço:* {{service}}\n💰 *Valor Total:* {{amount}}\n\nObrigado por escolher nossos serviços! 🙏'),
  message_template_cancelled = COALESCE(message_template_cancelled, '🔔 *Atualização do seu Agendamento*\n\n❌ Seu agendamento foi *cancelado*.\n\n📅 *Data:* {{date}}\n🕐 *Horário:* {{time}}\n💼 *Serviço:* {{service}}\n💰 *Valor Total:* {{amount}}\n\nEntre em contato conosco se tiver dúvidas.'),
  message_template_no_show = COALESCE(message_template_no_show, '🔔 *Atualização do seu Agendamento*\n\n⚠️ Seu agendamento foi marcado como *não compareceu*.\n\n📅 *Data:* {{date}}\n🕐 *Horário:* {{time}}\n💼 *Serviço:* {{service}}\n💰 *Valor Total:* {{amount}}\n\nEntre em contato conosco se tiver dúvidas.')
WHERE message_template_confirmed IS NULL OR message_template_completed IS NULL OR message_template_cancelled IS NULL OR message_template_no_show IS NULL;

-- Valores padrão para mensagens de profissional
UPDATE public.appointment_settings
SET 
  message_template_professional_confirmed = COALESCE(message_template_professional_confirmed, '🔔 *Atualização de Agendamento*\n\n✅ Agendamento *confirmado*:\n\n👤 *Cliente:* {{client_name}}\n📞 *Telefone:* {{client_phone}}\n📅 *Data:* {{date}}\n🕐 *Horário:* {{time}}\n💼 *Serviço:* {{service}}\n💰 *Valor Total:* {{amount}}\n\nPrepare-se para o atendimento! 🎯'),
  message_template_professional_completed = COALESCE(message_template_professional_completed, '🔔 *Atualização de Agendamento*\n\n✅ Agendamento *concluído*:\n\n👤 *Cliente:* {{client_name}}\n📞 *Telefone:* {{client_phone}}\n📅 *Data:* {{date}}\n🕐 *Horário:* {{time}}\n💼 *Serviço:* {{service}}\n💰 *Valor Total:* {{amount}}\n\nAtendimento finalizado com sucesso! ✅'),
  message_template_professional_cancelled = COALESCE(message_template_professional_cancelled, '🔔 *Atualização de Agendamento*\n\n❌ Agendamento *cancelado*:\n\n👤 *Cliente:* {{client_name}}\n📞 *Telefone:* {{client_phone}}\n📅 *Data:* {{date}}\n🕐 *Horário:* {{time}}\n💼 *Serviço:* {{service}}\n💰 *Valor Total:* {{amount}}'),
  message_template_professional_no_show = COALESCE(message_template_professional_no_show, '🔔 *Atualização de Agendamento*\n\n⚠️ Cliente *não compareceu*:\n\n👤 *Cliente:* {{client_name}}\n📞 *Telefone:* {{client_phone}}\n📅 *Data:* {{date}}\n🕐 *Horário:* {{time}}\n💼 *Serviço:* {{service}}\n💰 *Valor Total:* {{amount}}')
WHERE message_template_professional_confirmed IS NULL OR message_template_professional_completed IS NULL OR message_template_professional_cancelled IS NULL OR message_template_professional_no_show IS NULL;



-- ============================================
-- Arquivo: 020_chatbot_flows.sql
-- ============================================


-- ============================================
-- SISTEMA DE CHATBOT FLOWS (Tipo Typebot)
-- ============================================
-- Sistema para criar fluxos de conversa automatizados
-- ============================================

-- Tabela de fluxos
CREATE TABLE IF NOT EXISTS public.chatbot_flows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES public.connections(id) ON DELETE SET NULL,
  
  -- Dados do fluxo
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT false,
  
  -- Trigger (como o fluxo é ativado)
  trigger_type TEXT NOT NULL DEFAULT 'campaign_response' CHECK (trigger_type IN (
    'campaign_response', -- Resposta a uma campanha
    'keyword', -- Palavra-chave específica
    'first_message', -- Primeira mensagem do contato
    'time_based', -- Baseado em horário
    'manual' -- Ativação manual
  )),
  trigger_campaign_id UUID REFERENCES public.disparos(id) ON DELETE SET NULL,
  trigger_keywords TEXT[], -- Palavras-chave que ativam o fluxo
  trigger_schedule JSONB, -- Horários específicos (ex: {"days": [1,2,3], "start": "09:00", "end": "18:00"})
  
  -- Estrutura do fluxo (JSON com nós e conexões)
  flow_data JSONB NOT NULL DEFAULT '{"nodes": [], "edges": []}'::jsonb,
  
  -- Configurações
  settings JSONB DEFAULT '{
    "timeout": 300,
    "max_conversations": 100,
    "greeting_message": null,
    "fallback_message": "Desculpe, não entendi. Pode repetir?",
    "transfer_to_human_keyword": "atendente"
  }'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_trigger CHECK (
    (trigger_type = 'campaign_response' AND trigger_campaign_id IS NOT NULL) OR
    (trigger_type = 'keyword' AND trigger_keywords IS NOT NULL AND array_length(trigger_keywords, 1) > 0) OR
    (trigger_type IN ('first_message', 'time_based', 'manual'))
  )
);

-- Tabela de conversas ativas
CREATE TABLE IF NOT EXISTS public.chatbot_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flow_id UUID NOT NULL REFERENCES public.chatbot_flows(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES public.connections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Dados do contato
  contact_phone TEXT NOT NULL,
  contact_name TEXT,
  
  -- Estado da conversa
  current_node_id TEXT, -- ID do nó atual no fluxo
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned', 'transferred')),
  
  -- Variáveis da conversa (nome, email, etc)
  variables JSONB DEFAULT '{}'::jsonb,
  
  -- Histórico de nós visitados
  visited_nodes TEXT[] DEFAULT '{}',
  
  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_interaction_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Tabela de mensagens do chatbot
CREATE TABLE IF NOT EXISTS public.chatbot_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.chatbot_conversations(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES public.connections(id) ON DELETE CASCADE,
  
  -- Dados da mensagem
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_text TEXT,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'audio', 'document', 'button', 'list')),
  media_url TEXT,
  
  -- Nó que gerou/envio a mensagem
  node_id TEXT,
  node_type TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_chatbot_flows_user_id ON public.chatbot_flows(user_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_flows_connection_id ON public.chatbot_flows(connection_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_flows_trigger_campaign ON public.chatbot_flows(trigger_campaign_id) WHERE trigger_type = 'campaign_response';
CREATE INDEX IF NOT EXISTS idx_chatbot_flows_active ON public.chatbot_flows(user_id, is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_flow_id ON public.chatbot_conversations(flow_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_connection ON public.chatbot_conversations(connection_id, contact_phone);
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_active ON public.chatbot_conversations(flow_id, contact_phone, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_user_id ON public.chatbot_conversations(user_id);

CREATE INDEX IF NOT EXISTS idx_chatbot_messages_conversation ON public.chatbot_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_messages_connection ON public.chatbot_messages(connection_id, created_at);

-- Índice único parcial: uma conversa ativa por contato+fluxo+instância
CREATE UNIQUE INDEX IF NOT EXISTS idx_chatbot_conversations_active_unique 
  ON public.chatbot_conversations(flow_id, contact_phone, connection_id) 
  WHERE status = 'active';

-- RLS (Row Level Security)
ALTER TABLE public.chatbot_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_messages ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para chatbot_flows
DROP POLICY IF EXISTS "Users can view own flows" ON public.chatbot_flows;
CREATE POLICY "Users can view own flows" ON public.chatbot_flows
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own flows" ON public.chatbot_flows;
CREATE POLICY "Users can create own flows" ON public.chatbot_flows
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own flows" ON public.chatbot_flows;
CREATE POLICY "Users can update own flows" ON public.chatbot_flows
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own flows" ON public.chatbot_flows;
CREATE POLICY "Users can delete own flows" ON public.chatbot_flows
  FOR DELETE USING (auth.uid() = user_id);

-- Políticas RLS para chatbot_conversations
CREATE POLICY "Users can view own conversations" ON public.chatbot_conversations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own conversations" ON public.chatbot_conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations" ON public.chatbot_conversations
  FOR UPDATE USING (auth.uid() = user_id);

-- Políticas RLS para chatbot_messages
CREATE POLICY "Users can view own messages" ON public.chatbot_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.chatbot_conversations cc
      WHERE cc.id = chatbot_messages.conversation_id
      AND cc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own messages" ON public.chatbot_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chatbot_conversations cc
      WHERE cc.id = chatbot_messages.conversation_id
      AND cc.user_id = auth.uid()
    )
  );

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_chatbot_flows_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_chatbot_flows_updated_at
  BEFORE UPDATE ON public.chatbot_flows
  FOR EACH ROW
  EXECUTE FUNCTION update_chatbot_flows_updated_at();

-- Trigger para atualizar last_interaction_at
CREATE OR REPLACE FUNCTION update_chatbot_conversations_interaction()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_interaction_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_chatbot_conversations_interaction
  BEFORE UPDATE ON public.chatbot_conversations
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status OR OLD.current_node_id IS DISTINCT FROM NEW.current_node_id)
  EXECUTE FUNCTION update_chatbot_conversations_interaction();

-- Comentários
COMMENT ON TABLE public.chatbot_flows IS 'Fluxos de conversa automatizados (tipo Typebot)';
COMMENT ON TABLE public.chatbot_conversations IS 'Conversas ativas do chatbot';
COMMENT ON TABLE public.chatbot_messages IS 'Histórico de mensagens das conversas do chatbot';

COMMENT ON COLUMN public.chatbot_flows.flow_data IS 'Estrutura do fluxo em JSON: {nodes: [], edges: []}';
COMMENT ON COLUMN public.chatbot_flows.trigger_type IS 'Tipo de trigger: campaign_response, keyword, first_message, time_based, manual';
COMMENT ON COLUMN public.chatbot_conversations.variables IS 'Variáveis da conversa (nome, email, etc) em JSON';
COMMENT ON COLUMN public.chatbot_conversations.current_node_id IS 'ID do nó atual no fluxo sendo executado';


-- ============================================
-- Arquivo: 021_appointment_default_connection.sql
-- ============================================


-- Criar tabela appointment_settings se não existir
CREATE TABLE IF NOT EXISTS public.appointment_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  default_connection_id UUID REFERENCES public.connections(id) ON DELETE SET NULL,
  message_template_confirmed TEXT,
  message_template_completed TEXT,
  message_template_cancelled TEXT,
  message_template_no_show TEXT,
  message_template_professional_confirmed TEXT,
  message_template_professional_completed TEXT,
  message_template_professional_cancelled TEXT,
  message_template_professional_no_show TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id)
);

-- Adicionar campo para instância padrão do WhatsApp se a tabela já existir mas a coluna não
ALTER TABLE public.appointment_settings
ADD COLUMN IF NOT EXISTS default_connection_id UUID REFERENCES public.connections(id) ON DELETE SET NULL;

-- Habilitar RLS
ALTER TABLE public.appointment_settings ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (DROP IF EXISTS para evitar erro se já existir)
DROP POLICY IF EXISTS "Users can view own appointment settings" ON public.appointment_settings;
DROP POLICY IF EXISTS "Users can insert own appointment settings" ON public.appointment_settings;
DROP POLICY IF EXISTS "Users can update own appointment settings" ON public.appointment_settings;

CREATE POLICY "Users can view own appointment settings" ON public.appointment_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own appointment settings" ON public.appointment_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own appointment settings" ON public.appointment_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_appointment_settings_updated_at ON public.appointment_settings;
CREATE TRIGGER update_appointment_settings_updated_at
  BEFORE UPDATE ON public.appointment_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comentários
COMMENT ON TABLE public.appointment_settings IS 'Configurações de agendamento por usuário, incluindo templates de mensagens e instância padrão do WhatsApp';
COMMENT ON COLUMN public.appointment_settings.default_connection_id IS 'ID da instância do WhatsApp que será usada por padrão para enviar notificações de agendamento. Se NULL, usa a primeira instância online disponível.';


-- ============================================
-- Arquivo: 022_reseller_system.sql
-- ============================================


-- Sistema de Revenda (Resellers)
-- Permite cadastrar vendedores e rastrear usuários ativados por cada um

-- Tabela de Vendedores (Resellers)
CREATE TABLE IF NOT EXISTS public.resellers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  commission_percentage DECIMAL(5,2) DEFAULT 0.00, -- Porcentagem de comissão (ex: 10.00 = 10%)
  referral_code TEXT NOT NULL UNIQUE, -- Código único de referência
  referral_link TEXT, -- Link de referência completo
  active BOOLEAN DEFAULT true,
  total_users_activated INTEGER DEFAULT 0, -- Contador de usuários ativados
  total_revenue DECIMAL(10,2) DEFAULT 0.00, -- Receita total gerada
  notes TEXT, -- Notas sobre o vendedor
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adicionar campo reseller_id na tabela profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS reseller_id UUID REFERENCES public.resellers(id) ON DELETE SET NULL;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_profiles_reseller_id ON public.profiles(reseller_id);
CREATE INDEX IF NOT EXISTS idx_resellers_referral_code ON public.resellers(referral_code);
CREATE INDEX IF NOT EXISTS idx_resellers_active ON public.resellers(active);

-- Habilitar RLS
ALTER TABLE public.resellers ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para resellers
-- Apenas admins podem ver e gerenciar vendedores
DROP POLICY IF EXISTS "Admins can view all resellers" ON public.resellers;
DROP POLICY IF EXISTS "Admins can insert resellers" ON public.resellers;
DROP POLICY IF EXISTS "Admins can update resellers" ON public.resellers;
DROP POLICY IF EXISTS "Admins can delete resellers" ON public.resellers;

CREATE POLICY "Admins can view all resellers" ON public.resellers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND is_admin = true
    )
  );

CREATE POLICY "Admins can insert resellers" ON public.resellers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND is_admin = true
    )
  );

CREATE POLICY "Admins can update resellers" ON public.resellers
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND is_admin = true
    )
  );

CREATE POLICY "Admins can delete resellers" ON public.resellers
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND is_admin = true
    )
  );

-- Função para gerar código de referência único
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    -- Gera código aleatório de 8 caracteres (letras e números)
    -- Usa substring do hash MD5 para garantir unicidade
    code := upper(
      substring(
        md5(random()::text || clock_timestamp()::text || random()::text)
        from 1 for 8
      )
    );
    
    -- Verifica se já existe
    SELECT EXISTS(SELECT 1 FROM public.resellers WHERE referral_code = code) INTO exists_check;
    
    -- Se não existe, retorna
    EXIT WHEN NOT exists_check;
  END LOOP;
  
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Função para atualizar contadores de vendedor
CREATE OR REPLACE FUNCTION update_reseller_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualizar total de usuários ativados
  IF NEW.reseller_id IS NOT NULL AND (OLD.reseller_id IS NULL OR OLD.reseller_id != NEW.reseller_id) THEN
    UPDATE public.resellers
    SET 
      total_users_activated = (
        SELECT COUNT(*) 
        FROM public.profiles 
        WHERE reseller_id = NEW.reseller_id
        AND subscription_status = 'active'
      ),
      updated_at = NOW()
    WHERE id = NEW.reseller_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar estatísticas quando usuário é ativado
DROP TRIGGER IF EXISTS update_reseller_stats_trigger ON public.profiles;
CREATE TRIGGER update_reseller_stats_trigger
  AFTER UPDATE OF subscription_status ON public.profiles
  FOR EACH ROW
  WHEN (NEW.subscription_status = 'active' AND (OLD.subscription_status IS NULL OR OLD.subscription_status != 'active'))
  EXECUTE FUNCTION update_reseller_stats();

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_resellers_updated_at ON public.resellers;
CREATE TRIGGER update_resellers_updated_at
  BEFORE UPDATE ON public.resellers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comentários
COMMENT ON TABLE public.resellers IS 'Tabela de vendedores/revendedores do sistema';
COMMENT ON COLUMN public.resellers.referral_code IS 'Código único de referência usado para rastrear usuários';
COMMENT ON COLUMN public.resellers.referral_link IS 'Link completo de referência (ex: https://app.com/register?ref=CODE)';
COMMENT ON COLUMN public.resellers.commission_percentage IS 'Porcentagem de comissão que o vendedor recebe';
COMMENT ON COLUMN public.resellers.total_users_activated IS 'Total de usuários ativados (com assinatura ativa) trazidos por este vendedor';
COMMENT ON COLUMN public.resellers.total_revenue IS 'Receita total gerada pelos usuários deste vendedor';

-- View para estatísticas de vendedores
CREATE OR REPLACE VIEW reseller_stats AS
SELECT 
  r.id,
  r.name,
  r.email,
  r.referral_code,
  r.active,
  r.commission_percentage,
  COUNT(DISTINCT p.id) as total_users,
  COUNT(DISTINCT CASE WHEN p.subscription_status = 'active' THEN p.id END) as active_users,
  COUNT(DISTINCT CASE WHEN p.subscription_status = 'active' AND p.plan = 'pro' THEN p.id END) as pro_users,
  COUNT(DISTINCT CASE WHEN p.subscription_status = 'active' AND p.plan = 'super_pro' THEN p.id END) as super_pro_users,
  -- Calcular receita total baseada nos planos ativos
  COALESCE(SUM(CASE WHEN p.subscription_status = 'active' THEN 
    CASE 
      WHEN p.plan = 'pro' THEN 64.90
      WHEN p.plan = 'super_pro' THEN 99.90
      WHEN p.plan = 'teste' THEN 12.00
      ELSE 0
    END
  END), 0) as total_revenue,
  r.created_at,
  r.updated_at
FROM public.resellers r
LEFT JOIN public.profiles p ON p.reseller_id = r.id
GROUP BY r.id, r.name, r.email, r.referral_code, r.active, r.commission_percentage, r.created_at, r.updated_at;

COMMENT ON VIEW reseller_stats IS 'Estatísticas agregadas de cada vendedor';

-- Habilitar RLS na view (herda das tabelas base)
-- A view usa as políticas das tabelas resellers e profiles


-- ============================================
-- Arquivo: CRON_CHECK_SUBSCRIPTIONS.sql
-- ============================================


-- ============================================
-- CRON JOB: Verificar Assinaturas Expiradas
-- ============================================

-- Cron job para verificar assinaturas expiradas diariamente
-- Remover job se já existir
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'check-expired-subscriptions') THEN
    PERFORM cron.unschedule('check-expired-subscriptions');
  END IF;
END $$;

-- Criar novo job usando cast explícito na função
-- NOTA: Se der erro de ambiguidade, execute este SQL manualmente depois da instalação
-- Veja o arquivo: INSTALAR_CRON_JOBS.sql

-- Comentado temporariamente para evitar erro de ambiguidade
-- Execute manualmente depois da instalação completa:
/*
SELECT cron.schedule(
  'check-expired-subscriptions'::text,
  '0 0 * * *'::text,
  ('SELECT net.http_post(url := current_setting(''app.supabase_url'') || ''/functions/v1/check-expired-subscriptions'', headers := jsonb_build_object(''Content-Type'', ''application/json'', ''Authorization'', ''Bearer '' || current_setting(''app.supabase_service_role_key'')), body := ''{}''::jsonb) AS request_id;')::text
);
*/






-- ============================================
-- VERIFICACAO FINAL
-- ============================================

DO $$
DECLARE
    table_count INTEGER;
    function_count INTEGER;
    policy_count INTEGER;
BEGIN
    -- Contar tabelas
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE';
    
    -- Contar funcoes
    SELECT COUNT(*) INTO function_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public';
    
    -- Contar politicas RLS
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public';
    
    RAISE NOTICE '------------------------------------------------------------';
    RAISE NOTICE 'INSTALACAO CONCLUIDA!';
    RAISE NOTICE '------------------------------------------------------------';
    RAISE NOTICE 'RESUMO:';
    RAISE NOTICE '   - Tabelas criadas: %', table_count;
    RAISE NOTICE '   - Funcoes criadas: %', function_count;
    RAISE NOTICE '   - Politicas RLS: %', policy_count;
    RAISE NOTICE '------------------------------------------------------------';
    RAISE NOTICE 'Banco de dados pronto para uso!';
    RAISE NOTICE '------------------------------------------------------------';
END $$;

-- FIM DA INSTALACAO

