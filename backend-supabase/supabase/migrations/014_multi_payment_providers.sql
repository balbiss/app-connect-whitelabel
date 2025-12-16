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


