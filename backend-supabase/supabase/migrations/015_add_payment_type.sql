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

