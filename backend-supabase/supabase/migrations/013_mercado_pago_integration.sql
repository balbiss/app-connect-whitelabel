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


