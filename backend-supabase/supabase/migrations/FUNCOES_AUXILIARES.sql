-- ============================================
-- FUNÇÕES AUXILIARES
-- ============================================

-- Função para incrementar contador de enviados
CREATE OR REPLACE FUNCTION increment_disparo_sent(disparo_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.disparos
  SET 
    sent_count = sent_count + 1,
    pending_count = GREATEST(0, pending_count - 1),
    updated_at = NOW()
  WHERE id = disparo_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para incrementar contador de falhas
CREATE OR REPLACE FUNCTION increment_disparo_failed(disparo_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.disparos
  SET 
    failed_count = failed_count + 1,
    pending_count = GREATEST(0, pending_count - 1),
    updated_at = NOW()
  WHERE id = disparo_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para incrementar contador de entregues
CREATE OR REPLACE FUNCTION increment_disparo_delivered(disparo_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.disparos
  SET 
    delivered_count = delivered_count + 1,
    updated_at = NOW()
  WHERE id = disparo_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter limite de conexões do usuário
CREATE OR REPLACE FUNCTION get_user_connection_limit(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  user_limit INTEGER;
BEGIN
  SELECT max_connections INTO user_limit
  FROM public.profiles
  WHERE id = user_uuid;
  
  RETURN COALESCE(user_limit, 2); -- Padrão: 2 (pro)
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para contar conexões ativas do usuário
CREATE OR REPLACE FUNCTION count_user_connections(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  conn_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO conn_count
  FROM public.connections
  WHERE user_id = user_uuid;
  
  RETURN COALESCE(conn_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View para verificar status de conexões do usuário
CREATE OR REPLACE VIEW user_connection_status AS
SELECT 
  p.id as user_id,
  p.plan,
  p.max_connections,
  COUNT(c.id) as current_connections,
  (p.max_connections - COUNT(c.id)) as remaining_connections,
  CASE 
    WHEN COUNT(c.id) < p.max_connections THEN true
    ELSE false
  END as can_create_connection
FROM public.profiles p
LEFT JOIN public.connections c ON c.user_id = p.id
GROUP BY p.id, p.plan, p.max_connections;





