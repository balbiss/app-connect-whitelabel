-- Criar tabela appointment_settings se não existir
CREATE TABLE IF NOT EXISTS public.appointment_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  default_connection_id UUID REFERENCES public.connections(id) ON DELETE SET NULL,
  message_template_confirmed TEXT,
  message_template_completed TEXT,
  message_template_cancelled TEXT,
  message_template_no_show TEXT,
  message_template_professional_confirmed TEXT,
  message_template_professional_completed TEXT,
  message_template_professional_cancelled TEXT,
  message_template_professional_no_show TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id)
);

-- Adicionar campo para instância padrão do WhatsApp se a tabela já existir mas a coluna não
ALTER TABLE public.appointment_settings
ADD COLUMN IF NOT EXISTS default_connection_id UUID REFERENCES public.connections(id) ON DELETE SET NULL;

-- Habilitar RLS
ALTER TABLE public.appointment_settings ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (DROP IF EXISTS para evitar erro se já existir)
DROP POLICY IF EXISTS "Users can view own appointment settings" ON public.appointment_settings;
DROP POLICY IF EXISTS "Users can insert own appointment settings" ON public.appointment_settings;
DROP POLICY IF EXISTS "Users can update own appointment settings" ON public.appointment_settings;

CREATE POLICY "Users can view own appointment settings" ON public.appointment_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own appointment settings" ON public.appointment_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own appointment settings" ON public.appointment_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_appointment_settings_updated_at ON public.appointment_settings;
CREATE TRIGGER update_appointment_settings_updated_at
  BEFORE UPDATE ON public.appointment_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comentários
COMMENT ON TABLE public.appointment_settings IS 'Configurações de agendamento por usuário, incluindo templates de mensagens e instância padrão do WhatsApp';
COMMENT ON COLUMN public.appointment_settings.default_connection_id IS 'ID da instância do WhatsApp que será usada por padrão para enviar notificações de agendamento. Se NULL, usa a primeira instância online disponível.';

