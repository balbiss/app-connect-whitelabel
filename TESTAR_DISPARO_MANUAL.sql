-- ============================================
-- TESTAR DISPARO MANUAL DE CAMPANHA AGENDADA
-- Execute este SQL para forçar o disparo de uma campanha
-- ============================================

-- Substitua o ID pela campanha que você quer testar
-- ID da campanha: 1638912f-7f72-4d7c-9179-9fa021816c33

-- 1. Verificar status atual da campanha
SELECT 
  id,
  campaign_name,
  status,
  scheduled_at,
  NOW() as agora_utc,
  scheduled_at <= NOW() as deveria_disparar
FROM disparos
WHERE id = '1638912f-7f72-4d7c-9179-9fa021816c33';

-- 2. Chamar a Edge Function manualmente via SQL
-- Isso vai forçar o disparo da campanha
SELECT
  net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/execute-scheduled-disparos',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
    ),
    body := jsonb_build_object(
      'disparo_id', '1638912f-7f72-4d7c-9179-9fa021816c33'
    )
  ) AS request_id;

-- 3. Aguardar alguns segundos e verificar se mudou o status
-- Execute este SELECT novamente após 10-20 segundos
SELECT 
  id,
  campaign_name,
  status,
  scheduled_at,
  started_at,
  sent_count,
  failed_count
FROM disparos
WHERE id = '1638912f-7f72-4d7c-9179-9fa021816c33';

