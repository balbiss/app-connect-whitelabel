-- ============================================
-- VERIFICAR SE O CRON JOB ESTÁ EXECUTANDO
-- Execute este SQL no Supabase SQL Editor
-- ============================================

-- 1. Verificar se o cron job está ativo
SELECT 
  jobid,
  jobname,
  schedule,
  active,
  command
FROM cron.job 
WHERE jobname = 'execute-scheduled-disparos';

-- 2. Ver histórico de execuções do cron job (últimas 20 execuções)
SELECT 
  jobid,
  runid,
  status,
  return_message,
  start_time,
  end_time,
  EXTRACT(EPOCH FROM (end_time - start_time)) as duracao_segundos
FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'execute-scheduled-disparos')
ORDER BY start_time DESC
LIMIT 20;

-- 3. Verificar campanhas agendadas que deveriam ter disparado
SELECT 
  id,
  campaign_name,
  status,
  scheduled_at,
  NOW() as agora_utc,
  scheduled_at <= NOW() as deveria_disparar,
  EXTRACT(EPOCH FROM (NOW() - scheduled_at))/60 as minutos_atrasado
FROM disparos
WHERE status = 'scheduled'
ORDER BY scheduled_at DESC;

-- 4. Verificar se há campanhas que foram processadas
SELECT 
  id,
  campaign_name,
  status,
  scheduled_at,
  started_at,
  completed_at,
  sent_count,
  failed_count
FROM disparos
WHERE status IN ('in_progress', 'completed', 'failed')
  AND scheduled_at IS NOT NULL
ORDER BY updated_at DESC
LIMIT 10;

