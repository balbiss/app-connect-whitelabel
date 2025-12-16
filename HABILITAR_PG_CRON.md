# 🔧 HABILITAR EXTENSÃO PG_CRON NO SUPABASE

Se você receber o erro:
```
ERROR: 3F000: schema "cron" does not exist
```

Isso significa que a extensão `pg_cron` precisa ser habilitada manualmente no Supabase.

## 📋 PASSO A PASSO:

### 1. Acessar o Dashboard do Supabase

1. Acesse: **https://app.supabase.com**
2. Selecione o projeto do cliente: `oxpcmdejlcmsopjbqncf`

### 2. Habilitar a Extensão

1. No menu lateral, clique em **"Database"**
2. Clique em **"Extensions"** (ou "Extensões")
3. Procure por **"pg_cron"** na lista
4. Clique no botão **"Enable"** (ou "Habilitar") ao lado de `pg_cron`
5. Aguarde alguns segundos para a extensão ser habilitada

### 3. Verificar se foi Habilitada

1. Vá em **"SQL Editor"**
2. Execute esta query:
```sql
SELECT * FROM pg_extension WHERE extname = 'pg_cron';
```
3. Se retornar uma linha, a extensão está habilitada! ✅

### 4. Executar o SQL de Instalação Novamente

Agora você pode executar o arquivo `INSTALACAO_COMPLETA.sql` novamente e deve funcionar!

---

## ⚠️ ALTERNATIVA: Executar Manualmente

Se não conseguir habilitar pela interface, execute no SQL Editor:

```sql
CREATE EXTENSION IF NOT EXISTS "pg_cron";
```

Depois execute o `INSTALACAO_COMPLETA.sql` novamente.

---

## 📝 NOTA IMPORTANTE

A extensão `pg_cron` é usada para:
- Executar disparos agendados automaticamente
- Deletar campanhas antigas automaticamente
- Verificar assinaturas expiradas
- Enviar cobranças automáticas

Sem ela, essas funcionalidades automáticas não funcionarão, mas o sistema básico continuará funcionando.

