-- ============================================
-- CORRIGIR ERRO 500 AO INSERIR RECIPIENTS
-- ============================================
-- Execute este SQL no Supabase SQL Editor
-- ============================================

-- 1. Verificar se a política de INSERT existe e está correta
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
WHERE tablename = 'disparo_recipients' AND cmd = 'INSERT';

-- 2. Verificar se há triggers que possam estar causando problemas
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'disparo_recipients';

-- 3. Recriar política de INSERT com WITH CHECK explícito
DROP POLICY IF EXISTS "Users can insert own recipients" ON public.disparo_recipients;

CREATE POLICY "Users can insert own recipients" ON public.disparo_recipients
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.disparos
      WHERE disparos.id = disparo_recipients.disparo_id
      AND disparos.user_id = auth.uid()
    )
  );

-- 4. Verificar se RLS está habilitado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'disparo_recipients';

-- 5. Garantir que RLS está habilitado
ALTER TABLE public.disparo_recipients ENABLE ROW LEVEL SECURITY;

-- 6. Verificar constraints que possam estar causando problemas
SELECT 
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.disparo_recipients'::regclass;

-- 7. Mensagem de sucesso
DO $$
BEGIN
  RAISE NOTICE '✅ Política de INSERT recriada!';
  RAISE NOTICE '💡 Se o erro persistir, verifique:';
  RAISE NOTICE '   1. Se o disparo_id existe na tabela disparos';
  RAISE NOTICE '   2. Se o user_id do disparo corresponde ao usuário logado';
  RAISE NOTICE '   3. Se há algum trigger ou constraint bloqueando a inserção';
END $$;

