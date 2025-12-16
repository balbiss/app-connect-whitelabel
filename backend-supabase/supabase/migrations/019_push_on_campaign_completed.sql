-- ============================================
-- ENVIAR PUSH NOTIFICATION QUANDO CAMPANHA FINALIZAR
-- ============================================
-- Atualiza o trigger de campanha concluída para enviar push notification
-- ============================================

-- Função para enviar push notification quando campanha é concluída
CREATE OR REPLACE FUNCTION send_push_on_campaign_completed()
RETURNS TRIGGER AS $$
DECLARE
  supabase_url TEXT;
  supabase_service_key TEXT;
  push_response JSONB;
BEGIN
  -- Só processar se status mudou para 'completed'
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    
    -- Buscar URL e Service Key do Supabase (via system_settings ou variáveis de ambiente)
    SELECT value->>'url' INTO supabase_url
    FROM system_settings
    WHERE key = 'supabase_url'
    LIMIT 1;
    
    -- Se não encontrar, usar valor padrão (será configurado via env vars na Edge Function)
    IF supabase_url IS NULL THEN
      supabase_url := 'https://your-project.supabase.co';
    END IF;
    
    -- Chamar Edge Function para enviar push notification
    -- Nota: A Edge Function vai buscar as subscriptions e enviar
    -- Usamos pg_net para fazer requisição HTTP
    BEGIN
      SELECT content INTO push_response
      FROM http_post(
        supabase_url || '/functions/v1/send-push-notification',
        jsonb_build_object(
          'userId', NEW.user_id::text,
          'title', '✅ Campanha Concluída',
          'body', 'A campanha "' || NEW.campaign_name || '" foi finalizada! ' || 
                  COALESCE(NEW.sent_count::text, '0') || ' de ' || 
                  COALESCE(NEW.total_recipients::text, '0') || ' mensagens enviadas.',
          'data', jsonb_build_object(
            'type', 'campaign_completed',
            'campaignId', NEW.id::text,
            'url', '/campanhas'
          ),
          'icon', '/favicon.ico',
          'tag', 'campaign_' || NEW.id::text
        )::text,
        'application/json'
      );
      
      -- Log do resultado (opcional)
      RAISE NOTICE 'Push notification enviada para campanha %: %', NEW.id, push_response;
    EXCEPTION WHEN OTHERS THEN
      -- Se falhar, apenas logar erro mas não impedir o trigger
      RAISE WARNING 'Erro ao enviar push notification: %', SQLERRM;
    END;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Atualizar trigger para também chamar função de push
-- Primeiro, vamos criar um novo trigger que chama ambas as funções
DROP TRIGGER IF EXISTS trigger_campaign_completed_push ON public.disparos;

-- Criar trigger que chama a função de push (a notificação no banco já é criada pelo trigger anterior)
CREATE TRIGGER trigger_campaign_completed_push
  AFTER UPDATE ON public.disparos
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
  EXECUTE FUNCTION send_push_on_campaign_completed();

-- Comentário
COMMENT ON FUNCTION send_push_on_campaign_completed() IS 'Envia push notification quando uma campanha é concluída';



