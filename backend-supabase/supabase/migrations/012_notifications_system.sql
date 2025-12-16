-- ============================================
-- SISTEMA DE NOTIFICAÇÕES
-- ============================================

-- Tabela de notificações
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Dados da notificação
  type TEXT NOT NULL CHECK (type IN ('success', 'warning', 'error', 'info')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  
  -- Status
  read BOOLEAN DEFAULT false,
  
  -- Referências opcionais
  reference_type TEXT, -- 'disparo', 'connection', 'billing', etc.
  reference_id UUID, -- ID do recurso relacionado
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(user_id, read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- RLS (Row Level Security)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Função para criar notificação quando campanha é concluída
CREATE OR REPLACE FUNCTION create_notification_on_campaign_completed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    INSERT INTO public.notifications (user_id, type, title, message, reference_type, reference_id)
    VALUES (
      NEW.user_id,
      'success',
      'Campanha concluída',
      'A campanha "' || NEW.campaign_name || '" foi finalizada com sucesso',
      'disparo',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para disparos
CREATE TRIGGER trigger_campaign_completed
  AFTER UPDATE ON public.disparos
  FOR EACH ROW
  EXECUTE FUNCTION create_notification_on_campaign_completed();

-- Função para criar notificação quando instância é conectada
CREATE OR REPLACE FUNCTION create_notification_on_connection_online()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'online' AND OLD.status != 'online' THEN
    INSERT INTO public.notifications (user_id, type, title, message, reference_type, reference_id)
    VALUES (
      NEW.user_id,
      'info',
      'Nova instância conectada',
      'A instância "' || NEW.name || '" foi conectada com sucesso',
      'connection',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para conexões
CREATE TRIGGER trigger_connection_online
  AFTER UPDATE ON public.connections
  FOR EACH ROW
  EXECUTE FUNCTION create_notification_on_connection_online();


