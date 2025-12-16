# 🔧 CORRIGIR ERRO 500 AO CRIAR CAMPANHA

## ❌ Problema

Ao criar uma campanha, aparece erro 500 ao inserir recipients:
```
POST .../disparo_recipients 500 (Internal Server Error)
```

## ✅ Solução

### Passo 1: Executar SQL de Correção

1. Acesse: https://supabase.com/dashboard/project/oxpcmdejlcmsopjbqncf/sql/new
2. Execute o arquivo: `CORRIGIR_ERRO_500_RECIPIENTS.sql`
3. Verifique se não há erros

### Passo 2: Verificar no Console do Supabase

1. Acesse: https://supabase.com/dashboard/project/oxpcmdejlcmsopjbqncf/logs/explorer
2. Filtre por: `disparo_recipients`
3. Veja os erros detalhados

### Passo 3: Possíveis Causas

1. **RLS Policy**: A política pode estar bloqueando
2. **Timeout**: Muitos recipients de uma vez
3. **Constraint**: Alguma constraint pode estar falhando
4. **Trigger**: Algum trigger pode estar causando erro

## 🔍 Debug

### Verificar se o Disparo foi Criado

No console do navegador, você deve ver:
```
✅ Campanha criada: [ID]
```

Se aparecer, o disparo foi criado. O problema é só na inserção dos recipients.

### Verificar Dados

O erro pode ser causado por:
- `disparo_id` inválido
- `phone_number` muito longo
- `personalized_message` muito longo
- `media_url` muito longo

## 💡 Solução Temporária

Se o erro persistir, tente criar campanhas com menos recipients por vez (ex: 5-10 por vez).

## 📋 Próximos Passos

1. Execute o SQL de correção
2. Tente criar uma campanha novamente
3. Se persistir, me envie os logs do Supabase

