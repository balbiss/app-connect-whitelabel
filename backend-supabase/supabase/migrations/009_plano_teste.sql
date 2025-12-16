-- ============================================
-- PLANO DE TESTE - R$ 12,00
-- ============================================
-- Plano teste: 1 conexão, 20 disparos/dia, válido por 3 dias

-- Adicionar plano "teste" ao CHECK constraint
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_plan_check;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_plan_check 
CHECK (plan IN ('pro', 'super_pro', 'teste'));

-- Adicionar campos para controle do plano teste
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS daily_disparos_limit INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS daily_disparos_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_disparos_reset_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT NULL;

-- Atualizar função para incluir plano teste
CREATE OR REPLACE FUNCTION update_max_connections()
RETURNS TRIGGER AS $$
BEGIN
  CASE NEW.plan
    WHEN 'pro' THEN
      NEW.max_connections := 2;
      NEW.daily_disparos_limit := NULL; -- Ilimitado
    WHEN 'super_pro' THEN
      NEW.max_connections := 4;
      NEW.daily_disparos_limit := NULL; -- Ilimitado
    WHEN 'teste' THEN
      NEW.max_connections := 1;
      NEW.daily_disparos_limit := 20; -- 20 disparos por dia
      -- Se está criando um novo plano teste, definir expiração em 3 dias
      IF OLD.plan != 'teste' OR OLD.plan IS NULL THEN
        NEW.trial_ends_at := NOW() + INTERVAL '3 days';
        NEW.daily_disparos_count := 0;
        NEW.last_disparos_reset_date := CURRENT_DATE;
      END IF;
    ELSE
      NEW.max_connections := 2;
      NEW.daily_disparos_limit := NULL;
  END CASE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Função para resetar contador diário de disparos
CREATE OR REPLACE FUNCTION reset_daily_disparos_count()
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET 
    daily_disparos_count = 0,
    last_disparos_reset_date = CURRENT_DATE
  WHERE 
    plan = 'teste' 
    AND last_disparos_reset_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Função para verificar se usuário pode criar disparo (verificar limite diário)
CREATE OR REPLACE FUNCTION can_create_disparo(user_uuid UUID, recipients_count INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  user_plan TEXT;
  daily_limit INTEGER;
  current_count INTEGER;
  trial_expired BOOLEAN;
BEGIN
  SELECT plan, daily_disparos_limit, daily_disparos_count, 
         (trial_ends_at IS NOT NULL AND trial_ends_at < NOW())
  INTO user_plan, daily_limit, current_count, trial_expired
  FROM public.profiles
  WHERE id = user_uuid;

  -- Se plano teste expirou
  IF trial_expired THEN
    RETURN FALSE;
  END IF;

  -- Se não tem limite diário (planos pro/super_pro), permitir
  IF daily_limit IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Verificar se excedeu limite diário
  IF (current_count + recipients_count) > daily_limit THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para incrementar contador de disparos diários
CREATE OR REPLACE FUNCTION increment_daily_disparos(user_uuid UUID, count INTEGER)
RETURNS void AS $$
BEGIN
  -- Resetar contador se mudou o dia
  UPDATE public.profiles
  SET 
    daily_disparos_count = 0,
    last_disparos_reset_date = CURRENT_DATE
  WHERE 
    id = user_uuid 
    AND plan = 'teste'
    AND last_disparos_reset_date < CURRENT_DATE;

  -- Incrementar contador
  UPDATE public.profiles
  SET 
    daily_disparos_count = daily_disparos_count + count,
    updated_at = NOW()
  WHERE id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se plano teste expirou e desativar
CREATE OR REPLACE FUNCTION check_trial_expiration()
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET 
    subscription_status = 'canceled',
    subscription_ends_at = NOW()
  WHERE 
    plan = 'teste'
    AND trial_ends_at IS NOT NULL
    AND trial_ends_at < NOW()
    AND subscription_status = 'active';
END;
$$ LANGUAGE plpgsql;

-- Trigger para resetar contador diário automaticamente
CREATE OR REPLACE FUNCTION auto_reset_daily_disparos()
RETURNS TRIGGER AS $$
BEGIN
  -- Resetar contador se mudou o dia
  IF OLD.last_disparos_reset_date < CURRENT_DATE THEN
    NEW.daily_disparos_count := 0;
    NEW.last_disparos_reset_date := CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_reset_daily_disparos_trigger ON public.profiles;
CREATE TRIGGER auto_reset_daily_disparos_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (OLD.plan = 'teste' AND NEW.plan = 'teste')
  EXECUTE FUNCTION auto_reset_daily_disparos();

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_profiles_trial_ends_at ON public.profiles(trial_ends_at);
CREATE INDEX IF NOT EXISTS idx_profiles_plan_trial ON public.profiles(plan, trial_ends_at);

-- Comentários
COMMENT ON COLUMN public.profiles.daily_disparos_limit IS 'Limite diário de disparos (NULL = ilimitado)';
COMMENT ON COLUMN public.profiles.daily_disparos_count IS 'Contador de disparos no dia atual';
COMMENT ON COLUMN public.profiles.last_disparos_reset_date IS 'Data do último reset do contador diário';
COMMENT ON COLUMN public.profiles.trial_ends_at IS 'Data de expiração do plano teste (3 dias após ativação)';



