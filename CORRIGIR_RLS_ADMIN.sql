-- ============================================
-- CORRIGIR RLS PARA PERMITIR ADMINS ATUALIZAREM PERFIS
-- ============================================
-- Execute este SQL no Supabase SQL Editor
-- ============================================

-- 1. Garantir que a função is_admin_user existe e está correta
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

-- 2. Remover políticas conflitantes de UPDATE
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- 3. Recriar política para usuários atualizarem seu próprio perfil (com WITH CHECK)
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 4. Recriar política para admins atualizarem todos os perfis (com WITH CHECK)
CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE 
  USING (
    auth.uid() = id OR 
    is_admin_user(auth.uid())
  )
  WITH CHECK (
    auth.uid() = id OR 
    is_admin_user(auth.uid())
  );

-- 5. Corrigir RLS para notificações (permitir admins criarem notificações)
-- Remover política de INSERT existente se houver
DROP POLICY IF EXISTS "Users can insert own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can insert notifications" ON public.notifications;

-- Criar política para usuários inserirem suas próprias notificações
CREATE POLICY "Users can insert own notifications" ON public.notifications
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Criar política para admins inserirem notificações para qualquer usuário
CREATE POLICY "Admins can insert notifications" ON public.notifications
  FOR INSERT 
  WITH CHECK (is_admin_user(auth.uid()));

-- 6. Verificar se as políticas foram criadas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles' AND policyname LIKE '%update%'
ORDER BY policyname;

-- 7. Mensagem de sucesso
DO $$
BEGIN
  RAISE NOTICE '✅ Políticas RLS corrigidas! Admins agora podem atualizar perfis.';
END $$;

