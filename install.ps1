# ============================================
# SCRIPT DE INSTALAÇÃO AUTOMÁTICA - WINDOWS
# APP CONNECT - WHITE LABEL
# ============================================

# Configurar encoding para UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Cores
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

# Banner
Write-Host ""
Write-ColorOutput Magenta "╔═══════════════════════════════════════════════════════╗"
Write-ColorOutput Magenta "║                                                       ║"
Write-ColorOutput Magenta "║          🚀 APP CONNECT - INSTALAÇÃO                 ║"
Write-ColorOutput Magenta "║              WHITE LABEL EDITION                      ║"
Write-ColorOutput Magenta "║                                                       ║"
Write-ColorOutput Magenta "╚═══════════════════════════════════════════════════════╝"
Write-Host ""

# ============================================
# VERIFICAR REQUISITOS
# ============================================
Write-ColorOutput Cyan "📋 Verificando requisitos..."

# Docker
try {
    docker --version | Out-Null
    Write-ColorOutput Green "✅ Docker instalado"
} catch {
    Write-ColorOutput Red "❌ Docker não está instalado!"
    Write-ColorOutput Yellow "Instale em: https://docs.docker.com/desktop/install/windows-install/"
    exit 1
}

# Docker Compose
try {
    docker-compose --version | Out-Null
    Write-ColorOutput Green "✅ Docker Compose instalado"
} catch {
    Write-ColorOutput Red "❌ Docker Compose não está instalado!"
    exit 1
}

Write-Host ""

# ============================================
# VERIFICAR ARQUIVO .env
# ============================================
Write-ColorOutput Cyan "📝 Verificando arquivo .env..."

if (-Not (Test-Path .env)) {
    Write-ColorOutput Yellow "⚠️  Arquivo .env não encontrado!"
    Write-ColorOutput Yellow "Criando a partir de .env.example..."
    Copy-Item .env.example .env
    Write-Host ""
    Write-ColorOutput Red "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    Write-ColorOutput Red "⚠️  IMPORTANTE: Configure o arquivo .env ANTES de continuar!"
    Write-ColorOutput Red "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    Write-Host ""
    Write-ColorOutput Yellow "Edite o arquivo .env e configure:"
    Write-Host "  1. DOMAIN - Seu domínio"
    Write-Host "  2. SUPABASE_URL - URL do seu projeto Supabase"
    Write-Host "  3. SUPABASE_ANON_KEY - Chave pública do Supabase"
    Write-Host "  4. ADMIN_EMAIL - Email do administrador"
    Write-Host ""
    Write-ColorOutput Yellow "Depois execute novamente: .\install.ps1"
    
    # Abrir .env no bloco de notas
    notepad .env
    exit 1
}

Write-ColorOutput Green "✅ Arquivo .env encontrado"

# Carregar variáveis do .env
Get-Content .env | ForEach-Object {
    if ($_ -match '^([^=]+)=(.*)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()
        [Environment]::SetEnvironmentVariable($key, $value, "Process")
    }
}

# Validar configurações obrigatórias
$SUPABASE_URL = [Environment]::GetEnvironmentVariable("SUPABASE_URL", "Process")
$SUPABASE_ANON_KEY = [Environment]::GetEnvironmentVariable("SUPABASE_ANON_KEY", "Process")
$DOMAIN = [Environment]::GetEnvironmentVariable("DOMAIN", "Process")

if ([string]::IsNullOrEmpty($SUPABASE_URL) -or $SUPABASE_URL -eq "https://seu-projeto.supabase.co") {
    Write-ColorOutput Red "❌ SUPABASE_URL não configurado!"
    Write-ColorOutput Yellow "Configure no arquivo .env"
    exit 1
}

if ([string]::IsNullOrEmpty($SUPABASE_ANON_KEY) -or $SUPABASE_ANON_KEY -like "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...") {
    Write-ColorOutput Red "❌ SUPABASE_ANON_KEY não configurado!"
    Write-ColorOutput Yellow "Configure no arquivo .env"
    exit 1
}

if ([string]::IsNullOrEmpty($DOMAIN) -or $DOMAIN -eq "connect.seudominio.com.br") {
    Write-ColorOutput Red "❌ DOMAIN não configurado!"
    Write-ColorOutput Yellow "Configure no arquivo .env"
    exit 1
}

Write-ColorOutput Green "✅ Configurações validadas"
Write-Host ""

# ============================================
# MOSTRAR CONFIGURAÇÕES
# ============================================
Write-ColorOutput Magenta "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-ColorOutput Magenta "📊 CONFIGURAÇÕES DO SISTEMA"
Write-ColorOutput Magenta "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host "🌐 Domínio: $DOMAIN"
Write-Host "📡 Supabase: $SUPABASE_URL"
Write-Host "📱 API WhatsApp: $($env:WHATSAPP_API_URL)"
Write-Host "👤 Admin: $($env:ADMIN_EMAIL)"
Write-ColorOutput Magenta "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host ""

# Confirmação
$confirm = Read-Host "Continuar com a instalação? [s/N]"
if ($confirm -ne 's' -and $confirm -ne 'S' -and $confirm -ne 'y' -and $confirm -ne 'Y') {
    Write-ColorOutput Red "Instalação cancelada."
    exit 0
}
Write-Host ""

# ============================================
# CRIAR PASTAS NECESSÁRIAS
# ============================================
Write-ColorOutput Cyan "📁 Criando estrutura de pastas..."

New-Item -ItemType Directory -Force -Path ssl | Out-Null
New-Item -ItemType Directory -Force -Path branding | Out-Null
New-Item -ItemType Directory -Force -Path data/postgres | Out-Null
New-Item -ItemType Directory -Force -Path logs | Out-Null

Write-ColorOutput Green "✅ Pastas criadas"
Write-Host ""

# ============================================
# BUILD DO FRONTEND
# ============================================
Write-ColorOutput Cyan "🔨 Fazendo build do frontend..."
Write-ColorOutput Yellow "(Isso pode levar 1-2 minutos)"
Write-Host ""

Set-Location frontend
npm install --legacy-peer-deps
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-ColorOutput Red "❌ Erro ao fazer build do frontend!"
    exit 1
}

Set-Location ..
Write-ColorOutput Green "✅ Build concluído"
Write-Host ""

# ============================================
# INICIAR CONTAINERS
# ============================================
Write-ColorOutput Cyan "🚀 Iniciando containers Docker..."
Write-Host ""

docker-compose down 2>$null  # Parar containers antigos
docker-compose up -d --build

if ($LASTEXITCODE -ne 0) {
    Write-ColorOutput Red "❌ Erro ao iniciar containers!"
    exit 1
}

Write-Host ""
Write-ColorOutput Green "✅ Containers iniciados com sucesso!"
Write-Host ""

# ============================================
# VERIFICAR STATUS
# ============================================
Write-ColorOutput Cyan "🔍 Verificando status dos containers..."
Start-Sleep -Seconds 3

docker-compose ps

Write-Host ""

# ============================================
# INSTRUÇÕES FINAIS
# ============================================
Write-ColorOutput Green "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-ColorOutput Green "🎉 INSTALAÇÃO CONCLUÍDA COM SUCESSO!"
Write-ColorOutput Green "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host ""
Write-ColorOutput Cyan "📋 PRÓXIMOS PASSOS:"
Write-Host ""
Write-ColorOutput Yellow "1. Configure o DNS do seu domínio:"
Write-Host "   - Tipo: A"
Write-Host "   - Nome: $DOMAIN"
Write-Host "   - Valor: SEU_IP_DO_SERVIDOR"
Write-Host ""
Write-ColorOutput Yellow "2. Execute os SQLs no Supabase:"
Write-Host "   .\install-database.ps1"
Write-Host ""
Write-ColorOutput Yellow "3. Acesse o sistema:"
Write-ColorOutput Cyan "   http://$DOMAIN"
Write-ColorOutput Cyan "   http://localhost"
Write-Host ""
Write-ColorOutput Yellow "4. Faça login com email de admin:"
Write-ColorOutput Cyan "   $($env:ADMIN_EMAIL)"
Write-Host ""
Write-ColorOutput Yellow "5. Configure o Mercado Pago:"
Write-Host "   - Acesse: Configurações > Pagamentos"
Write-Host "   - Adicione sua chave API do Mercado Pago"
Write-Host ""
Write-ColorOutput Magenta "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-ColorOutput Magenta "📚 DOCUMENTAÇÃO COMPLETA:"
Write-ColorOutput Cyan "   .\DOCUMENTACAO\"
Write-Host ""
Write-ColorOutput Magenta "🆘 SUPORTE:"
Write-ColorOutput Cyan "   Leia: TROUBLESHOOTING.md"
Write-ColorOutput Magenta "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host ""
Write-ColorOutput Green "✨ Sistema pronto para uso! Boa sorte! 🚀"
Write-Host ""

