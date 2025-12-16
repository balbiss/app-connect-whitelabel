# ⚡ INÍCIO RÁPIDO - APP CONNECT

## 🎯 Instalação em 5 Minutos

Siga este guia para ter o sistema funcionando rapidamente.

---

## 📋 PRÉ-REQUISITOS

Antes de começar, certifique-se de ter:

- [ ] Docker & Docker Compose instalados
- [ ] Conta no Supabase criada
- [ ] Domínio apontando para seu servidor (opcional)
- [ ] Conta Mercado Pago (para cobranças com PIX)

---

## 🚀 PASSO 1: Configurar Supabase (5 minutos)

### 1.1. Criar Projeto

1. Acesse: https://app.supabase.com
2. Clique em **"New Project"**
3. Preencha:
   - **Name:** app-connect-producao (ou nome de sua preferência)
   - **Database Password:** [senha forte - ANOTE!]
   - **Region:** South America (São Paulo)
4. Clique em **"Create new project"**
5. Aguarde 2-3 minutos (criação do projeto)

### 1.2. Copiar Credenciais

1. No projeto criado, vá em: **Settings** (⚙️) → **API**
2. Copie e anote:
   - **Project URL:** `https://xxx.supabase.co`
   - **anon public:** `eyJhbGc...`
   - **service_role:** `eyJhbGc...` (mantenha secreta!)

---

## 🚀 PASSO 2: Configurar Sistema (2 minutos)

### 2.1. Criar arquivo .env

```bash
# Windows (PowerShell)
Copy-Item env.template .env
notepad .env

# Linux/Mac
cp env.template .env
nano .env
```

### 2.2. Preencher configurações

Edite o arquivo `.env` e configure:

```env
# Seu domínio
DOMAIN=connect.seudominio.com.br

# Credenciais do Supabase (copiadas no passo 1.2)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Email do administrador
ADMIN_EMAIL=seu@email.com.br

# API WhatsApp (já configurada)
WHATSAPP_API_URL=https://weeb.inoovaweb.com.br
```

**💾 Salve o arquivo!**

---

## 🚀 PASSO 3: Instalar Sistema (1 comando!)

### Windows (PowerShell):
```powershell
.\install.ps1
```

### Linux/Mac:
```bash
chmod +x install.sh
./install.sh
```

**⏱️ Aguarde 1-2 minutos...**

Você verá:
```
✅ Docker instalado
✅ Docker Compose instalado
✅ Arquivo .env encontrado
✅ Configurações validadas
🔨 Fazendo build do frontend...
✅ Build concluído
🚀 Iniciando containers Docker...
✅ Containers iniciados com sucesso!
🎉 INSTALAÇÃO CONCLUÍDA COM SUCESSO!
```

---

## 🚀 PASSO 4: Instalar Banco de Dados (3 minutos)

### Windows:
```powershell
.\install-database.ps1
```

### Linux/Mac:
```bash
./install-database.sh
```

Siga as instruções para executar o SQL no Supabase.

---

## 🚀 PASSO 5: Acessar Sistema

### Abra no navegador:

**Local:**
```
http://localhost
```

**Produção:**
```
http://seudominio.com.br
```

### Fazer primeiro login:

1. Clique em **"Criar Conta"**
2. Use o email configurado em `ADMIN_EMAIL`
3. Crie uma senha forte
4. ✅ Você terá acesso administrativo!

---

## 🎨 PASSO 6: Personalizar (Opcional)

### Trocar Logo:
1. Coloque sua logo em: `./branding/logo.png`
2. Reinicie: `docker-compose restart`

### Trocar Cores:
1. Edite o `.env`
2. Mude: `PRIMARY_COLOR`, `SECONDARY_COLOR`, `ACCENT_COLOR`
3. Rebuild: `docker-compose up -d --build`

### Configurar Mercado Pago:
1. Acesse o sistema
2. Vá em: **Configurações** → **Pagamentos**
3. Adicione sua chave API do Mercado Pago

---

## ✅ PRONTO!

Seu sistema está funcionando! 🎉

### Próximos passos:

- [ ] Criar suas primeiras instâncias WhatsApp
- [ ] Testar disparo de mensagens
- [ ] Configurar um fluxo de chatbot
- [ ] Criar uma cobrança teste
- [ ] Explorar todas as funcionalidades

---

## 🆘 PRECISA DE AJUDA?

- 📖 Leia a documentação completa em: `./DOCUMENTACAO/`
- 🐛 Problemas? Veja: `TROUBLESHOOTING.md`
- 📧 Suporte: [contato do vendedor]

---

**Bons negócios! 🚀**

