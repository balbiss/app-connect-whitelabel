# ============================================
# GERAR SQL COMPLETO - TODAS AS MIGRAÇÕES
# ============================================
# Este script cria um arquivo SQL único com
# TODAS as migrações na ordem correta
# ============================================

Write-Host ""
Write-Host "Gerando arquivo SQL completo..." -ForegroundColor Cyan
Write-Host ""

$migrationsPath = "backend-supabase\supabase\migrations"
$outputFile = "INSTALACAO_COMPLETA.sql"

# Ordem de execução dos arquivos SQL
# IMPORTANTE: Primeiro criar as tabelas, depois as funções que as usam
$sqlFiles = @(
    "EXTENSOES.sql",
    "TABELA_PROFILES.sql",
    "TABELA_CONNECTIONS.sql",
    "TABELA_DISPAROS.sql",
    "TABELA_DISPARO_RECIPIENTS.sql",
    "TABELA_PAGAMENTOS.sql",
    "FUNCOES_AUXILIARES.sql",  # Movido para depois das tabelas
    "001_initial_schema.sql",
    "002_functions.sql",
    "003_cron_job.sql",
    "004_add_ai_config.sql",
    "004_plans_and_limits.sql",
    "005_add_settings_to_profiles.sql",
    "005_fix_profiles_rls.sql",
    "006_admin_system.sql",
    "007_fix_rls_recursion.sql",
    "009_plano_teste.sql",
    "010_delete_old_campaigns.sql",
    "011_billing_system.sql",
    "012_notifications_system.sql",
    "013_improve_notifications.sql",
    "013_mercado_pago_integration.sql",
    "014_multi_payment_providers.sql",
    "015_add_boleto_support.sql",
    "015_add_payment_type.sql",
    "016_appointment_system.sql",
    "016_booking_system.sql",
    "017_professionals_and_schedule.sql",
    "017_syncpay_transactions.sql",
    "018_fix_professional_id_fk.sql",
    "018_push_subscriptions.sql",
    "019_appointment_schedule_config.sql",
    "019_push_on_campaign_completed.sql",
    "020_appointment_message_templates.sql",
    "020_chatbot_flows.sql",
    "021_appointment_default_connection.sql",
    "022_reseller_system.sql",
    "CRON_CHECK_SUBSCRIPTIONS.sql"
)

# Cabeçalho do arquivo
$header = @'
-- ============================================
-- INSTALACAO COMPLETA DO BANCO DE DADOS
-- APP CONNECT - WHITE LABEL
-- ============================================
-- Execute este arquivo NO SUPABASE SQL EDITOR
-- Ele vai criar TODAS as tabelas, funcoes e politicas
-- ============================================
-- TEMPO ESTIMADO: 1-2 minutos
-- IMPORTANTE: Execute TODO o conteudo de uma vez so
-- ============================================

DO $$ 
BEGIN 
  RAISE NOTICE 'INICIANDO INSTALACAO DO APP CONNECT...';
  RAISE NOTICE '------------------------------------------------------------';
END $$;

'@

# Rodapé do arquivo
$footer = @'

-- ============================================
-- VERIFICACAO FINAL
-- ============================================

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
    
    -- Contar funcoes
    SELECT COUNT(*) INTO function_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public';
    
    -- Contar politicas RLS
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public';
    
    RAISE NOTICE '------------------------------------------------------------';
    RAISE NOTICE 'INSTALACAO CONCLUIDA!';
    RAISE NOTICE '------------------------------------------------------------';
    RAISE NOTICE 'RESUMO:';
    RAISE NOTICE '   - Tabelas criadas: %', table_count;
    RAISE NOTICE '   - Funcoes criadas: %', function_count;
    RAISE NOTICE '   - Politicas RLS: %', policy_count;
    RAISE NOTICE '------------------------------------------------------------';
    RAISE NOTICE 'Banco de dados pronto para uso!';
    RAISE NOTICE '------------------------------------------------------------';
END $$;

-- FIM DA INSTALACAO

'@

# Iniciar arquivo de saída
$header | Out-File -FilePath $outputFile -Encoding UTF8

$processed = 0
$errors = 0

foreach ($file in $sqlFiles) {
    $filePath = Join-Path $migrationsPath $file
    
    if (Test-Path $filePath) {
        Write-Host "   [OK] Processando: $file" -ForegroundColor Green
        
        # Adicionar comentário de separação
        "`n-- ============================================" | Out-File -FilePath $outputFile -Encoding UTF8 -Append
        "-- Arquivo: $file" | Out-File -FilePath $outputFile -Encoding UTF8 -Append
        "-- ============================================" | Out-File -FilePath $outputFile -Encoding UTF8 -Append
        "`n" | Out-File -FilePath $outputFile -Encoding UTF8 -Append
        
        # Ler e adicionar conteúdo do arquivo
        Get-Content $filePath -Encoding UTF8 | Out-File -FilePath $outputFile -Encoding UTF8 -Append
        
        $processed++
    } else {
        Write-Host "   [AVISO] Arquivo nao encontrado: $file" -ForegroundColor Yellow
        $errors++
    }
}

# Adicionar rodapé
$footer | Out-File -FilePath $outputFile -Encoding UTF8 -Append

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "[OK] ARQUIVO GERADO COM SUCESSO!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Arquivo criado: $outputFile" -ForegroundColor White
Write-Host "   Processados: $processed arquivos" -ForegroundColor Gray
if ($errors -gt 0) {
    Write-Host "   Avisos: $errors arquivos nao encontrados" -ForegroundColor Yellow
}
Write-Host ""
Write-Host "PROXIMO PASSO:" -ForegroundColor Yellow
Write-Host "   1. Abra o arquivo: $outputFile" -ForegroundColor White
Write-Host "   2. Copie TODO o conteudo" -ForegroundColor White
Write-Host "   3. Cole no SQL Editor do Supabase" -ForegroundColor White
Write-Host "   4. Clique em 'Run' (ou Ctrl+Enter)" -ForegroundColor White
Write-Host "   5. Aguarde a mensagem de sucesso!" -ForegroundColor White
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

