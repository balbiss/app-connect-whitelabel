-- ============================================
-- HABILITAR REALTIME PARA TABELAS
-- ============================================
-- Execute este SQL no Supabase SQL Editor
-- ============================================

-- Habilitar Realtime para disparos
ALTER PUBLICATION supabase_realtime ADD TABLE public.disparos;

-- Habilitar Realtime para disparo_recipients
ALTER PUBLICATION supabase_realtime ADD TABLE public.disparo_recipients;

-- Verificar se foi habilitado
SELECT 
  schemaname,
  tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('disparos', 'disparo_recipients');

-- Mensagem de sucesso
DO $$
BEGIN
  RAISE NOTICE '✅ Realtime habilitado para disparos e disparo_recipients!';
END $$;

