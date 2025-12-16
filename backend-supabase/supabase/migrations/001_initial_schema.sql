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


