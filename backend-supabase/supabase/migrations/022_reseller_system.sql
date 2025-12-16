-- Sistema de Revenda (Resellers)
-- Permite cadastrar vendedores e rastrear usuários ativados por cada um

-- Tabela de Vendedores (Resellers)
CREATE TABLE IF NOT EXISTS public.resellers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  commission_percentage DECIMAL(5,2) DEFAULT 0.00, -- Porcentagem de comissão (ex: 10.00 = 10%)
  referral_code TEXT NOT NULL UNIQUE, -- Código único de referência
  referral_link TEXT, -- Link de referência completo
  active BOOLEAN DEFAULT true,
  total_users_activated INTEGER DEFAULT 0, -- Contador de usuários ativados
  total_revenue DECIMAL(10,2) DEFAULT 0.00, -- Receita total gerada
  notes TEXT, -- Notas sobre o vendedor
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adicionar campo reseller_id na tabela profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS reseller_id UUID REFERENCES public.resellers(id) ON DELETE SET NULL;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_profiles_reseller_id ON public.profiles(reseller_id);
CREATE INDEX IF NOT EXISTS idx_resellers_referral_code ON public.resellers(referral_code);
CREATE INDEX IF NOT EXISTS idx_resellers_active ON public.resellers(active);

-- Habilitar RLS
ALTER TABLE public.resellers ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para resellers
-- Apenas admins podem ver e gerenciar vendedores
DROP POLICY IF EXISTS "Admins can view all resellers" ON public.resellers;
DROP POLICY IF EXISTS "Admins can insert resellers" ON public.resellers;
DROP POLICY IF EXISTS "Admins can update resellers" ON public.resellers;
DROP POLICY IF EXISTS "Admins can delete resellers" ON public.resellers;

CREATE POLICY "Admins can view all resellers" ON public.resellers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND is_admin = true
    )
  );

CREATE POLICY "Admins can insert resellers" ON public.resellers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND is_admin = true
    )
  );

CREATE POLICY "Admins can update resellers" ON public.resellers
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND is_admin = true
    )
  );

CREATE POLICY "Admins can delete resellers" ON public.resellers
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND is_admin = true
    )
  );

-- Função para gerar código de referência único
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    -- Gera código aleatório de 8 caracteres (letras e números)
    -- Usa substring do hash MD5 para garantir unicidade
    code := upper(
      substring(
        md5(random()::text || clock_timestamp()::text || random()::text)
        from 1 for 8
      )
    );
    
    -- Verifica se já existe
    SELECT EXISTS(SELECT 1 FROM public.resellers WHERE referral_code = code) INTO exists_check;
    
    -- Se não existe, retorna
    EXIT WHEN NOT exists_check;
  END LOOP;
  
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Função para atualizar contadores de vendedor
CREATE OR REPLACE FUNCTION update_reseller_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualizar total de usuários ativados
  IF NEW.reseller_id IS NOT NULL AND (OLD.reseller_id IS NULL OR OLD.reseller_id != NEW.reseller_id) THEN
    UPDATE public.resellers
    SET 
      total_users_activated = (
        SELECT COUNT(*) 
        FROM public.profiles 
        WHERE reseller_id = NEW.reseller_id
        AND subscription_status = 'active'
      ),
      updated_at = NOW()
    WHERE id = NEW.reseller_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar estatísticas quando usuário é ativado
DROP TRIGGER IF EXISTS update_reseller_stats_trigger ON public.profiles;
CREATE TRIGGER update_reseller_stats_trigger
  AFTER UPDATE OF subscription_status ON public.profiles
  FOR EACH ROW
  WHEN (NEW.subscription_status = 'active' AND (OLD.subscription_status IS NULL OR OLD.subscription_status != 'active'))
  EXECUTE FUNCTION update_reseller_stats();

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_resellers_updated_at ON public.resellers;
CREATE TRIGGER update_resellers_updated_at
  BEFORE UPDATE ON public.resellers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comentários
COMMENT ON TABLE public.resellers IS 'Tabela de vendedores/revendedores do sistema';
COMMENT ON COLUMN public.resellers.referral_code IS 'Código único de referência usado para rastrear usuários';
COMMENT ON COLUMN public.resellers.referral_link IS 'Link completo de referência (ex: https://app.com/register?ref=CODE)';
COMMENT ON COLUMN public.resellers.commission_percentage IS 'Porcentagem de comissão que o vendedor recebe';
COMMENT ON COLUMN public.resellers.total_users_activated IS 'Total de usuários ativados (com assinatura ativa) trazidos por este vendedor';
COMMENT ON COLUMN public.resellers.total_revenue IS 'Receita total gerada pelos usuários deste vendedor';

-- View para estatísticas de vendedores
CREATE OR REPLACE VIEW reseller_stats AS
SELECT 
  r.id,
  r.name,
  r.email,
  r.referral_code,
  r.active,
  r.commission_percentage,
  COUNT(DISTINCT p.id) as total_users,
  COUNT(DISTINCT CASE WHEN p.subscription_status = 'active' THEN p.id END) as active_users,
  COUNT(DISTINCT CASE WHEN p.subscription_status = 'active' AND p.plan = 'pro' THEN p.id END) as pro_users,
  COUNT(DISTINCT CASE WHEN p.subscription_status = 'active' AND p.plan = 'super_pro' THEN p.id END) as super_pro_users,
  -- Calcular receita total baseada nos planos ativos
  COALESCE(SUM(CASE WHEN p.subscription_status = 'active' THEN 
    CASE 
      WHEN p.plan = 'pro' THEN 64.90
      WHEN p.plan = 'super_pro' THEN 99.90
      WHEN p.plan = 'teste' THEN 12.00
      ELSE 0
    END
  END), 0) as total_revenue,
  r.created_at,
  r.updated_at
FROM public.resellers r
LEFT JOIN public.profiles p ON p.reseller_id = r.id
GROUP BY r.id, r.name, r.email, r.referral_code, r.active, r.commission_percentage, r.created_at, r.updated_at;

COMMENT ON VIEW reseller_stats IS 'Estatísticas agregadas de cada vendedor';

-- Habilitar RLS na view (herda das tabelas base)
-- A view usa as políticas das tabelas resellers e profiles

