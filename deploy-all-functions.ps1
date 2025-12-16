# ============================================
# SCRIPT PARA DEPLOYAR TODAS AS EDGE FUNCTIONS
# ============================================

Write-Host "🚀 Iniciando deploy de todas as Edge Functions..." -ForegroundColor Cyan
Write-Host ""

# Navegar para a pasta do backend
$backendPath = "C:\Users\inoov\Downloads\APP CONNECT DISPARO\blastwave-ai-10977-main\WHITELABEL APP CONNECT\backend-supabase"

if (-not (Test-Path $backendPath)) {
    Write-Host "❌ Pasta do backend não encontrada: $backendPath" -ForegroundColor Red
    exit 1
}

Set-Location $backendPath
Write-Host "📁 Pasta atual: $(Get-Location)" -ForegroundColor Yellow
Write-Host ""

# Lista de todas as funções
$functions = @(
    "whatsapp-chatbot",
    "whatsapp-proxy",
    "generate-mercado-pago-pix",
    "generate-mercado-pago-boleto",
    "generate-asaas-pix",
    "generate-asaas-boleto",
    "syncpay-create-pix",
    "syncpay-check-transaction",
    "syncpay-auth-token",
    "syncpay-webhook",
    "webhook-mercado-pago",
    "webhook-asaas",
    "send-billings",
    "execute-scheduled-disparos",
    "send-push-notification",
    "send-subscription-email",
    "check-expired-subscriptions",
    "delete-old-campaigns",
    "ativar-assinatura-manual",
    "generate-booking-payment",
    "cakto-webhook"
)

$successCount = 0
$errorCount = 0
$errors = @()

# Deploy de cada função
foreach ($func in $functions) {
    Write-Host "📦 Deployando $func..." -ForegroundColor Yellow
    
    # Verificar se a pasta da função existe
    $funcPath = Join-Path "supabase\functions" $func
    if (-not (Test-Path $funcPath)) {
        Write-Host "⚠️  Pasta não encontrada: $funcPath - Pulando..." -ForegroundColor Magenta
        continue
    }
    
    # Executar deploy
    $result = npx supabase functions deploy $func 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ $func deployado com sucesso!" -ForegroundColor Green
        $successCount++
    } else {
        Write-Host "❌ Erro ao deployar $func" -ForegroundColor Red
        Write-Host $result -ForegroundColor Red
        $errorCount++
        $errors += $func
    }
    Write-Host ""
}

# Resumo
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "📊 RESUMO DO DEPLOY" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "✅ Sucesso: $successCount" -ForegroundColor Green
Write-Host "❌ Erros: $errorCount" -ForegroundColor Red
Write-Host ""

if ($errors.Count -gt 0) {
    Write-Host "⚠️  Funções com erro:" -ForegroundColor Yellow
    foreach ($err in $errors) {
        Write-Host "   - $err" -ForegroundColor Red
    }
    Write-Host ""
}

if ($errorCount -eq 0) {
    Write-Host "🎉 Todas as funções foram deployadas com sucesso!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Algumas funções falharam. Verifique os erros acima." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "💡 Dica: Verifique as funções no painel do Supabase:" -ForegroundColor Cyan
Write-Host "   https://supabase.com/dashboard/project/oxpcmdejlcmsopjbqncf/functions" -ForegroundColor Cyan

