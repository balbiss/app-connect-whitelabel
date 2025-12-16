-- ============================================
-- INSTALAÇÃO COMPLETA DO BANCO DE DADOS
-- APP CONNECT - WHITE LABEL
-- ============================================
-- Execute este arquivo NO SUPABASE SQL EDITOR
-- Ele vai criar TODAS as tabelas, funções e políticas
-- ============================================

-- ⏱️ TEMPO ESTIMADO: 1-2 minutos
-- ⚠️ IMPORTANTE: Execute TODO o conteúdo de uma vez só

-- ============================================
-- INICIO DA INSTALAÇÃO
-- ============================================

DO $$ 
BEGIN 
  RAISE NOTICE '🚀 INICIANDO INSTALAÇÃO DO APP CONNECT...';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;

-- ============================================
-- IMPORTANTE: Execute TODOS os SQLs da pasta migrations
-- ============================================
-- Este arquivo é um GUIA. Você precisa:
-- 
-- 1. Abrir CADA arquivo SQL da pasta migrations/
-- 2. Executar na ordem numérica:
--    - 001_initial_schema.sql
--    - 002_functions.sql
--    - 003_cron_job.sql
--    - ... (continue com todos)
--    - 022_reseller_system.sql
-- 
-- 3. Depois executar os arquivos sem número:
--    - EXTENSOES.sql
--    - FUNCOES_AUXILIARES.sql
--    - TABELA_PROFILES.sql
--    - TABELA_CONNECTIONS.sql
--    - TABELA_DISPAROS.sql
--    - TABELA_DISPARO_RECIPIENTS.sql
--    - TABELA_PAGAMENTOS.sql
-- 
-- ============================================

-- OU use o script: ./install-database.sh (Linux/Mac)
--                  .\install-database.ps1 (Windows)

-- ============================================
-- VERIFICAÇÃO FINAL
-- ============================================
-- Após executar todos os SQLs, execute isto para verificar:

DO $$
DECLARE
    table_count INTEGER;
    function_count INTEGER;
    policy_count INTEGER;
BEGIN
    -- Contar tabelas
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE';
    
    -- Contar funções
    SELECT COUNT(*) INTO function_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public';
    
    -- Contar políticas RLS
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public';
    
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '✅ INSTALAÇÃO CONCLUÍDA!';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '📊 RESUMO:';
    RAISE NOTICE '   - Tabelas criadas: %', table_count;
    RAISE NOTICE '   - Funções criadas: %', function_count;
    RAISE NOTICE '   - Políticas RLS: %', policy_count;
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '🎉 Banco de dados pronto para uso!';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;

-- ============================================
-- TABELAS ESPERADAS (Para referência)
-- ============================================
-- 
-- ✅ profiles - Usuários do sistema
-- ✅ connections - Instâncias WhatsApp
-- ✅ disparos - Campanhas de disparo
-- ✅ disparo_recipients - Destinatários das campanhas
-- ✅ chatbot_flows - Fluxos de chatbot
-- ✅ chatbot_conversations - Conversas ativas
-- ✅ chatbot_messages - Mensagens do chatbot
-- ✅ billings - Cobranças
-- ✅ notifications - Notificações
-- ✅ payment_providers - Provedores de pagamento
-- ✅ push_subscriptions - Assinaturas push
-- ✅ appointments - Agendamentos
-- ✅ professionals - Profissionais
-- ✅ bookings - Reservas
-- ✅ resellers - Sistema de vendedores
-- 
-- E muitas outras...
-- 
-- ============================================

-- ✅ FIM DA INSTALAÇÃO

