-- ============================================
-- SISTEMA DE CHATBOT FLOWS (Tipo Typebot)
-- ============================================
-- Sistema para criar fluxos de conversa automatizados
-- ============================================

-- Tabela de fluxos
CREATE TABLE IF NOT EXISTS public.chatbot_flows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES public.connections(id) ON DELETE SET NULL,
  
  -- Dados do fluxo
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT false,
  
  -- Trigger (como o fluxo é ativado)
  trigger_type TEXT NOT NULL DEFAULT 'campaign_response' CHECK (trigger_type IN (
    'campaign_response', -- Resposta a uma campanha
    'keyword', -- Palavra-chave específica
    'first_message', -- Primeira mensagem do contato
    'time_based', -- Baseado em horário
    'manual' -- Ativação manual
  )),
  trigger_campaign_id UUID REFERENCES public.disparos(id) ON DELETE SET NULL,
  trigger_keywords TEXT[], -- Palavras-chave que ativam o fluxo
  trigger_schedule JSONB, -- Horários específicos (ex: {"days": [1,2,3], "start": "09:00", "end": "18:00"})
  
  -- Estrutura do fluxo (JSON com nós e conexões)
  flow_data JSONB NOT NULL DEFAULT '{"nodes": [], "edges": []}'::jsonb,
  
  -- Configurações
  settings JSONB DEFAULT '{
    "timeout": 300,
    "max_conversations": 100,
    "greeting_message": null,
    "fallback_message": "Desculpe, não entendi. Pode repetir?",
    "transfer_to_human_keyword": "atendente"
  }'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_trigger CHECK (
    (trigger_type = 'campaign_response' AND trigger_campaign_id IS NOT NULL) OR
    (trigger_type = 'keyword' AND trigger_keywords IS NOT NULL AND array_length(trigger_keywords, 1) > 0) OR
    (trigger_type IN ('first_message', 'time_based', 'manual'))
  )
);

-- Tabela de conversas ativas
CREATE TABLE IF NOT EXISTS public.chatbot_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flow_id UUID NOT NULL REFERENCES public.chatbot_flows(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES public.connections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Dados do contato
  contact_phone TEXT NOT NULL,
  contact_name TEXT,
  
  -- Estado da conversa
  current_node_id TEXT, -- ID do nó atual no fluxo
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned', 'transferred')),
  
  -- Variáveis da conversa (nome, email, etc)
  variables JSONB DEFAULT '{}'::jsonb,
  
  -- Histórico de nós visitados
  visited_nodes TEXT[] DEFAULT '{}',
  
  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_interaction_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Tabela de mensagens do chatbot
CREATE TABLE IF NOT EXISTS public.chatbot_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.chatbot_conversations(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES public.connections(id) ON DELETE CASCADE,
  
  -- Dados da mensagem
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_text TEXT,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'audio', 'document', 'button', 'list')),
  media_url TEXT,
  
  -- Nó que gerou/envio a mensagem
  node_id TEXT,
  node_type TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_chatbot_flows_user_id ON public.chatbot_flows(user_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_flows_connection_id ON public.chatbot_flows(connection_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_flows_trigger_campaign ON public.chatbot_flows(trigger_campaign_id) WHERE trigger_type = 'campaign_response';
CREATE INDEX IF NOT EXISTS idx_chatbot_flows_active ON public.chatbot_flows(user_id, is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_flow_id ON public.chatbot_conversations(flow_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_connection ON public.chatbot_conversations(connection_id, contact_phone);
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_active ON public.chatbot_conversations(flow_id, contact_phone, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_user_id ON public.chatbot_conversations(user_id);

CREATE INDEX IF NOT EXISTS idx_chatbot_messages_conversation ON public.chatbot_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_messages_connection ON public.chatbot_messages(connection_id, created_at);

-- Índice único parcial: uma conversa ativa por contato+fluxo+instância
CREATE UNIQUE INDEX IF NOT EXISTS idx_chatbot_conversations_active_unique 
  ON public.chatbot_conversations(flow_id, contact_phone, connection_id) 
  WHERE status = 'active';

-- RLS (Row Level Security)
ALTER TABLE public.chatbot_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_messages ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para chatbot_flows
DROP POLICY IF EXISTS "Users can view own flows" ON public.chatbot_flows;
CREATE POLICY "Users can view own flows" ON public.chatbot_flows
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own flows" ON public.chatbot_flows;
CREATE POLICY "Users can create own flows" ON public.chatbot_flows
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own flows" ON public.chatbot_flows;
CREATE POLICY "Users can update own flows" ON public.chatbot_flows
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own flows" ON public.chatbot_flows;
CREATE POLICY "Users can delete own flows" ON public.chatbot_flows
  FOR DELETE USING (auth.uid() = user_id);

-- Políticas RLS para chatbot_conversations
CREATE POLICY "Users can view own conversations" ON public.chatbot_conversations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own conversations" ON public.chatbot_conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations" ON public.chatbot_conversations
  FOR UPDATE USING (auth.uid() = user_id);

-- Políticas RLS para chatbot_messages
CREATE POLICY "Users can view own messages" ON public.chatbot_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.chatbot_conversations cc
      WHERE cc.id = chatbot_messages.conversation_id
      AND cc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own messages" ON public.chatbot_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chatbot_conversations cc
      WHERE cc.id = chatbot_messages.conversation_id
      AND cc.user_id = auth.uid()
    )
  );

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_chatbot_flows_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_chatbot_flows_updated_at
  BEFORE UPDATE ON public.chatbot_flows
  FOR EACH ROW
  EXECUTE FUNCTION update_chatbot_flows_updated_at();

-- Trigger para atualizar last_interaction_at
CREATE OR REPLACE FUNCTION update_chatbot_conversations_interaction()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_interaction_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_chatbot_conversations_interaction
  BEFORE UPDATE ON public.chatbot_conversations
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status OR OLD.current_node_id IS DISTINCT FROM NEW.current_node_id)
  EXECUTE FUNCTION update_chatbot_conversations_interaction();

-- Comentários
COMMENT ON TABLE public.chatbot_flows IS 'Fluxos de conversa automatizados (tipo Typebot)';
COMMENT ON TABLE public.chatbot_conversations IS 'Conversas ativas do chatbot';
COMMENT ON TABLE public.chatbot_messages IS 'Histórico de mensagens das conversas do chatbot';

COMMENT ON COLUMN public.chatbot_flows.flow_data IS 'Estrutura do fluxo em JSON: {nodes: [], edges: []}';
COMMENT ON COLUMN public.chatbot_flows.trigger_type IS 'Tipo de trigger: campaign_response, keyword, first_message, time_based, manual';
COMMENT ON COLUMN public.chatbot_conversations.variables IS 'Variáveis da conversa (nome, email, etc) em JSON';
COMMENT ON COLUMN public.chatbot_conversations.current_node_id IS 'ID do nó atual no fluxo sendo executado';

