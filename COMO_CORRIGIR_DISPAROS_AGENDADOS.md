# 🔧 COMO CORRIGIR DISPAROS AGENDADOS NÃO EXECUTANDO

## ❌ Problema

Campanhas agendadas não estão sendo disparadas automaticamente quando chega o horário.

## ✅ Solução

### 1. Verificar se o Cron Job está Instalado

1. Acesse o Supabase Dashboard: https://supabase.com/dashboard/project/oxpcmdejlcmsopjbqncf
2. Vá em **"SQL Editor"**
3. Execute o arquivo `VERIFICAR_CRON_JOB.sql`

**Se não aparecer nenhum resultado**, o cron job não está instalado. Continue para o passo 2.

**Se aparecer um resultado mas `active = false`**, o cron job está desativado. Continue para o passo 2.

### 2. Instalar/Reinstalar o Cron Job

1. No **SQL Editor** do Supabase
2. Execute o arquivo `CORRIGIR_CRON_DISPAROS.sql`
3. Verifique se apareceu uma linha com `jobname = 'execute-scheduled-disparos'`

### 3. Verificar Configurações do Cron Job

O cron job precisa das seguintes configurações:

```sql
-- Verificar configurações
SELECT name, setting 
FROM pg_settings 
WHERE name LIKE 'app.%';
```

Se não existirem, execute:

```sql
-- Configurar variáveis (substitua pelos seus valores)
ALTER DATABASE postgres SET app.supabase_url = 'https://oxpcmdejlcmsopjbqncf.supabase.co';
ALTER DATABASE postgres SET app.supabase_service_role_key = 'SEU_SERVICE_ROLE_KEY_AQUI';
```

### 4. Verificar Logs da Edge Function

1. No Supabase Dashboard, vá em **"Edge Functions"**
2. Clique em **"execute-scheduled-disparos"**
3. Veja os **"Logs"** para verificar se está sendo chamada
4. Procure por mensagens como:
   - `Edge Function execute-scheduled-disparos iniciada`
   - `Buscando disparos agendados...`
   - `Encontrados X disparos para processar`

### 5. Testar Manualmente

Você pode testar a Edge Function manualmente:

1. No Supabase Dashboard, vá em **"Edge Functions"**
2. Clique em **"execute-scheduled-disparos"**
3. Clique em **"Invoke"** ou **"Test"**
4. Veja os logs para verificar se encontrou campanhas agendadas

### 6. Verificar Timezone

O sistema salva `scheduled_at` em UTC. Verifique se a campanha foi criada corretamente:

```sql
SELECT 
  id,
  campaign_name,
  scheduled_at,
  NOW() as agora_utc,
  scheduled_at <= NOW() as deveria_disparar
FROM disparos
WHERE status = 'scheduled'
ORDER BY scheduled_at DESC;
```

### 7. Forçar Execução de uma Campanha Específica

Se uma campanha específica não disparou, você pode forçar a execução:

1. No Supabase Dashboard, vá em **"Edge Functions"**
2. Clique em **"execute-scheduled-disparos"**
3. Clique em **"Invoke"**
4. No body, coloque:
```json
{
  "disparo_id": "ID_DA_CAMPANHA_AQUI"
}
```

## 🔍 Diagnóstico Rápido

Execute este SQL para ver o status completo:

```sql
-- Verificar tudo de uma vez
SELECT 
  'Cron Job Status' as tipo,
  jobname,
  active,
  schedule
FROM cron.job 
WHERE jobname = 'execute-scheduled-disparos'

UNION ALL

SELECT 
  'Campanhas Agendadas' as tipo,
  campaign_name as jobname,
  (scheduled_at <= NOW())::text as active,
  scheduled_at::text as schedule
FROM disparos
WHERE status = 'scheduled'
ORDER BY tipo, jobname;
```

## ✅ PRONTO!

Após seguir estes passos, as campanhas agendadas devem começar a disparar automaticamente!

