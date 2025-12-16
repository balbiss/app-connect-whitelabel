-- ============================================
-- CORRIGIR CRON JOB DE DISPAROS AGENDADOS
-- Execute este SQL no Supabase SQL Editor
-- ============================================

-- 1. Remover job se já existir
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'execute-scheduled-disparos') THEN
    PERFORM cron.unschedule('execute-scheduled-disparos');
    RAISE NOTICE 'Job execute-scheduled-disparos removido';
  END IF;
END $$;

-- 2. Configurar variáveis de ambiente (se ainda não estiverem configuradas)
-- Substitua pelos seus valores reais
DO $$
BEGIN
  -- Verificar se as configurações já existem
  IF current_setting('app.supabase_url', true) IS NULL THEN
    PERFORM set_config('app.supabase_url', 'https://oxpcmdejlcmsopjbqncf.supabase.co', false);
  END IF;
  
  IF current_setting('app.supabase_service_role_key', true) IS NULL THEN
    PERFORM set_config('app.supabase_service_role_key', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94cGNtZGVqbGNtc29wamJxbmNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTgzNjk2MywiZXhwIjoyMDgxNDEyOTYzfQ.J6Xt-mAdWB4rTJunEK8jPvNFD73MlL5wL9SPXx_vCU', false);
  END IF;
END $$;

-- 3. Criar novo cron job
SELECT cron.schedule(
  job_name := 'execute-scheduled-disparos'::text,
  schedule := '* * * * *'::text,
  command := $cmd$
    SELECT
      net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/execute-scheduled-disparos',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
        ),
        body := '{}'::jsonb
      ) AS request_id;
  $cmd$::text
);

-- 4. Verificar se foi criado
SELECT 
  jobid,
  jobname,
  schedule,
  active,
  command
FROM cron.job 
WHERE jobname = 'execute-scheduled-disparos';

-- ✅ Se você vê uma linha acima, o cron job foi criado com sucesso!

