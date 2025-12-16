# 🔐 COMO FAZER LOGIN NO SUPABASE CLI

## 📋 PASSO A PASSO RÁPIDO

### 1. Abrir PowerShell como Administrador

1. Pressione `Windows + X`
2. Selecione **"Windows PowerShell (Admin)"** ou **"Terminal (Admin)"**

### 2. Executar Login

```powershell
cd "C:\Users\inoov\Downloads\APP CONNECT DISPARO\blastwave-ai-10977-main\WHITELABEL APP CONNECT\backend-supabase"

npx supabase login
```

### 3. Autorizar no Navegador

- O comando abrirá o navegador automaticamente
- Faça login na sua conta Supabase
- Autorize o acesso
- Volte para o PowerShell

### 4. Linkar o Projeto

Depois do login, execute:

```powershell
npx supabase link --project-ref oxpcmdejlcmsopjbqncf
```

Quando pedir:
- **Database Password:** `280896Ab@`
- **Project URL:** `https://oxpcmdejlcmsopjbqncf.supabase.co`

### 5. Deployar Funções

Depois de linkar, execute o script:

```powershell
cd "C:\Users\inoov\Downloads\APP CONNECT DISPARO\blastwave-ai-10977-main\WHITELABEL APP CONNECT"

.\deploy-all-functions.ps1
```

---

## ✅ ALTERNATIVA: Usar Token de Acesso

Se preferir usar token:

1. Acesse: https://supabase.com/dashboard/account/tokens
2. Crie um novo token
3. Use:

```powershell
$env:SUPABASE_ACCESS_TOKEN="seu_token_aqui"
npx supabase link --project-ref oxpcmdejlcmsopjbqncf
```

---

## 🆘 PROBLEMAS?

Se der erro, tente:

```powershell
# Limpar cache
npx supabase logout
npx supabase login

# Ou usar --debug para ver mais detalhes
npx supabase link --project-ref oxpcmdejlcmsopjbqncf --debug
```

