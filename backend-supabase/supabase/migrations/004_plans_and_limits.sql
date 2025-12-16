-- Atualizar perfis existentes com limites corretos
UPDATE public.profiles
SET max_connections = CASE
  WHEN plan = 'free' THEN 1
  WHEN plan = 'pro' THEN 2
  WHEN plan = 'super_pro' THEN 4
  ELSE 1
END
WHERE max_connections IS NULL OR max_connections = 1;

-- Função para obter limite de conexões do usuário
CREATE OR REPLACE FUNCTION get_user_connection_limit(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  user_limit INTEGER;
BEGIN
  SELECT max_connections INTO user_limit
  FROM public.profiles
  WHERE id = user_uuid;
  
  RETURN COALESCE(user_limit, 1);
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

-- View para verificar se usuário pode criar mais conexões
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





