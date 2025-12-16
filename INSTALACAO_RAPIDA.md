# ⚡ INSTALAÇÃO RÁPIDA PARA CLIENTE

## 🎯 OBJETIVO
Instalar o sistema completo para um cliente em **menos de 15 minutos**.

---

## ✅ PASSO 1: CONFIGURAR .env (2 minutos)

### 1.1. Criar arquivo .env

Abra o PowerShell na pasta `WHITELABEL APP CONNECT` e execute:

```powershell
Copy-Item env.template .env
```

### 1.2. Editar o arquivo .env

Abra o arquivo `.env` no Notepad ou editor de texto e preencha:

```env
# Substitua pelos valores do Supabase do cliente:
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Email do primeiro admin:
ADMIN_EMAIL=admin@cliente.com

# Domínio (ou deixe padrão):
DOMAIN=connect.cliente.com.br

# API WhatsApp (sua API):
WHATSAPP_API_URL=https://weeb.inoovaweb.com.br
```

**💾 Salve o arquivo!**

---

## ✅ PASSO 2: INSTALAR BANCO DE DADOS (5 minutos)

### 2.1. Abrir SQL Editor no Supabase

1. Acesse: **https://app.supabase.com**
2. Selecione o projeto do cliente
3. Clique em **"SQL Editor"** (menu lateral)
4. Clique em **"New query"**

### 2.2. Executar Migrações

**⚠️ IMPORTANTE:** Execute os arquivos SQL **na ordem numérica**!

Abra cada arquivo da pasta `backend-supabase/supabase/migrations/` e execute no SQL Editor:

**Ordem de execução:**

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

**💡 DICA:** 
- Abra cada arquivo SQL
- Copie TODO o conteúdo
- Cole no SQL Editor do Supabase
- Clique em **"Run"** (ou Ctrl+Enter)
- Aguarde a mensagem de sucesso antes de passar para o próximo

**⏱️ TEMPO:** ~5 minutos (se executar todos de uma vez)

---

## ✅ PASSO 3: CONFIGURAR FRONTEND (1 minuto)

### 3.1. Criar arquivo frontend/.env

No PowerShell, execute:

```powershell
cd "WHITELABEL APP CONNECT\frontend"
```

Crie o arquivo `.env` com este conteúdo (substitua pelos valores do cliente):

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**💾 Salve o arquivo!**

---

## ✅ PASSO 4: INSTALAR E RODAR (5 minutos)

### 4.1. Executar script de instalação

Volte para a pasta raiz e execute:

```powershell
cd "WHITELABEL APP CONNECT"
.\INSTALAR_CLIENTE.ps1
```

**OU execute manualmente:**

```powershell
# Instalar dependências
cd frontend
npm install

# Build
npm run build

# Voltar para raiz
cd ..

# Subir Docker
docker-compose up -d
```

---

## ✅ PASSO 5: CRIAR PRIMEIRO USUÁRIO (1 minuto)

1. Acesse: **http://localhost**
2. Clique em **"Criar conta"**
3. Use o email configurado em `ADMIN_EMAIL` no `.env`
4. Complete o cadastro
5. **✅ Pronto!** O primeiro usuário será automaticamente admin

---

## 🎉 PRONTO!

O sistema está instalado e rodando!

**Acesse:** http://localhost

---

## 🆘 PROBLEMAS?

### Erro: "relation does not exist"
→ Você pulou alguma migração. Execute todas na ordem.

### Erro: "invalid API key"
→ Verifique se copiou corretamente as chaves no `.env` e no `frontend/.env`.

### Sistema não abre
→ Verifique Docker: `docker ps`
→ Ver logs: `docker-compose logs -f`

---

## 📞 PRÓXIMOS PASSOS

- [ ] Configurar logo do cliente em `branding/logo.png`
- [ ] Configurar domínio personalizado
- [ ] Configurar SSL/HTTPS (se necessário)
- [ ] Cliente pode configurar pagamentos no painel

