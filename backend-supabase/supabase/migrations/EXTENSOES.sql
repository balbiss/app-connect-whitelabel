-- ============================================
-- EXTENSÕES NECESSÁRIAS
-- ============================================

-- Extensão para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Extensão para HTTP requests (necessária para cron jobs)
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- Extensão para cron jobs (agendamento de tarefas)
-- Nota: No Supabase, pg_cron pode precisar ser habilitado manualmente no dashboard
-- Se der erro, habilite em: Settings > Database > Extensions > pg_cron
CREATE EXTENSION IF NOT EXISTS "pg_cron";





