# ============================================
# SCRIPT DE INSTALAÇÃO PARA CLIENTE
# APP CONNECT - WHITE LABEL
# ============================================
# Este script automatiza a instalação do sistema
# Execute: .\INSTALAR_CLIENTE.ps1
# ============================================

Write-Host ""
Write-Host "🚀 INSTALAÇÃO DO APP CONNECT - WHITE LABEL" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se está na pasta correta
if (-not (Test-Path "docker-compose.yml")) {
    Write-Host "❌ ERRO: Execute este script na pasta 'WHITELABEL APP CONNECT'" -ForegroundColor Red
    Write-Host "   Pasta atual: $(Get-Location)" -ForegroundColor Yellow
    exit 1
}

# ============================================
# PASSO 1: CONFIGURAR .env
# ============================================
Write-Host "📝 PASSO 1: Configurando arquivo .env..." -ForegroundColor Yellow
Write-Host ""

if (-not (Test-Path ".env")) {
    Write-Host "   Criando arquivo .env a partir do template..." -ForegroundColor Gray
    Copy-Item -Path "env.template" -Destination ".env"
    Write-Host "   ✅ Arquivo .env criado!" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Arquivo .env já existe. Pulando criação." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "   ⚠️  IMPORTANTE: Edite o arquivo .env e preencha:" -ForegroundColor Yellow
Write-Host "      - SUPABASE_URL" -ForegroundColor Gray
Write-Host "      - SUPABASE_ANON_KEY" -ForegroundColor Gray
Write-Host "      - SUPABASE_SERVICE_ROLE_KEY" -ForegroundColor Gray
Write-Host "      - ADMIN_EMAIL" -ForegroundColor Gray
Write-Host "      - DOMAIN" -ForegroundColor Gray
Write-Host ""

$continuar = Read-Host "   Pressione ENTER quando tiver preenchido o .env (ou 's' para pular)"

# ============================================
# PASSO 2: CONFIGURAR FRONTEND
# ============================================
Write-Host ""
Write-Host "📝 PASSO 2: Configurando frontend..." -ForegroundColor Yellow
Write-Host ""

if (-not (Test-Path "frontend\.env")) {
    Write-Host "   Criando arquivo frontend/.env..." -ForegroundColor Gray
    
    # Ler valores do .env principal
    $envContent = Get-Content ".env" -Raw
    $supabaseUrl = ""
    $supabaseAnonKey = ""
    
    if ($envContent -match "SUPABASE_URL=(.+)") {
        $supabaseUrl = $matches[1].Trim()
    }
    if ($envContent -match "SUPABASE_ANON_KEY=(.+)") {
        $supabaseAnonKey = $matches[1].Trim()
    }
    
    if ($supabaseUrl -and $supabaseAnonKey) {
        $frontendEnv = @"
VITE_SUPABASE_URL=$supabaseUrl
VITE_SUPABASE_ANON_KEY=$supabaseAnonKey
"@
        $frontendEnv | Out-File -FilePath "frontend\.env" -Encoding UTF8
        Write-Host "   ✅ Arquivo frontend/.env criado automaticamente!" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Não foi possível ler as credenciais do .env principal." -ForegroundColor Yellow
        Write-Host "   Crie manualmente o arquivo frontend/.env com:" -ForegroundColor Yellow
        Write-Host "      VITE_SUPABASE_URL=..." -ForegroundColor Gray
        Write-Host "      VITE_SUPABASE_ANON_KEY=..." -ForegroundColor Gray
    }
} else {
    Write-Host "   ⚠️  Arquivo frontend/.env já existe. Pulando criação." -ForegroundColor Yellow
}

# ============================================
# PASSO 3: INSTALAR DEPENDÊNCIAS
# ============================================
Write-Host ""
Write-Host "📦 PASSO 3: Instalando dependências do frontend..." -ForegroundColor Yellow
Write-Host ""

Set-Location "frontend"

if (-not (Test-Path "node_modules")) {
    Write-Host "   Executando: npm install..." -ForegroundColor Gray
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   ❌ Erro ao instalar dependências!" -ForegroundColor Red
        Set-Location ..
        exit 1
    }
    Write-Host "   ✅ Dependências instaladas!" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  node_modules já existe. Pulando instalação." -ForegroundColor Yellow
}

# ============================================
# PASSO 4: BUILD DO FRONTEND
# ============================================
Write-Host ""
Write-Host "🔨 PASSO 4: Fazendo build do frontend..." -ForegroundColor Yellow
Write-Host ""

Write-Host "   Executando: npm run build..." -ForegroundColor Gray
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "   ❌ Erro ao fazer build!" -ForegroundColor Red
    Set-Location ..
    exit 1
}
Write-Host "   ✅ Build concluído!" -ForegroundColor Green

Set-Location ..

# ============================================
# PASSO 5: VERIFICAR DOCKER
# ============================================
Write-Host ""
Write-Host "🐳 PASSO 5: Verificando Docker..." -ForegroundColor Yellow
Write-Host ""

$dockerInstalled = Get-Command docker -ErrorAction SilentlyContinue
if (-not $dockerInstalled) {
    Write-Host "   ❌ Docker não está instalado!" -ForegroundColor Red
    Write-Host "   Instale o Docker Desktop: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    exit 1
}

$dockerRunning = docker ps 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "   ❌ Docker não está rodando!" -ForegroundColor Red
    Write-Host "   Inicie o Docker Desktop e tente novamente." -ForegroundColor Yellow
    exit 1
}

Write-Host "   ✅ Docker está instalado e rodando!" -ForegroundColor Green

# ============================================
# PASSO 6: SUBIR O SISTEMA
# ============================================
Write-Host ""
Write-Host "🚀 PASSO 6: Subindo o sistema com Docker..." -ForegroundColor Yellow
Write-Host ""

Write-Host "   ⚠️  IMPORTANTE: Antes de continuar, certifique-se de que:" -ForegroundColor Yellow
Write-Host "      1. Você executou TODAS as migrações SQL no Supabase" -ForegroundColor Gray
Write-Host "      2. O arquivo .env está preenchido corretamente" -ForegroundColor Gray
Write-Host "      3. O arquivo frontend/.env está preenchido corretamente" -ForegroundColor Gray
Write-Host ""

$continuar = Read-Host "   Pressione ENTER para continuar (ou Ctrl+C para cancelar)"

Write-Host ""
Write-Host "   Executando: docker-compose up -d..." -ForegroundColor Gray
docker-compose up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "   ❌ Erro ao subir o sistema!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "   ✅ Sistema iniciado com sucesso!" -ForegroundColor Green

# ============================================
# RESUMO FINAL
# ============================================
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "✅ INSTALAÇÃO CONCLUÍDA!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 PRÓXIMOS PASSOS:" -ForegroundColor Yellow
Write-Host ""
Write-Host "   1. Acesse o sistema: http://localhost" -ForegroundColor White
Write-Host "   2. Crie a primeira conta (use o email configurado em ADMIN_EMAIL)" -ForegroundColor White
Write-Host "   3. O primeiro usuário será automaticamente admin" -ForegroundColor White
Write-Host ""
Write-Host "📚 COMANDOS ÚTEIS:" -ForegroundColor Yellow
Write-Host ""
Write-Host "   Ver logs:           docker-compose logs -f" -ForegroundColor Gray
Write-Host "   Parar sistema:     docker-compose down" -ForegroundColor Gray
Write-Host "   Reiniciar:         docker-compose restart" -ForegroundColor Gray
Write-Host "   Ver status:        docker-compose ps" -ForegroundColor Gray
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

