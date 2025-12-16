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

