# 🔧 CORRIGIR ERRO 403 NO PAINEL ADMIN

## ❌ Problema

Ao tentar atualizar um perfil no painel administrativo, aparece o erro:
- `403 (Forbidden)` ao fazer PATCH em `/rest/v1/profiles`
- `new row violates row-level security policy for table "notifications"`

## ✅ Solução

Execute este SQL no **SQL Editor do Supabase**:

### 1. Acessar SQL Editor

1. Acesse: https://supabase.com/dashboard/project/oxpcmdejlcmsopjbqncf/sql
2. Clique em **"New query"**

### 2. Copiar e Colar este SQL:

```sql
-- ============================================
-- CORRIGIR RLS PARA PERMITIR ADMINS ATUALIZAREM PERFIS
-- ============================================

-- 1. Garantir que a função is_admin_user existe e está correta
CREATE OR REPLACE FUNCTION is_admin_user(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_is_admin BOOLEAN;
BEGIN
  SELECT COALESCE(is_admin, false) INTO user_is_admin
  FROM public.profiles
  WHERE id = user_id;
  
  RETURN COALESCE(user_is_admin, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

-- 5. Corrigir RLS para notificações (permitir admins criarem notificações)
DROP POLICY IF EXISTS "Users can insert own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can insert notifications" ON public.notifications;

-- Criar política para usuários inserirem suas próprias notificações
CREATE POLICY "Users can insert own notifications" ON public.notifications
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Criar política para admins inserirem notificações para qualquer usuário
CREATE POLICY "Admins can insert notifications" ON public.notifications
  FOR INSERT 
  WITH CHECK (is_admin_user(auth.uid()));
```

### 3. Executar

1. Clique em **"Run"** (ou pressione `Ctrl+Enter`)
2. Aguarde a confirmação de sucesso

### 4. Testar

1. Volte para o painel admin: https://connect.visitaia.com.br/admin
2. Tente editar um perfil novamente
3. O erro 403 não deve mais aparecer

---

## ✅ PRONTO!

Após executar o SQL, o painel administrativo deve funcionar corretamente!

