-- Criar cron job para executar disparos agendados
-- Executa a cada minuto

-- Remover job se já existir
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'execute-scheduled-disparos') THEN
    PERFORM cron.unschedule('execute-scheduled-disparos');
  END IF;
END $$;

-- Criar novo job usando cast explícito na função
-- NOTA: Se der erro de ambiguidade, execute este SQL manualmente depois da instalação
-- Veja o arquivo: INSTALAR_CRON_JOBS.sql

-- Comentado temporariamente para evitar erro de ambiguidade
-- Execute manualmente depois da instalação completa:
/*
SELECT cron.schedule(
  'execute-scheduled-disparos'::text,
  '* * * * *'::text,
  ('SELECT net.http_post(url := current_setting(''app.supabase_url'') || ''/functions/v1/execute-scheduled-disparos'', headers := jsonb_build_object(''Content-Type'', ''application/json'', ''Authorization'', ''Bearer '' || current_setting(''app.supabase_service_role_key'')), body := ''{}''::jsonb) AS request_id;')::text
);
*/






