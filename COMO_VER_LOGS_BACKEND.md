# 🔍 Como Ver Logs do Backend API

## 📋 Problema Atual

O backend API não está encontrando o disparo quando tenta executá-lo, mesmo após 10 tentativas com retry.

## 🎯 Objetivo

Ver os logs detalhados do backend para entender:
1. Se o `disparo_id` está sendo recebido corretamente
2. Qual erro específico está ocorrendo ao buscar o disparo
3. Se o disparo existe no banco (últimos 10 disparos)
4. Se há problema com `.single()` (busca sem `.single()`)

---

## 📝 Passo a Passo

### 1. Acessar Logs no Coolify

1. **Acesse o Coolify**
2. **Encontre a aplicação** `app-connect-backend-api`
3. **Clique em "Logs"** ou "Container Logs"
4. **Deixe os logs abertos** enquanto cria uma campanha

### 2. Criar uma Campanha de Teste

1. **Crie uma campanha** com 1 recipient
2. **Observe os logs** do backend em tempo real
3. **Copie os logs completos** que aparecerem

### 3. Logs Esperados

Você deve ver algo como:

```
[2025-12-17T...] Executando campanhas agendadas...
[2025-12-17T...] Processando disparo específico: 18a1a764-3cf0-42bd-961e-ec6b28c27b54
[2025-12-17T...] Tipo do disparo_id: string, Tamanho: 36
[2025-12-17T...] Tentativa 1/10: Buscando disparo 18a1a764-3cf0-42bd-961e-ec6b28c27b54...
[2025-12-17T...] ⚠️ Erro ao buscar disparo (tentativa 1): {...}
[2025-12-17T...] ⏳ Disparo ainda não encontrado, aguardando 200ms... (9 tentativas restantes)
...
[2025-12-17T...] ❌ Disparo não encontrado após todas as tentativas: 18a1a764-3cf0-42bd-961e-ec6b28c27b54
[2025-12-17T...] Últimos 10 disparos no banco: [...]
[2025-12-17T...] Busca sem .single() - encontrados: X
```

---

## 🔍 O Que Procurar nos Logs

### ✅ Se o disparo foi encontrado:
- `✅ Disparo encontrado após X tentativa(s)`
- O disparo será processado normalmente

### ❌ Se o disparo NÃO foi encontrado:
- `❌ Disparo não encontrado após todas as tentativas`
- `Últimos 10 disparos no banco:` - **Verificar se o disparo está na lista**
- `Busca sem .single() - encontrados: X` - **Se X > 0, há problema com `.single()`**
- `Erro ao buscar disparo:` - **Verificar código e mensagem do erro**

---

## 🐛 Possíveis Problemas e Soluções

### Problema 1: Disparo não está na lista dos últimos 10
**Causa:** O disparo não foi criado ou foi criado em outro banco
**Solução:** Verificar se o frontend está usando o mesmo Supabase

### Problema 2: Busca sem `.single()` encontra, mas `.single()` não
**Causa:** Bug do Supabase com `.single()` em certas situações
**Solução:** Já implementado fallback que usa resultado sem `.single()`

### Problema 3: Erro de RLS (código PGRST116)
**Causa:** Service Role Key não está configurada corretamente
**Solução:** Verificar variável `SUPABASE_SERVICE_ROLE_KEY` no Coolify

### Problema 4: Erro de conexão/timeout
**Causa:** Problema de rede ou Supabase indisponível
**Solução:** Verificar conexão com Supabase

---

## 📤 Enviar Logs

Quando tiver os logs, envie:
1. **Logs completos** do backend (especialmente as linhas com `[2025-12-17T...]`)
2. **ID do disparo** que foi criado (do console do frontend)
3. **Timestamp** aproximado de quando a campanha foi criada

---

## 🔄 Próximos Passos

Após analisar os logs, poderemos:
1. Identificar a causa raiz do problema
2. Implementar correção específica
3. Testar novamente

