-- ============================================
-- CRON JOB: Verificar Assinaturas Expiradas
-- ============================================

-- Cron job para verificar assinaturas expiradas diariamente
-- Remover job se já existir
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'check-expired-subscriptions') THEN
    PERFORM cron.unschedule('check-expired-subscriptions');
  END IF;
END $$;

-- Criar novo job usando cast explícito na função
-- NOTA: Se der erro de ambiguidade, execute este SQL manualmente depois da instalação
-- Veja o arquivo: INSTALAR_CRON_JOBS.sql

-- Comentado temporariamente para evitar erro de ambiguidade
-- Execute manualmente depois da instalação completa:
/*
SELECT cron.schedule(
  'check-expired-subscriptions'::text,
  '0 0 * * *'::text,
  ('SELECT net.http_post(url := current_setting(''app.supabase_url'') || ''/functions/v1/check-expired-subscriptions'', headers := jsonb_build_object(''Content-Type'', ''application/json'', ''Authorization'', ''Bearer '' || current_setting(''app.supabase_service_role_key'')), body := ''{}''::jsonb) AS request_id;')::text
);
*/





