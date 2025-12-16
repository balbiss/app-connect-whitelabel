# 🔐 COMO HABILITAR LOGIN COM GOOGLE NO SUPABASE

## ❌ Problema

Erro ao tentar fazer login com Google:
- `400 Bad Request`
- `Unsupported provider: provider is not enabled`

## ✅ Solução

### 1. Criar Credenciais OAuth no Google Cloud

1. Acesse: https://console.cloud.google.com/
2. Crie um novo projeto ou selecione um existente
3. Vá em **"APIs & Services"** → **"Credentials"**
4. Clique em **"Create Credentials"** → **"OAuth client ID"**
5. Se pedir, configure a tela de consentimento OAuth primeiro
6. Configure:
   - **Application type:** `Web application`
   - **Name:** `App Connect - Supabase`
   - **Authorized JavaScript origins:**
     - `https://oxpcmdejlcmsopjbqncf.supabase.co`
     - `https://connect.visitaia.com.br`
   - **Authorized redirect URIs:**
     - `https://oxpcmdejlcmsopjbqncf.supabase.co/auth/v1/callback`
7. Clique em **"Create"**
8. **Copie:**
   - **Client ID** (ex: `123456789-abc...`)
   - **Client Secret** (ex: `GOCSPX-abc...`)

---

### 2. Habilitar Google OAuth no Supabase

1. Acesse: https://supabase.com/dashboard/project/oxpcmdejlcmsopjbqncf
2. No menu lateral, clique em **"Authentication"** → **"Providers"**
3. Procure por **"Google"** na lista
4. Clique no toggle para **habilitar** o Google
5. Preencha:
   - **Client ID (for OAuth):** Cole o Client ID do Google
   - **Client Secret (for OAuth):** Cole o Client Secret do Google
6. Clique em **"Save"**

---

### 3. Configurar URLs de Redirecionamento

No Google Cloud Console, certifique-se de que as URLs estão corretas:

**Authorized redirect URIs:**
```
https://oxpcmdejlcmsopjbqncf.supabase.co/auth/v1/callback
```

**Authorized JavaScript origins:**
```
https://oxpcmdejlcmsopjbqncf.supabase.co
https://connect.visitaia.com.br
```

---

### 4. Testar

1. Volte para: https://connect.visitaia.com.br
2. Tente fazer login com Google novamente
3. Deve funcionar! ✅

---

## 🆘 Problemas Comuns

### Erro: "redirect_uri_mismatch"
→ Verifique se a URL de callback está exatamente como:
  `https://oxpcmdejlcmsopjbqncf.supabase.co/auth/v1/callback`

### Erro: "invalid_client"
→ Verifique se o Client ID e Client Secret estão corretos no Supabase

### Google não aparece nas opções de login
→ Verifique se o toggle do Google está **habilitado** no Supabase

---

## ✅ PRONTO!

Após configurar, o login com Google deve funcionar perfeitamente!

