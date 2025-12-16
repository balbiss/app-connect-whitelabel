# ============================================
# INICIAR API E WORKER JUNTOS
# ============================================

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "🚀 INICIANDO MIDDLEWARE COMPLETO" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se está na pasta correta
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Execute este script na pasta 'middleware'" -ForegroundColor Red
    exit 1
}

# Verificar se .env existe
if (-not (Test-Path ".env")) {
    Write-Host "❌ Arquivo .env não encontrado!" -ForegroundColor Red
    Write-Host "💡 Execute primeiro: .\INSTALAR_TUDO.ps1" -ForegroundColor Yellow
    exit 1
}

# Verificar se node_modules existe
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Instalando dependências..." -ForegroundColor Yellow
    npm install
    Write-Host ""
}

Write-Host "✅ Iniciando API e Worker em processos separados..." -ForegroundColor Green
Write-Host ""
Write-Host "📡 API: http://localhost:3000" -ForegroundColor Cyan
Write-Host "🔄 Worker: Processando fila..." -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 Para parar, pressione Ctrl+C" -ForegroundColor Yellow
Write-Host ""

# Iniciar API em background
$apiJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    npm start
}

# Iniciar Worker em background
$workerJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    npm run worker
}

# Aguardar jobs
try {
    Wait-Job -Job $apiJob, $workerJob
} catch {
    Write-Host "🛑 Parando serviços..." -ForegroundColor Yellow
    Stop-Job -Job $apiJob, $workerJob
    Remove-Job -Job $apiJob, $workerJob
}

