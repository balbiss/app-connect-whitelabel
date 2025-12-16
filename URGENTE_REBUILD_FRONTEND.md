# ⚠️ URGENTE: REBUILD DO FRONTEND NO COOLIFY

## ❌ Problema Atual

O erro `insertedCount is not defined` ainda aparece porque o **frontend no Coolify está com a versão antiga**.

---

## ✅ O Que Foi Corrigido

### 1. Frontend (`useDisparos.ts`)
- ✅ Removida variável `insertedCount` não definida
- ✅ Chunks reduzidos de 100 para 50 recipients
- ✅ Delay entre chunks aumentado para 1 segundo
- ✅ Melhor tratamento de erros

### 2. Edge Function (`insert-campaign-recipients`)
- ✅ Batch size reduzido de 50 para **25 recipients** (muito menor)
- ✅ Delay entre lotes aumentado para **1 segundo**
- ✅ Removidas atualizações periódicas de contador (só atualiza no final)
- ✅ Tratamento de erros melhorado

---

## 🚀 AÇÃO NECESSÁRIA: REBUILD DO FRONTEND

### Passo 1: Acessar Coolify
1. Acesse o painel do Coolify
2. Vá para a aplicação do **frontend**

### Passo 2: Fazer Rebuild
1. Clique em **"Redeploy"** ou **"Rebuild"**
2. Aguarde o build completar (pode levar alguns minutos)
3. Verifique se o deploy foi bem-sucedido

### Passo 3: Limpar Cache do Navegador
1. Abra o navegador em modo anônimo/privado
2. Ou limpe o cache: `Ctrl + Shift + Delete`
3. Ou force reload: `Ctrl + F5`

### Passo 4: Testar
1. Crie uma nova campanha
2. Verifique o console - **NÃO deve ter mais erro `insertedCount`**
3. Verifique os logs da Edge Function - deve processar em lotes de 25

---

## 📊 Otimizações Aplicadas

| Parâmetro | Antes | Agora | Motivo |
|-----------|-------|-------|--------|
| Batch Size (Edge Function) | 50 | **25** | Reduzir uso de recursos |
| Delay entre lotes | 500ms | **1000ms** | Dar mais tempo ao sistema |
| Chunk Size (Frontend) | 100 | **50** | Reduzir payload |
| Delay entre chunks | 500ms | **1000ms** | Não sobrecarregar |
| Atualizações periódicas | A cada 10 lotes | **Apenas no final** | Economizar recursos |

---

## ⚠️ Se Ainda Der WORKER_LIMIT

Se mesmo com essas otimizações ainda der `WORKER_LIMIT`, pode ser que o plano do Supabase esteja no limite. Opções:

1. **Upgrade do plano Supabase** (mais recursos)
2. **Reduzir ainda mais o batch size** (para 10 ou 15)
3. **Aumentar ainda mais os delays** (para 2 segundos)

---

## ✅ Checklist

- [ ] Frontend rebuildado no Coolify
- [ ] Cache do navegador limpo
- [ ] Teste de criação de campanha feito
- [ ] Console verificado (sem erro `insertedCount`)
- [ ] Logs da Edge Function verificados

---

## 🆘 Se Não Resolver

Se após o rebuild ainda der erro, me avise e posso:
- Reduzir ainda mais o batch size
- Implementar uma solução alternativa (inserção direta em lotes menores)
- Verificar se há outros problemas no código

**FAÇA O REBUILD DO FRONTEND AGORA!** 🚀

