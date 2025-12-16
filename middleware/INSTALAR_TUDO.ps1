# ============================================
# INSTALAÇÃO COMPLETA DO MIDDLEWARE
# ============================================

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "🚀 INSTALAÇÃO DO MIDDLEWARE" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se está na pasta correta
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Execute este script na pasta 'middleware'" -ForegroundColor Red
    exit 1
}

Write-Host "📋 Passo 1: Verificando arquivos..." -ForegroundColor Yellow

# Verificar se .env existe
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  Arquivo .env não encontrado. Criando..." -ForegroundColor Yellow
    
    # Ler .env.example se existir
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host "✅ Arquivo .env criado a partir do .env.example" -ForegroundColor Green
        Write-Host "⚠️  IMPORTANTE: Edite o arquivo .env com suas credenciais!" -ForegroundColor Yellow
    } else {
        Write-Host "❌ Arquivo .env.example não encontrado!" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✅ Arquivo .env encontrado" -ForegroundColor Green
}

Write-Host ""
Write-Host "📦 Passo 2: Instalando dependências..." -ForegroundColor Yellow

# Verificar se node_modules existe
if (Test-Path "node_modules") {
    Write-Host "⚠️  node_modules já existe. Reinstalando..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force "node_modules"
}

# Instalar dependências
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao instalar dependências!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Dependências instaladas com sucesso!" -ForegroundColor Green
Write-Host ""

Write-Host "📋 Passo 3: Verificando configurações..." -ForegroundColor Yellow

# Verificar se Redis está configurado
$envContent = Get-Content ".env" -Raw
if ($envContent -notmatch "REDIS_HOST") {
    Write-Host "⚠️  REDIS_HOST não configurado no .env" -ForegroundColor Yellow
}

if ($envContent -notmatch "SUPABASE_URL") {
    Write-Host "⚠️  SUPABASE_URL não configurado no .env" -ForegroundColor Yellow
}

if ($envContent -notmatch "WHATSAPP_API_URL") {
    Write-Host "⚠️  WHATSAPP_API_URL não configurado no .env" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "✅ INSTALAÇÃO CONCLUÍDA!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 Próximos passos:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Configure o arquivo .env com suas credenciais" -ForegroundColor White
Write-Host "2. Inicie o Redis (se ainda não estiver rodando):" -ForegroundColor White
Write-Host "   docker run -d -p 6379:6379 redis:7-alpine" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Inicie a API (terminal 1):" -ForegroundColor White
Write-Host "   .\start-api.ps1" -ForegroundColor Cyan
Write-Host "   ou: npm start" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. Inicie o Worker (terminal 2):" -ForegroundColor White
Write-Host "   .\start-worker.ps1" -ForegroundColor Cyan
Write-Host "   ou: npm run worker" -ForegroundColor Cyan
Write-Host ""
Write-Host "5. Teste a API:" -ForegroundColor White
Write-Host "   GET http://localhost:3000/api/messages/health" -ForegroundColor Cyan
Write-Host ""

