-- ============================================
-- SISTEMA DE ADMINISTRAÇÃO
-- ============================================

-- 1. Adicionar campo is_admin na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- 2. Adicionar campo is_blocked na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE;

-- 3. Criar tabela de configurações do sistema
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Criar tabela de planos (configurável pelo admin)
CREATE TABLE IF NOT EXISTS public.plans_config (
  id TEXT PRIMARY KEY, -- 'pro', 'super_pro'
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  checkout_url TEXT,
  max_connections INTEGER NOT NULL,
  features JSONB, -- Array de features
  active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Inserir planos padrão
INSERT INTO public.plans_config (id, name, description, price, checkout_url, max_connections, features, display_order)
VALUES 
  (
    'pro',
    'PRO',
    'Plano profissional com recursos essenciais',
    64.90,
    'https://pay.cakto.com.br/36f3bmf_641100',
    2,
    '["2 conexões WhatsApp", "Disparo ilimitado", "Suporte por email", "Relatórios básicos", "Agendamento de campanhas"]'::jsonb,
    1
  ),
  (
    'super_pro',
    'SUPER PRO',
    'Plano completo com todos os recursos',
    99.90,
    'https://pay.cakto.com.br/schmi6m_641106',
    4,
    '["4 conexões WhatsApp", "Disparo ilimitado", "Suporte prioritário", "Relatórios avançados", "Agendamento de campanhas", "API personalizada", "Webhooks"]'::jsonb,
    2
  )
ON CONFLICT (id) DO NOTHING;

-- 6. Inserir configurações padrão do sistema
INSERT INTO public.system_settings (key, value, description)
VALUES 
  (
    'support_email',
    '"inoovawebpro@gmail.com"'::jsonb,
    'Email de suporte'
  ),
  (
    'support_phone',
    '""'::jsonb,
    'Telefone de suporte'
  ),
  (
    'support_whatsapp',
    '""'::jsonb,
    'WhatsApp de suporte'
  ),
  (
    'company_name',
    '"Connect"'::jsonb,
    'Nome da empresa'
  ),
  (
    'company_url',
    '"https://connect.inoovaweb.com.br"'::jsonb,
    'URL da empresa'
  )
ON CONFLICT (key) DO NOTHING;

-- 7. Criar índices
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON public.profiles(is_admin);
CREATE INDEX IF NOT EXISTS idx_profiles_is_blocked ON public.profiles(is_blocked);
CREATE INDEX IF NOT EXISTS idx_plans_config_active ON public.plans_config(active);

-- 8. Criar função auxiliar para verificar admin (sem recursão)
CREATE OR REPLACE FUNCTION is_admin_user(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_is_admin BOOLEAN;
BEGIN
  -- Verificar diretamente na tabela sem usar políticas RLS
  SELECT COALESCE(is_admin, false) INTO user_is_admin
  FROM public.profiles
  WHERE id = user_id;
  
  RETURN COALESCE(user_is_admin, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Atualizar RLS para permitir admins verem todos os perfis (sem recursão)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id OR 
    is_admin_user(auth.uid())
  );

-- 10. Atualizar RLS para permitir admins atualizarem perfis (sem recursão)
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (
    auth.uid() = id OR 
    is_admin_user(auth.uid())
  );

-- 11. RLS para system_settings (apenas admins)
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage system settings" ON public.system_settings;
CREATE POLICY "Admins can manage system settings" ON public.system_settings
  FOR ALL USING (
    is_admin_user(auth.uid())
  );

-- 12. RLS para plans_config (todos podem ler, apenas admins podem editar)
ALTER TABLE public.plans_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can view plans" ON public.plans_config;
CREATE POLICY "Everyone can view plans" ON public.plans_config
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Admins can manage plans" ON public.plans_config;
CREATE POLICY "Admins can manage plans" ON public.plans_config
  FOR ALL USING (
    is_admin_user(auth.uid())
  );

-- 13. Função para verificar se usuário é admin (mantida para compatibilidade)
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN is_admin_user(user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. Tornar inoovawebpro@gmail.com super admin
UPDATE public.profiles
SET is_admin = TRUE
WHERE email = 'inoovawebpro@gmail.com';

-- 15. Comentários
COMMENT ON COLUMN public.profiles.is_admin IS 'Indica se o usuário é administrador do sistema';
COMMENT ON COLUMN public.profiles.is_blocked IS 'Indica se o usuário está bloqueado';
COMMENT ON TABLE public.system_settings IS 'Configurações gerais do sistema (email de suporte, telefone, etc)';
COMMENT ON TABLE public.plans_config IS 'Configuração dos planos (preços, descrições, links de checkout)';

