# 🚀 APP CONNECT - WHITE LABEL EDITION

## 📦 Pacote Completo para Revenda

Este é um pacote **pronto para instalar** do sistema APP CONNECT, um SaaS completo para gerenciamento de WhatsApp, disparo de mensagens em massa, chatbot inteligente e cobranças automáticas.

---

## 🎯 O QUE ESTÁ INCLUÍDO

### ✅ **Frontend (React + Vite)**
- Interface moderna e responsiva
- Sistema completo de gerenciamento
- Totalmente customizável (logo, cores, domínio)

### ✅ **Backend (Supabase)**
- Banco de dados PostgreSQL
- Autenticação segura
- Edge Functions para processar webhooks
- Storage para arquivos

### ✅ **API WhatsApp**
- Usa a API do fornecedor (weeb.inoovaweb.com.br)
- Pronta para uso
- Sem necessidade de instalar nada

### ✅ **Funcionalidades**
- 📱 Gerenciamento de instâncias WhatsApp
- 📧 Disparo em massa de mensagens
- 🤖 Chatbot com fluxos visuais (tipo Typebot)
- 💰 Cobranças automáticas com PIX (Mercado Pago)
- 📊 Analytics e relatórios
- 👥 Extração de contatos
- 📅 Agendamentos online
- 🎨 White Label 100%

---

## ⚡ INSTALAÇÃO RÁPIDA (1 Comando)

### **Windows:**
```powershell
.\install.ps1
```

### **Linux/Mac:**
```bash
chmod +x install.sh
./install.sh
```

---

## 📋 PRÉ-REQUISITOS

Antes de instalar, certifique-se de ter:

### 1. **Docker & Docker Compose**
- Windows: https://docs.docker.com/desktop/install/windows-install/
- Linux: https://docs.docker.com/engine/install/
- Mac: https://docs.docker.com/desktop/install/mac-install/

### 2. **Conta no Supabase** (Grátis)
- Acesse: https://app.supabase.com
- Crie um novo projeto
- Anote a URL e Anon Key

### 3. **Domínio** (Opcional mas recomendado)
- Ex: connect.suaempresa.com.br
- Configurar DNS apontando para seu servidor

### 4. **Conta Mercado Pago** (Para cobranças com PIX)
- Criar em: https://mercadopago.com.br
- Gerar Access Token (configurado depois no painel)

---

## 🎨 CUSTOMIZAÇÃO

### **1. Logo e Favicon**

Substitua os arquivos em `./branding/`:
- `logo.png` - Logo principal (recomendado: 200x50px, PNG transparente)
- `favicon.ico` - Ícone do navegador (32x32px)
- `logo-dark.png` - Logo para tema escuro (opcional)

### **2. Cores do Sistema**

Edite no arquivo `.env`:
```env
PRIMARY_COLOR="#8b5cf6"    # Cor principal (roxo)
SECONDARY_COLOR="#06b6d4"  # Cor secundária (ciano)
ACCENT_COLOR="#ec4899"     # Cor de destaque (rosa)
```

### **3. Nome do Sistema**

Edite no arquivo `.env`:
```env
APP_NAME="SeuNome"
APP_SUBTITLE="Sua Descrição"
```

### **4. Domínio**

Edite no arquivo `.env`:
```env
DOMAIN=connect.seudominio.com.br
```

---

## 📝 INSTALAÇÃO PASSO A PASSO

### **Passo 1: Configurar .env**

```bash
cp env.template .env
nano .env  # Ou use seu editor preferido
```

Preencha:
- `DOMAIN` - Seu domínio
- `SUPABASE_URL` - URL do Supabase
- `SUPABASE_ANON_KEY` - Chave pública do Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Chave de serviço do Supabase
- `ADMIN_EMAIL` - Email do primeiro admin

### **Passo 2: Executar Instalação**

```bash
./install.sh     # Linux/Mac
.\install.ps1    # Windows
```

### **Passo 3: Instalar Banco de Dados**

```bash
./install-database.sh     # Linux/Mac
.\install-database.ps1    # Windows
```

### **Passo 4: Acessar Sistema**

Abra no navegador:
- http://localhost (local)
- http://seudominio.com.br (produção)

---

## 🔧 COMANDOS ÚTEIS

### **Iniciar sistema:**
```bash
docker-compose up -d
```

### **Parar sistema:**
```bash
docker-compose down
```

### **Ver logs:**
```bash
docker-compose logs -f frontend
```

### **Reiniciar:**
```bash
docker-compose restart
```

### **Atualizar:**
```bash
git pull
docker-compose up -d --build
```

---

## 📊 ESTRUTURA DO PROJETO

```
WHITELABEL APP CONNECT/
├── frontend/              # Código do frontend
├── backend-supabase/      # SQLs e Edge Functions
├── branding/              # Logo e assets customizáveis
├── ssl/                   # Certificados SSL
├── docker-compose.yml     # Configuração Docker
├── env.template           # Template de configuração
├── install.sh             # Instalador Linux/Mac
├── install.ps1            # Instalador Windows
├── install-database.sh    # Instalar SQLs no Supabase
├── DOCUMENTACAO/          # Docs completa
└── README.md              # Este arquivo
```

---

## 🆘 PROBLEMAS COMUNS

### **Erro: "Docker não está instalado"**
- Instale o Docker Desktop
- Windows: https://docs.docker.com/desktop/install/windows-install/

### **Erro: "SUPABASE_URL não configurado"**
- Edite o arquivo `.env`
- Configure a URL do seu projeto Supabase

### **Erro: "Porta 80 já está em uso"**
- Mude a porta no `.env`: `FRONTEND_PORT=8080`
- Acesse em: http://localhost:8080

### **Sistema não carrega**
- Verifique se containers estão rodando: `docker-compose ps`
- Veja logs: `docker-compose logs -f`

---

## 📞 SUPORTE

- 📧 Email: suporte@vendedor.com.br
- 📱 WhatsApp: (XX) XXXXX-XXXX
- 📚 Documentação: `./DOCUMENTACAO/`
- 🐛 Troubleshooting: `TROUBLESHOOTING.md`

---

## 📜 LICENÇA

Este software é licenciado para uso comercial.
Veja `LICENSE.txt` para mais detalhes.

---

## 🎉 BEM-VINDO!

Obrigado por adquirir o APP CONNECT!
Qualquer dúvida, entre em contato com o suporte.

**Bons negócios! 🚀**

