# 🔧 CORRIGIR ERRO OAUTH REDIRECIONANDO PARA LOCALHOST

## ❌ Problema

Ao fazer login com Google, o callback está redirecionando para `localhost:5000` em vez do domínio de produção.

## ✅ Solução

### 1. Verificar URLs no Google Cloud Console

1. Acesse: https://console.cloud.google.com/
2. Vá em **"APIs & Services"** → **"Credentials"**
3. Clique no seu **OAuth 2.0 Client ID**
4. Verifique as **"Authorized redirect URIs"**:

**Deve ter APENAS:**
```
https://oxpcmdejlcmsopjbqncf.supabase.co/auth/v1/callback
```

**NÃO deve ter:**
- `http://localhost:5000/...`
- `http://localhost:8082/...`
- Qualquer URL com localhost

5. Se houver URLs com localhost, **remova todas**
6. Clique em **"Save"**

---

### 2. Verificar Configuração no Supabase

1. Acesse: https://supabase.com/dashboard/project/oxpcmdejlcmsopjbqncf/auth/url-configuration
2. Verifique **"Site URL"**:
   - Deve ser: `https://connect.visitaia.com.br`
3. Verifique **"Redirect URLs"**:
   - Deve ter: `https://connect.visitaia.com.br/**`
   - Pode ter: `https://oxpcmdejlcmsopjbqncf.supabase.co/**`
   - **NÃO deve ter:** `http://localhost:*`

4. Se houver URLs com localhost, **remova todas**
5. Clique em **"Save"**

---

### 3. Verificar Provider Google no Supabase

1. Acesse: https://supabase.com/dashboard/project/oxpcmdejlcmsopjbqncf/auth/providers
2. Clique em **"Google"**
3. Verifique se está **habilitado**
4. Verifique se **Client ID** e **Client Secret** estão corretos
5. Clique em **"Save"**

---

### 4. Testar Novamente

1. Acesse: https://connect.visitaia.com.br/login
2. Clique em **"Entrar com Google"**
3. Deve redirecionar corretamente para o domínio de produção

---

## 🔍 Verificação Rápida

Execute este comando no console do navegador (F12) ao fazer login:

```javascript
console.log('Origin:', window.location.origin);
console.log('URL:', window.location.href);
```

Deve mostrar:
- Origin: `https://connect.visitaia.com.br`
- URL: `https://connect.visitaia.com.br/...`

Se mostrar `localhost`, o problema está na configuração do Google Cloud ou Supabase.

---

## ✅ PRONTO!

Após corrigir as URLs, o login com Google deve funcionar corretamente!

