# ============================================
# INICIAR API DO MIDDLEWARE
# ============================================

Write-Host "🚀 Iniciando API do Middleware..." -ForegroundColor Cyan
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

Write-Host "✅ Iniciando servidor na porta 3000..." -ForegroundColor Green
Write-Host ""

# Iniciar servidor
npm start

