# 🕐 EXPLICAÇÃO DO FUSO HORÁRIO

## Como Funciona

### 1. Quando Você Agenda uma Campanha

Quando você agenda uma campanha para **09:03 (horário de Brasília)**:

1. O sistema cria a data: `2025-12-16T09:03:00-03:00` (Brasília = UTC-3)
2. Converte para UTC: `2025-12-16T12:03:00+00:00` (adiciona 3 horas)
3. Salva no banco: `2025-12-16 12:03:00+00` (UTC)

### 2. Quando o Cron Job Executa

O cron job executa a cada minuto e verifica:
- `scheduled_at <= NOW()` (ambos em UTC)
- Se `scheduled_at` é `2025-12-16 12:03:00+00` (UTC)
- E `NOW()` é `2025-12-16 12:12:01+00` (UTC)
- Então `12:03 <= 12:12` = **TRUE** ✅

### 3. O Problema

A campanha **deveria ter disparado** (deveria_disparar: true), mas não disparou porque:

**O cron job não está executando!**

## ✅ Solução

### Passo 1: Verificar se o Cron Job Existe

Execute no SQL Editor:

```sql
SELECT jobname, active, schedule 
FROM cron.job 
WHERE jobname = 'execute-scheduled-disparos';
```

**Se não aparecer resultado**, o cron job não está instalado.

### Passo 2: Instalar o Cron Job

Execute o arquivo `CORRIGIR_CRON_DISPAROS.sql` no SQL Editor.

### Passo 3: Testar Manualmente

Execute o arquivo `TESTAR_DISPARO_MANUAL.sql` para forçar o disparo da campanha atual.

## 📊 Resumo

- ✅ O fuso horário está correto (UTC no banco)
- ✅ A conversão está correta (Brasília → UTC)
- ❌ O cron job não está executando
- ✅ A Edge Function está pronta para executar

**Ação necessária:** Instalar o cron job usando `CORRIGIR_CRON_DISPAROS.sql`

