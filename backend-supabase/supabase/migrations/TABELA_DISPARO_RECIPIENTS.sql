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





