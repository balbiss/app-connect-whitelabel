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





