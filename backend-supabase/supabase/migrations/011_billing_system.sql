-- ============================================
-- SISTEMA DE COBRANÇA AUTOMÁTICA
-- ============================================

-- Tabela de cobranças
CREATE TABLE IF NOT EXISTS public.billings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES public.connections(id) ON DELETE CASCADE,
  
  -- Dados do cliente
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL, -- Número no formato internacional (ex: 5511999999999@s.whatsapp.net)
  
  -- Dados da cobrança
  description TEXT,
  amount DECIMAL(10, 2) NOT NULL,
  due_date DATE NOT NULL, -- Data de vencimento
  
  -- Mensagem de cobrança
  message_template TEXT, -- Template da mensagem (pode usar variáveis {{nome}}, {{valor}}, {{data}}, etc.)
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'paid', 'overdue', 'cancelled')),
  
  -- Controle de envio
  last_sent_at TIMESTAMPTZ, -- Última vez que a mensagem foi enviada
  sent_count INTEGER DEFAULT 0, -- Quantas vezes a mensagem foi enviada
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_billings_user_id ON public.billings(user_id);
CREATE INDEX IF NOT EXISTS idx_billings_connection_id ON public.billings(connection_id);
CREATE INDEX IF NOT EXISTS idx_billings_due_date ON public.billings(due_date) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_billings_status ON public.billings(status);
CREATE INDEX IF NOT EXISTS idx_billings_created_at ON public.billings(created_at);

-- RLS (Row Level Security)
ALTER TABLE public.billings ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view own billings" ON public.billings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own billings" ON public.billings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own billings" ON public.billings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own billings" ON public.billings
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER update_billings_updated_at 
  BEFORE UPDATE ON public.billings
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Função para verificar e disparar cobranças vencidas
CREATE OR REPLACE FUNCTION check_and_send_billings()
RETURNS void AS $$
DECLARE
  billing_record RECORD;
  message_text TEXT;
  formatted_date TEXT;
  formatted_amount TEXT;
BEGIN
  -- Buscar cobranças pendentes com vencimento hoje
  FOR billing_record IN 
    SELECT 
      b.*,
      c.api_instance_token,
      c.name as connection_name
    FROM public.billings b
    INNER JOIN public.connections c ON c.id = b.connection_id
    WHERE b.status = 'pending'
      AND b.due_date = CURRENT_DATE
      AND (b.last_sent_at IS NULL OR b.last_sent_at::date < CURRENT_DATE)
  LOOP
    -- Formatar data e valor
    formatted_date := TO_CHAR(billing_record.due_date, 'DD/MM/YYYY');
    formatted_amount := TO_CHAR(billing_record.amount, 'FM999G999G999D90', 'pt_BR');
    
    -- Substituir variáveis na mensagem
    message_text := COALESCE(billing_record.message_template, 
      'Olá {{nome}}! Você tem uma cobrança pendente de R$ {{valor}} com vencimento em {{data}}. Por favor, entre em contato para quitar.');
    
    message_text := REPLACE(message_text, '{{nome}}', billing_record.client_name);
    message_text := REPLACE(message_text, '{{valor}}', formatted_amount);
    message_text := REPLACE(message_text, '{{data}}', formatted_date);
    message_text := REPLACE(message_text, '{{descricao}}', COALESCE(billing_record.description, ''));
    
    -- Aqui seria feita a chamada para a API do WhatsApp
    -- Por enquanto, apenas atualizamos o status
    -- A lógica de envio será feita pela Edge Function
    
    -- Atualizar registro
    UPDATE public.billings
    SET 
      last_sent_at = NOW(),
      sent_count = sent_count + 1,
      status = CASE 
        WHEN due_date < CURRENT_DATE THEN 'overdue'
        ELSE 'pending'
      END,
      updated_at = NOW()
    WHERE id = billing_record.id;
    
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Criar job do pg_cron para executar diariamente às 08:00 (horário de Brasília = UTC-3)
-- Nota: pg_cron usa UTC, então 08:00 BRT = 11:00 UTC (considerando horário de verão pode variar)
-- Usar Edge Function para envio real das mensagens

-- Remover job se já existir
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-daily-billings') THEN
    PERFORM cron.unschedule('send-daily-billings');
  END IF;
END $$;

-- Criar novo job usando cast explícito na função
-- NOTA: Se der erro de ambiguidade, execute este SQL manualmente depois da instalação
-- Veja o arquivo: INSTALAR_CRON_JOBS.sql

-- Comentado temporariamente para evitar erro de ambiguidade
-- Execute manualmente depois da instalação completa:
/*
SELECT cron.schedule(
  'send-daily-billings'::text,
  '0 11 * * *'::text,
  ('SELECT net.http_post(url := current_setting(''app.supabase_url'') || ''/functions/v1/send-billings'', headers := jsonb_build_object(''Content-Type'', ''application/json'', ''Authorization'', ''Bearer '' || current_setting(''app.supabase_service_role_key'')), body := ''{}''::jsonb) AS request_id;')::text
);
*/

