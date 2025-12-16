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





