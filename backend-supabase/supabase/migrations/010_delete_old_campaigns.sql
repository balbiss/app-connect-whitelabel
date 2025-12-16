-- ============================================
-- DELETAR CAMPANHAS ANTIGAS AUTOMATICAMENTE
-- ============================================
-- Este cron job deleta campanhas com mais de 5 dias automaticamente
-- Apenas campanhas concluídas, canceladas ou falhadas são deletadas
-- Executa diariamente às 2h da manhã

-- Criar cron job para deletar campanhas antigas
-- Remover job se já existir
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'delete-old-campaigns') THEN
    PERFORM cron.unschedule('delete-old-campaigns');
  END IF;
END $$;

-- Criar novo job usando cast explícito na função
-- NOTA: Se der erro de ambiguidade, execute este SQL manualmente depois da instalação
-- Veja o arquivo: INSTALAR_CRON_JOBS.sql

-- Comentado temporariamente para evitar erro de ambiguidade
-- Execute manualmente depois da instalação completa:
/*
SELECT cron.schedule(
  'delete-old-campaigns'::text,
  '0 2 * * *'::text,
  ('SELECT net.http_post(url := current_setting(''app.supabase_url'') || ''/functions/v1/delete-old-campaigns'', headers := jsonb_build_object(''Content-Type'', ''application/json'', ''Authorization'', ''Bearer '' || current_setting(''app.supabase_service_role_key'')), body := ''{}''::jsonb) AS request_id;')::text
);
*/

-- Comentário explicativo (comentado para evitar erro de ambiguidade)
-- COMMENT ON FUNCTION cron.schedule(text, text, text) IS 'Cron job para deletar campanhas antigas (mais de 5 dias) automaticamente';

-- Verificar se o cron job foi criado (comentado para evitar problemas)
-- Execute manualmente depois de instalar os cron jobs:
/*
SELECT 
  jobid,
  jobname,
  schedule,
  active,
  command
FROM cron.job 
WHERE jobname = 'delete-old-campaigns';
*/



