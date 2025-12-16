# ============================================
# CONFIGURAR GUILHERME COMO ADMIN
# ============================================

$supabaseUrl = "https://oxpcmdejlcmsopjbqncf.supabase.co"
$serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94cGNtZGVqbGNtc29wamJxbmNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTgzNjk2MywiZXhwIjoyMDgxNDEyOTYzfQ.J6Xt-8mAdWB4rTJunEK8jPvNFD73MlL5wL9SPXx_vCU"
$adminEmail = "guilhermedigitalworld@gmail.com"

Write-Host "🔧 Configurando $adminEmail como ADMIN..." -ForegroundColor Cyan
Write-Host ""

# 1. Buscar o usuário pelo email
Write-Host "📋 Buscando usuário..." -ForegroundColor Yellow
$headers = @{
    "apikey" = $serviceRoleKey
    "Authorization" = "Bearer $serviceRoleKey"
    "Content-Type" = "application/json"
}

try {
    # Buscar usuário no auth.users
    $userResponse = Invoke-RestMethod -Uri "$supabaseUrl/auth/v1/admin/users?email=$adminEmail" -Method Get -Headers $headers
    
    if ($userResponse.users.Count -eq 0) {
        Write-Host "⚠️  Usuário não encontrado em auth.users" -ForegroundColor Yellow
        Write-Host "💡 O usuário precisa fazer login pelo menos uma vez primeiro" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "📝 Execute este SQL no SQL Editor do Supabase:" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "UPDATE public.profiles SET is_admin = TRUE, is_blocked = FALSE WHERE email = '$adminEmail';" -ForegroundColor White
        exit 1
    }
    
    $userId = $userResponse.users[0].id
    Write-Host "✅ Usuário encontrado: $userId" -ForegroundColor Green
    
    # 2. Atualizar o perfil para admin
    Write-Host ""
    Write-Host "👑 Configurando como ADMIN..." -ForegroundColor Yellow
    
    $updateBody = @{
        is_admin = $true
        is_blocked = $false
    } | ConvertTo-Json
    
    $updateResponse = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/profiles?id=eq.$userId" -Method PATCH -Headers $headers -Body $updateBody
    
    Write-Host "✅ Perfil atualizado com sucesso!" -ForegroundColor Green
    
    # 3. Verificar resultado
    Write-Host ""
    Write-Host "🔍 Verificando resultado..." -ForegroundColor Yellow
    $verifyResponse = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/profiles?id=eq.$userId&select=id,email,name,is_admin,is_blocked" -Method Get -Headers $headers
    
    if ($verifyResponse.Count -gt 0) {
        $profile = $verifyResponse[0]
        Write-Host ""
        Write-Host "============================================" -ForegroundColor Cyan
        Write-Host "📊 RESULTADO" -ForegroundColor Cyan
        Write-Host "============================================" -ForegroundColor Cyan
        Write-Host "ID: $($profile.id)" -ForegroundColor White
        Write-Host "Email: $($profile.email)" -ForegroundColor White
        Write-Host "Nome: $($profile.name)" -ForegroundColor White
        Write-Host "Admin: $($profile.is_admin)" -ForegroundColor $(if ($profile.is_admin) { "Green" } else { "Red" })
        Write-Host "Bloqueado: $($profile.is_blocked)" -ForegroundColor White
        Write-Host ""
        
        if ($profile.is_admin) {
            Write-Host "🎉 SUCESSO! $adminEmail está configurado como ADMIN!" -ForegroundColor Green
            Write-Host ""
            Write-Host "💡 O usuário pode acessar o painel admin em:" -ForegroundColor Cyan
            Write-Host "   https://connect.visitaia.com.br/admin" -ForegroundColor White
        } else {
            Write-Host "⚠️  ATENÇÃO: is_admin ainda está false" -ForegroundColor Yellow
        }
    }
    
} catch {
    Write-Host "❌ Erro: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Tente executar o SQL diretamente no Supabase:" -ForegroundColor Cyan
    Write-Host "   UPDATE public.profiles SET is_admin = TRUE WHERE email = '$adminEmail';" -ForegroundColor White
}

