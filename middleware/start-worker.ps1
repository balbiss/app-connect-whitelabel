# ============================================
# INICIAR WORKER DO MIDDLEWARE
# ============================================

Write-Host "🔄 Iniciando Worker do Middleware..." -ForegroundColor Cyan
Write-Host ""

# Verificar se .env existe
if (-not (Test-Path ".env")) {
    Write-Host "❌ Arquivo .env não encontrado!" -ForegroundColor Red
    Write-Host "💡 Copie .env.example para .env e configure as variáveis" -ForegroundColor Yellow
    exit 1
}

# Verificar se node_modules existe
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Instalando dependências..." -ForegroundColor Yellow
    npm install
    Write-Host ""
}

Write-Host "✅ Iniciando Worker..." -ForegroundColor Green
Write-Host "📊 Configuração: 5 jobs simultâneos, 10 mensagens/segundo" -ForegroundColor Cyan
Write-Host ""

# Iniciar worker
npm run worker

