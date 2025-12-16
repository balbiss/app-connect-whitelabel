# 👑 CONFIGURAR GUILHERME COMO ADMIN

## 📋 PASSO A PASSO

### 1. Acessar SQL Editor do Supabase

1. Acesse: https://supabase.com/dashboard/project/oxpcmdejlcmsopjbqncf
2. No menu lateral, clique em **"SQL Editor"**
3. Clique em **"New query"**

### 2. Executar o SQL

Copie e cole este SQL:

```sql
-- Configurar guilhermedigitalworld@gmail.com como ADMIN
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

-- Atualizar diretamente (caso o usuário já tenha perfil)
UPDATE public.profiles
SET 
  is_admin = TRUE,
  is_blocked = FALSE,
  updated_at = NOW()
WHERE email = 'guilhermedigitalworld@gmail.com';

-- Verificar resultado
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
```

### 3. Executar

1. Clique em **"Run"** (ou pressione `Ctrl+Enter`)
2. Verifique o resultado na aba "Results"

### 4. Verificar

Você deve ver:
- `is_admin: true`
- `is_blocked: false`
- Email: `guilhermedigitalworld@gmail.com`

---

## ⚠️ IMPORTANTE

**Se o usuário ainda não existe:**
- O usuário precisa fazer login pelo menos uma vez em `connect.visitaia.com.br`
- Depois disso, execute o SQL novamente

---

## ✅ PRONTO!

Após executar o SQL, o Guilherme terá acesso ao painel administrativo em:
- **URL:** `https://connect.visitaia.com.br/admin`
- **Ou:** Menu Settings → "Painel Administrativo"

