-- ============================================
-- TABELA: profiles (Perfis de Usuários)
-- ============================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  phone TEXT,
  plan TEXT DEFAULT 'pro' CHECK (plan IN ('pro', 'super_pro')),
  -- Limites por plano
  max_connections INTEGER DEFAULT 2, -- pro: 2, super_pro: 4
  -- Dados do Google OAuth
  google_id TEXT UNIQUE,
  avatar_url TEXT,
  -- Dados de pagamento Cakto
  cakto_customer_id TEXT UNIQUE,
  cakto_subscription_id TEXT UNIQUE,
  subscription_status TEXT CHECK (subscription_status IN ('active', 'canceled', 'past_due', 'trialing', 'paused')),
  subscription_ends_at TIMESTAMPTZ,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_profiles_plan ON public.profiles(plan);
CREATE INDEX IF NOT EXISTS idx_profiles_cakto_customer ON public.profiles(cakto_customer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON public.profiles(subscription_status);

-- RLS (Row Level Security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Função para atualizar max_connections baseado no plano
CREATE OR REPLACE FUNCTION update_max_connections()
RETURNS TRIGGER AS $$
BEGIN
  CASE NEW.plan
    WHEN 'pro' THEN
      NEW.max_connections := 2;
    WHEN 'super_pro' THEN
      NEW.max_connections := 4;
    ELSE
      NEW.max_connections := 2; -- Padrão pro
  END CASE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar max_connections quando o plano mudar
CREATE TRIGGER update_max_connections_trigger
  BEFORE INSERT OR UPDATE OF plan ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_max_connections();

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para updated_at
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Função para criar perfil automaticamente quando usuário é criado
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    email, 
    name,
    google_id,
    avatar_url,
    plan,
    max_connections
  )
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Usuário'),
    NEW.raw_user_meta_data->>'provider_id', -- Google ID se vier do OAuth
    NEW.raw_user_meta_data->>'avatar_url',
    'pro', -- Plano padrão (pro)
    2 -- Limite padrão (pro: 2 conexões)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar perfil automaticamente
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

