# Executar SQL para corrigir RLS
$supabaseUrl = "https://oxpcmdejlcmsopjbqncf.supabase.co"
$serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94cGNtZGVqbGNtc29wamJxbmNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTgzNjk2MywiZXhwIjoyMDgxNDEyOTYzfQ.J6Xt-8mAdWB4rTJunEK8jPvNFD73MlL5wL9SPXx_vCU"

$sql = @"
-- 1. Garantir que a função is_admin_user existe e está correta
CREATE OR REPLACE FUNCTION is_admin_user(user_id UUID)
RETURNS BOOLEAN AS `$`$`$
DECLARE
  user_is_admin BOOLEAN;
BEGIN
  SELECT COALESCE(is_admin, false) INTO user_is_admin
  FROM public.profiles
  WHERE id = user_id;
  
  RETURN COALESCE(user_is_admin, false);
END;
`$`$`$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Remover políticas conflitantes de UPDATE
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- 3. Recriar política para usuários atualizarem seu próprio perfil (com WITH CHECK)
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 4. Recriar política para admins atualizarem todos os perfis (com WITH CHECK)
CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE 
  USING (
    auth.uid() = id OR 
    is_admin_user(auth.uid())
  )
  WITH CHECK (
    auth.uid() = id OR 
    is_admin_user(auth.uid())
  );

-- 5. Corrigir RLS para notificações
DROP POLICY IF EXISTS "Users can insert own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can insert notifications" ON public.notifications;

CREATE POLICY "Users can insert own notifications" ON public.notifications
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can insert notifications" ON public.notifications
  FOR INSERT 
  WITH CHECK (is_admin_user(auth.uid()));
"@

$headers = @{
    "apikey" = $serviceRoleKey
    "Authorization" = "Bearer $serviceRoleKey"
    "Content-Type" = "application/json"
}

$body = @{
    query = $sql
} | ConvertTo-Json

Write-Host "Executando SQL para corrigir RLS..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/rpc/exec_sql" -Method Post -Headers $headers -Body $body
    Write-Host "SQL executado com sucesso!" -ForegroundColor Green
} catch {
    Write-Host "Erro ao executar via RPC. Execute o SQL diretamente no Supabase SQL Editor." -ForegroundColor Red
    Write-Host ""
    Write-Host "Acesse: https://supabase.com/dashboard/project/oxpcmdejlcmsopjbqncf/sql" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "SQL para copiar:" -ForegroundColor Yellow
    Write-Host $sql
}

