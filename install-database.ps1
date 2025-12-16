# ============================================
# SCRIPT DE INSTALAÇÃO DO BANCO DE DADOS
# APP CONNECT - WHITE LABEL (Windows)
# ============================================

# Configurar encoding
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Banner
Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║                                                       ║" -ForegroundColor Magenta
Write-Host "║     🗄️  INSTALAÇÃO DO BANCO DE DADOS                  ║" -ForegroundColor Magenta
Write-Host "║              (Supabase)                               ║" -ForegroundColor Magenta
Write-Host "║                                                       ║" -ForegroundColor Magenta
Write-Host "╚═══════════════════════════════════════════════════════╝" -ForegroundColor Magenta
Write-Host ""

# Verificar .env
if (-Not (Test-Path .env)) {
    Write-Host "❌ Arquivo .env não encontrado!" -ForegroundColor Red
    Write-Host "Execute primeiro: .\install.ps1" -ForegroundColor Yellow
    exit 1
}

Write-Host "📊 INSTRUÇÕES PARA INSTALAÇÃO DO BANCO" -ForegroundColor Cyan
Write-Host ""
Write-Host "Este script vai te guiar para executar os SQLs no Supabase." -ForegroundColor Yellow
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Magenta
Write-Host ""

# ============================================
# INSTRUÇÕES MANUAL
# ============================================
Write-Host "📋 PASSO A PASSO:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Acesse: " -ForegroundColor White -NoNewline
Write-Host "https://app.supabase.com" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Selecione seu projeto" -ForegroundColor White
Write-Host ""
Write-Host "3. Vá em: " -ForegroundColor White -NoNewline
Write-Host "SQL Editor" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. Clique em " -ForegroundColor White -NoNewline
Write-Host "+ New Query" -ForegroundColor Cyan
Write-Host ""
Write-Host "5. Copie e cole o conteúdo do arquivo:" -ForegroundColor White
Write-Host "   .\backend-supabase\migrations\install-all.sql" -ForegroundColor Yellow
Write-Host ""
Write-Host "6. Clique em " -ForegroundColor White -NoNewline
Write-Host "Run" -ForegroundColor Cyan -NoNewline
Write-Host " (ou pressione Ctrl+Enter)" -ForegroundColor White
Write-Host ""
Write-Host "7. Aguarde a execução (pode levar 1-2 minutos)" -ForegroundColor White
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Magenta
Write-Host ""

# Abrir arquivo SQL
$sqlFile = ".\backend-supabase\migrations\install-all.sql"

if (Test-Path $sqlFile) {
    Write-Host "📝 Arquivo SQL:" -ForegroundColor Cyan
    Write-Host "   $((Get-Item $sqlFile).FullName)" -ForegroundColor Yellow
    Write-Host ""
    
    $open = Read-Host "Deseja abrir o arquivo SQL agora? [s/N]"
    if ($open -eq 's' -or $open -eq 'S' -or $open -eq 'y' -or $open -eq 'Y') {
        notepad $sqlFile
    }
} else {
    Write-Host "❌ Arquivo SQL não encontrado: $sqlFile" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Após executar os SQLs no Supabase, o banco estará pronto!" -ForegroundColor Green
Write-Host ""
Write-Host "Próximo passo: Acesse o sistema e faça login!" -ForegroundColor Cyan
Write-Host ""

