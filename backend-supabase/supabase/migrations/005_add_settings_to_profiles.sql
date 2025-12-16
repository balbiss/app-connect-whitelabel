-- Adicionar coluna settings à tabela profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{"darkTheme": true, "notifications": true, "sounds": true, "analytics": true}'::jsonb;

-- Comentário na coluna
COMMENT ON COLUMN profiles.settings IS 'Configurações do usuário (preferências, notificações, sons, analytics)';





