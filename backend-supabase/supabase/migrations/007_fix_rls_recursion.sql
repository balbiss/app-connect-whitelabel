-- ============================================
-- CORRIGIR RECURSÃO INFINITA NAS POLÍTICAS RLS
-- ============================================
-- Este SQL corrige o erro "infinite recursion detected in policy for relation 'profiles'"

-- 1. Remover políticas problemáticas
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- 2. Criar função auxiliar para verificar admin (sem recursão)
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

-- 3. Criar políticas RLS corrigidas (sem recursão)
-- Política para usuários verem seu próprio perfil
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Política para admins verem todos os perfis (usando função SECURITY DEFINER)
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id OR 
    is_admin_user(auth.uid())
  );

-- Política para usuários atualizarem seu próprio perfil
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Política para admins atualizarem todos os perfis (usando função SECURITY DEFINER)
CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (
    auth.uid() = id OR 
    is_admin_user(auth.uid())
  );

-- 4. Comentários
COMMENT ON FUNCTION is_admin_user(UUID) IS 'Função auxiliar para verificar se usuário é admin sem causar recursão nas políticas RLS';




