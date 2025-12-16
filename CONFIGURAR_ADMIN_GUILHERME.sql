-- ============================================
-- CONFIGURAR GUILHERME COMO ADMIN
-- ============================================
-- Execute este SQL no SQL Editor do Supabase
-- ============================================

-- 1. Garantir que o perfil existe e torná-lo admin
INSERT INTO public.profiles (id, email, name, is_admin, is_blocked, created_at, updated_at)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'name', 'Guilherme') as name,
  TRUE as is_admin,
  FALSE as is_blocked,
  u.created_at,
  NOW() as updated_at
FROM auth.users u
WHERE u.email = 'guilhermedigitalworld@gmail.com'
ON CONFLICT (id) DO UPDATE
SET 
  is_admin = TRUE,
  is_blocked = FALSE,
  updated_at = NOW();

-- 2. Atualizar diretamente (caso o usuário já tenha perfil)
UPDATE public.profiles
SET 
  is_admin = TRUE,
  is_blocked = FALSE,
  updated_at = NOW()
WHERE email = 'guilhermedigitalworld@gmail.com';

-- 3. Verificar resultado
SELECT 
  id,
  email,
  name,
  is_admin,
  is_blocked,
  created_at,
  updated_at
FROM public.profiles
WHERE email = 'guilhermedigitalworld@gmail.com';
