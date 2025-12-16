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





