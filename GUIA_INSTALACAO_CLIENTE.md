# 🚀 GUIA DE INSTALAÇÃO PARA CLIENTE

## ✅ PASSO 1: CONFIGURAR .env

Você já tem as credenciais do Supabase? Preencha o arquivo `.env`:

1. Abra o arquivo: `WHITELABEL APP CONNECT\.env`
2. Preencha estas linhas com as credenciais do cliente:

```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
ADMIN_EMAIL=email@docliente.com
DOMAIN=connect.cliente.com.br
WHATSAPP_API_URL=https://weeb.inoovaweb.com.br
```

---

## ✅ PASSO 2: INSTALAR BANCO DE DADOS NO SUPABASE

### 2.1. Abrir SQL Editor no Supabase

1. Acesse: https://app.supabase.com
2. Selecione o projeto do cliente
3. No menu lateral esquerdo, clique em **"SQL Editor"**
4. Clique no botão **"New query"** (ou use o editor que já está aberto)

### 2.2. Executar Migrações na Ordem

**⚠️ IMPORTANTE:** Execute os arquivos SQL na ordem numérica!

Vou te passar os arquivos um por um. Execute cada um completamente antes de passar para o próximo.

**Lista de arquivos (na ordem):**

1. `EXTENSOES.sql`
2. `FUNCOES_AUXILIARES.sql`
3. `TABELA_PROFILES.sql`
4. `TABELA_CONNECTIONS.sql`
5. `TABELA_DISPAROS.sql`
6. `TABELA_DISPARO_RECIPIENTS.sql`
7. `TABELA_PAGAMENTOS.sql`
8. `001_initial_schema.sql`
9. `002_functions.sql`
10. `003_cron_job.sql`
11. `004_add_ai_config.sql`
12. `004_plans_and_limits.sql`
13. `005_add_settings_to_profiles.sql`
14. `005_fix_profiles_rls.sql`
15. `006_admin_system.sql`
16. `007_fix_rls_recursion.sql`
17. `009_plano_teste.sql`
18. `010_delete_old_campaigns.sql`
19. `011_billing_system.sql`
20. `012_notifications_system.sql`
21. `013_improve_notifications.sql`
22. `013_mercado_pago_integration.sql`
23. `014_multi_payment_providers.sql`
24. `015_add_boleto_support.sql`
25. `015_add_payment_type.sql`
26. `016_appointment_system.sql`
27. `016_booking_system.sql`
28. `017_professionals_and_schedule.sql`
29. `017_syncpay_transactions.sql`
30. `018_fix_professional_id_fk.sql`
31. `018_push_subscriptions.sql`
32. `019_appointment_schedule_config.sql`
33. `019_push_on_campaign_completed.sql`
34. `020_appointment_message_templates.sql`
35. `020_chatbot_flows.sql`
36. `021_appointment_default_connection.sql`
37. `022_reseller_system.sql`
38. `CRON_CHECK_SUBSCRIPTIONS.sql`

**💡 DICA:** Abra cada arquivo SQL da pasta `backend-supabase/supabase/migrations/`, copie TODO o conteúdo, cole no SQL Editor do Supabase e clique em **"Run"** (ou pressione Ctrl+Enter).

**⏱️ TEMPO ESTIMADO:** 5-10 minutos

---

## ✅ PASSO 3: CONFIGURAR FRONTEND

### 3.1. Editar arquivo de configuração do frontend

Abra o arquivo:
```
WHITELABEL APP CONNECT\frontend\src\lib\supabase.ts
```

Procure por estas linhas e substitua pelos valores do cliente:

```typescript
const supabaseUrl = 'https://xxxxx.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

---

## ✅ PASSO 4: INSTALAR E RODAR O SISTEMA

### 4.1. Instalar dependências do frontend

```powershell
cd "WHITELABEL APP CONNECT\frontend"
npm install
```

### 4.2. Build do frontend

```powershell
npm run build
```

### 4.3. Subir o sistema com Docker

```powershell
cd "WHITELABEL APP CONNECT"
docker-compose up -d
```

---

## ✅ PASSO 5: CRIAR PRIMEIRO USUÁRIO ADMIN

1. Acesse o sistema: http://localhost (ou o domínio configurado)
2. Clique em **"Criar conta"**
3. Use o email configurado em `ADMIN_EMAIL` no `.env`
4. Complete o cadastro
5. O primeiro usuário será automaticamente admin

---

## ✅ PRONTO! 🎉

O sistema está instalado e rodando!

**Próximos passos:**
- Configurar logo do cliente em `branding/logo.png`
- Configurar domínio personalizado
- Configurar SSL/HTTPS (se necessário)
- Cliente pode configurar pagamentos no painel

---

## 🆘 PROBLEMAS COMUNS

### Erro: "relation does not exist"
→ Você pulou alguma migração. Execute todas na ordem.

### Erro: "permission denied"
→ Verifique se executou os arquivos de RLS (Row Level Security).

### Erro: "invalid API key"
→ Verifique se copiou corretamente as chaves no `.env` e no `supabase.ts`.

### Sistema não abre no navegador
→ Verifique se o Docker está rodando: `docker ps`
→ Verifique as portas: `docker-compose ps`

