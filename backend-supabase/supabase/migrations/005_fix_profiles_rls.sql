-- ============================================
-- CORREÇÃO: Adicionar política RLS para INSERT em profiles
-- ============================================

-- Adicionar política para permitir que usuários criem seu próprio perfil
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);





