-- ============================================
-- MELHORIAS NO SISTEMA DE NOTIFICAÇÕES
-- ============================================
-- Adiciona notificações para todos os eventos importantes
-- ============================================

-- Função para criar notificação quando campanha é criada/iniciada
CREATE OR REPLACE FUNCTION create_notification_on_campaign_started()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'in_progress' AND (OLD.status IS NULL OR OLD.status != 'in_progress') THEN
    INSERT INTO public.notifications (user_id, type, title, message, reference_type, reference_id)
    VALUES (
      NEW.user_id,
      'info',
      '▶️ Campanha Iniciada',
      'A campanha "' || NEW.campaign_name || '" foi iniciada e está enviando mensagens.',
      'disparo',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para campanha iniciada
DROP TRIGGER IF EXISTS trigger_campaign_started ON public.disparos;
CREATE TRIGGER trigger_campaign_started
  AFTER INSERT OR UPDATE ON public.disparos
  FOR EACH ROW
  EXECUTE FUNCTION create_notification_on_campaign_started();

-- Função para criar notificação quando campanha é pausada
CREATE OR REPLACE FUNCTION create_notification_on_campaign_paused()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'paused' AND OLD.status != 'paused' THEN
    INSERT INTO public.notifications (user_id, type, title, message, reference_type, reference_id)
    VALUES (
      NEW.user_id,
      'warning',
      '⏸️ Campanha Pausada',
      'A campanha "' || NEW.campaign_name || '" foi pausada. Você pode retomar quando quiser.',
      'disparo',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para campanha pausada
DROP TRIGGER IF EXISTS trigger_campaign_paused ON public.disparos;
CREATE TRIGGER trigger_campaign_paused
  AFTER UPDATE ON public.disparos
  FOR EACH ROW
  EXECUTE FUNCTION create_notification_on_campaign_paused();

-- Função para criar notificação quando campanha é cancelada
CREATE OR REPLACE FUNCTION create_notification_on_campaign_cancelled()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    INSERT INTO public.notifications (user_id, type, title, message, reference_type, reference_id)
    VALUES (
      NEW.user_id,
      'warning',
      '⏹️ Campanha Cancelada',
      'A campanha "' || NEW.campaign_name || '" foi cancelada.',
      'disparo',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para campanha cancelada
DROP TRIGGER IF EXISTS trigger_campaign_cancelled ON public.disparos;
CREATE TRIGGER trigger_campaign_cancelled
  AFTER UPDATE ON public.disparos
  FOR EACH ROW
  EXECUTE FUNCTION create_notification_on_campaign_cancelled();

-- Função melhorada para criar notificação quando campanha é concluída
CREATE OR REPLACE FUNCTION create_notification_on_campaign_completed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    INSERT INTO public.notifications (user_id, type, title, message, reference_type, reference_id)
    VALUES (
      NEW.user_id,
      'success',
      '✅ Campanha Concluída',
      'A campanha "' || NEW.campaign_name || '" foi finalizada! ' || 
      COALESCE(NEW.sent_count::text, '0') || ' de ' || 
      COALESCE(NEW.total_recipients::text, '0') || ' mensagens enviadas com sucesso.',
      'disparo',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Atualizar trigger de campanha concluída
DROP TRIGGER IF EXISTS trigger_campaign_completed ON public.disparos;
CREATE TRIGGER trigger_campaign_completed
  AFTER UPDATE ON public.disparos
  FOR EACH ROW
  EXECUTE FUNCTION create_notification_on_campaign_completed();

-- Função para criar notificação quando campanha falha
CREATE OR REPLACE FUNCTION create_notification_on_campaign_failed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'failed' AND OLD.status != 'failed' THEN
    INSERT INTO public.notifications (user_id, type, title, message, reference_type, reference_id)
    VALUES (
      NEW.user_id,
      'error',
      '❌ Campanha Falhou',
      'A campanha "' || NEW.campaign_name || '" falhou. Verifique os detalhes.',
      'disparo',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para campanha falhada
DROP TRIGGER IF EXISTS trigger_campaign_failed ON public.disparos;
CREATE TRIGGER trigger_campaign_failed
  AFTER UPDATE ON public.disparos
  FOR EACH ROW
  EXECUTE FUNCTION create_notification_on_campaign_failed();

-- Função melhorada para criar notificação quando instância é conectada
CREATE OR REPLACE FUNCTION create_notification_on_connection_online()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'online' AND (OLD.status IS NULL OR OLD.status != 'online') THEN
    INSERT INTO public.notifications (user_id, type, title, message, reference_type, reference_id)
    VALUES (
      NEW.user_id,
      'success',
      '📱 Instância Conectada',
      'A instância "' || NEW.name || '" foi conectada com sucesso!',
      'connection',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Atualizar trigger de conexão online
DROP TRIGGER IF EXISTS trigger_connection_online ON public.connections;
CREATE TRIGGER trigger_connection_online
  AFTER INSERT OR UPDATE ON public.connections
  FOR EACH ROW
  EXECUTE FUNCTION create_notification_on_connection_online();

-- Função para criar notificação quando instância é desconectada
CREATE OR REPLACE FUNCTION create_notification_on_connection_offline()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('offline', 'disconnected') AND OLD.status = 'online' THEN
    INSERT INTO public.notifications (user_id, type, title, message, reference_type, reference_id)
    VALUES (
      NEW.user_id,
      'warning',
      '📱 Instância Desconectada',
      'A instância "' || NEW.name || '" foi desconectada.',
      'connection',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para instância desconectada
DROP TRIGGER IF EXISTS trigger_connection_offline ON public.connections;
CREATE TRIGGER trigger_connection_offline
  AFTER UPDATE ON public.connections
  FOR EACH ROW
  EXECUTE FUNCTION create_notification_on_connection_offline();

-- Função para criar notificação quando assinatura é ativada
CREATE OR REPLACE FUNCTION create_notification_on_subscription_activated()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.subscription_status = 'active' AND (OLD.subscription_status IS NULL OR OLD.subscription_status != 'active') THEN
    DECLARE
      plan_name TEXT;
    BEGIN
      plan_name := CASE 
        WHEN NEW.plan = 'teste' THEN 'Plano Teste'
        WHEN NEW.plan = 'pro' THEN 'PRO'
        WHEN NEW.plan = 'super_pro' THEN 'SUPER PRO'
        ELSE COALESCE(NEW.plan::text, 'Plano')
      END;
      
      INSERT INTO public.notifications (user_id, type, title, message, reference_type, reference_id)
      VALUES (
        NEW.id,
        'success',
        '🎉 Assinatura Ativada!',
        'Sua assinatura do plano ' || plan_name || ' foi ativada com sucesso!',
        'subscription',
        NULL
      );
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para assinatura ativada
DROP TRIGGER IF EXISTS trigger_subscription_activated ON public.profiles;
CREATE TRIGGER trigger_subscription_activated
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_notification_on_subscription_activated();

-- Função para criar notificação quando assinatura expira
CREATE OR REPLACE FUNCTION create_notification_on_subscription_expired()
RETURNS TRIGGER AS $$
BEGIN
  -- Verificar se a data de expiração passou
  IF NEW.subscription_ends_at IS NOT NULL AND 
     NEW.subscription_ends_at < NOW() AND 
     (OLD.subscription_ends_at IS NULL OR OLD.subscription_ends_at >= NOW()) THEN
    INSERT INTO public.notifications (user_id, type, title, message, reference_type, reference_id)
    VALUES (
      NEW.id,
      'warning',
      '⚠️ Assinatura Expirada',
      'Sua assinatura expirou. Renove para continuar usando o sistema.',
      'subscription',
      NULL
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para assinatura expirada
DROP TRIGGER IF EXISTS trigger_subscription_expired ON public.profiles;
CREATE TRIGGER trigger_subscription_expired
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_notification_on_subscription_expired();

-- ============================================
-- COMENTÁRIOS
-- ============================================
-- Este SQL adiciona triggers para criar notificações automaticamente quando:
-- 1. Campanha é criada/iniciada
-- 2. Campanha é pausada
-- 3. Campanha é cancelada
-- 4. Campanha é concluída
-- 5. Campanha falha
-- 6. Instância é conectada
-- 7. Instância é desconectada
-- 8. Assinatura é ativada
-- 9. Assinatura expira
-- ============================================




