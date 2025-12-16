-- ============================================
-- INSTALAR CRON JOBS MANUALMENTE
-- ============================================
-- Execute este arquivo DEPOIS de executar INSTALACAO_COMPLETA.sql
-- Se você recebeu erro de ambiguidade com cron.schedule, execute este arquivo
-- ============================================

-- Remover jobs se já existirem
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'execute-scheduled-disparos') THEN
    PERFORM cron.unschedule('execute-scheduled-disparos');
  END IF;
  
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'delete-old-campaigns') THEN
    PERFORM cron.unschedule('delete-old-campaigns');
  END IF;
  
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-daily-billings') THEN
    PERFORM cron.unschedule('send-daily-billings');
  END IF;
  
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'check-expired-subscriptions') THEN
    PERFORM cron.unschedule('check-expired-subscriptions');
  END IF;
END $$;

-- ============================================
-- 1. CRON JOB: Executar Disparos Agendados
-- ============================================
-- Executa a cada minuto
SELECT cron.schedule(
  'execute-scheduled-disparos'::text,
  '* * * * *'::text,
  ('SELECT net.http_post(url := current_setting(''app.supabase_url'') || ''/functions/v1/execute-scheduled-disparos'', headers := jsonb_build_object(''Content-Type'', ''application/json'', ''Authorization'', ''Bearer '' || current_setting(''app.supabase_service_role_key'')), body := ''{}''::jsonb) AS request_id;')::text
);

-- ============================================
-- 2. CRON JOB: Deletar Campanhas Antigas
-- ============================================
-- Executa diariamente às 2h da manhã (UTC)
SELECT cron.schedule(
  'delete-old-campaigns'::text,
  '0 2 * * *'::text,
  ('SELECT net.http_post(url := current_setting(''app.supabase_url'') || ''/functions/v1/delete-old-campaigns'', headers := jsonb_build_object(''Content-Type'', ''application/json'', ''Authorization'', ''Bearer '' || current_setting(''app.supabase_service_role_key'')), body := ''{}''::jsonb) AS request_id;')::text
);

-- ============================================
-- 3. CRON JOB: Enviar Cobranças Diárias
-- ============================================
-- Executa diariamente às 11:00 UTC (08:00 BRT)
SELECT cron.schedule(
  'send-daily-billings'::text,
  '0 11 * * *'::text,
  ('SELECT net.http_post(url := current_setting(''app.supabase_url'') || ''/functions/v1/send-billings'', headers := jsonb_build_object(''Content-Type'', ''application/json'', ''Authorization'', ''Bearer '' || current_setting(''app.supabase_service_role_key'')), body := ''{}''::jsonb) AS request_id;')::text
);

-- ============================================
-- 4. CRON JOB: Verificar Assinaturas Expiradas
-- ============================================
-- Executa diariamente à meia-noite (UTC)
SELECT cron.schedule(
  'check-expired-subscriptions'::text,
  '0 0 * * *'::text,
  ('SELECT net.http_post(url := current_setting(''app.supabase_url'') || ''/functions/v1/check-expired-subscriptions'', headers := jsonb_build_object(''Content-Type'', ''application/json'', ''Authorization'', ''Bearer '' || current_setting(''app.supabase_service_role_key'')), body := ''{}''::jsonb) AS request_id;')::text
);

-- ============================================
-- VERIFICAR SE OS JOBS FORAM CRIADOS
-- ============================================
SELECT 
  jobid,
  jobname,
  schedule,
  active,
  command
FROM cron.job 
WHERE jobname IN (
  'execute-scheduled-disparos',
  'delete-old-campaigns',
  'send-daily-billings',
  'check-expired-subscriptions'
)
ORDER BY jobname;

-- ✅ Se você vê 4 linhas acima, todos os cron jobs foram criados com sucesso!

