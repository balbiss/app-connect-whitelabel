# 🔑 Corrigir API Key do Supabase no Backend

## ❌ Problema Identificado

Os logs do backend mostram:
```
message: 'Invalid API key',
hint: 'Double check your Supabase `anon` or `service_role` API key.'
```

**Causa:** A variável `SUPABASE_SERVICE_ROLE_KEY` está inválida ou não está configurada corretamente no Coolify.

---

## ✅ Solução

### Passo 1: Obter a Service Role Key Correta

1. **Acesse o Supabase Dashboard**
   - URL: https://supabase.com/dashboard
   - Faça login na sua conta

2. **Selecione o projeto do cliente**
   - Projeto: `oxpcmdejlcmsopjbqncf`
   - URL: https://oxpcmdejlcmsopjbqncf.supabase.co

3. **Vá em Settings → API**
   - Menu lateral esquerdo: **Settings** (⚙️)
   - Submenu: **API**

4. **Copie a Service Role Key**
   - Role: `service_role`
   - **⚠️ ATENÇÃO:** Esta é a chave secreta! Não compartilhe publicamente.
   - A chave deve começar com `eyJ` (é um JWT)

### Passo 2: Atualizar no Coolify

1. **Acesse o Coolify**
   - Encontre a aplicação: `app-connect-backend-api`

2. **Vá em "Environment" ou "Variables"**
   - Procure pela variável: `SUPABASE_SERVICE_ROLE_KEY`

3. **Atualize o valor**
   - Cole a Service Role Key correta
   - **Verifique se não há espaços extras** no início ou fim
   - **Verifique se está completo** (a chave é longa, ~200+ caracteres)

4. **Salve as alterações**
   - Clique em "Save" ou "Update"

5. **Redeploy a aplicação**
   - Após salvar, faça um **Redeploy** da aplicação
   - Isso é necessário para que a nova variável seja carregada

---

## 🔍 Verificar se Está Correto

### Verificação 1: Logs do Backend

Após o redeploy, verifique os logs do backend. Você deve ver:

```
✅ Cliente Supabase configurado
```

**Se aparecer:**
```
❌ Erro: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados
```
ou
```
⚠️ ATENÇÃO: SUPABASE_SERVICE_ROLE_KEY não parece ser uma chave JWT válida
```

**Significa que a variável ainda está incorreta.**

### Verificação 2: Testar Busca de Disparo

1. **Crie uma campanha de teste**
2. **Observe os logs do backend**

**Se estiver correto, você verá:**
```
✅ Disparo encontrado após X tentativa(s)
```

**Se ainda estiver incorreto, você verá:**
```
⚠️ Erro ao buscar disparo: { message: 'Invalid API key', ... }
```

---

## 📋 Checklist

- [ ] Service Role Key copiada do Supabase Dashboard
- [ ] Variável `SUPABASE_SERVICE_ROLE_KEY` atualizada no Coolify
- [ ] Sem espaços extras na chave
- [ ] Chave completa (não truncada)
- [ ] Aplicação redeployada após atualizar variável
- [ ] Logs do backend mostram "✅ Cliente Supabase configurado"
- [ ] Teste de criação de campanha funciona

---

## 🔐 Credenciais do Cliente (Guilherme)

**Projeto Supabase:**
- URL: `https://oxpcmdejlcmsopjbqncf.supabase.co`
- Project ID: `oxpcmdejlcmsopjbqncf`

**Service Role Key:**
- Obter em: Supabase Dashboard → Settings → API → `service_role` key
- **⚠️ Esta chave deve ser mantida em segredo!**

---

## 🆘 Se Ainda Não Funcionar

1. **Verifique se a variável está com o nome correto:**
   - Deve ser exatamente: `SUPABASE_SERVICE_ROLE_KEY`
   - Não pode ter espaços ou caracteres especiais

2. **Verifique se há outras variáveis necessárias:**
   - `SUPABASE_URL` (deve estar configurada também)
   - `SUPABASE_ANON_KEY` (opcional, mas recomendado)

3. **Verifique os logs completos do backend:**
   - Procure por mensagens de erro relacionadas a Supabase
   - Envie os logs para análise

---

## ✅ Após Corrigir

Quando a API key estiver correta:
1. O backend conseguirá buscar disparos no Supabase
2. As campanhas serão processadas corretamente
3. Os logs mostrarão "✅ Disparo encontrado" em vez de "Invalid API key"

