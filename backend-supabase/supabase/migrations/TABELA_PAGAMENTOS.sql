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





