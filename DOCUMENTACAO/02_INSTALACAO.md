# 🔧 GUIA COMPLETO DE INSTALAÇÃO

## 📌 Visão Geral

Este guia detalha **TODO** o processo de instalação do APP CONNECT.

**Tempo estimado:** 15-30 minutos

---

## 🎬 ANTES DE COMEÇAR

### Certifique-se de ter:

✅ Todos os requisitos do arquivo `01_REQUISITOS.md`
✅ Acesso root/admin ao servidor
✅ Credenciais do Supabase anotadas
✅ Domínio configurado (opcional)

---

## 📝 PASSO 1: Preparar Ambiente

### 1.1. Fazer Download/Upload do Pacote

**Se recebeu por email/link:**
```bash
# Baixar e extrair
unzip whitelabel-app-connect.zip
cd WHITELABEL\ APP\ CONNECT
```

**Se está em VPS/Servidor:**
```bash
# Fazer upload via SCP/SFTP ou Git
scp -r ./WHITELABEL\ APP\ CONNECT root@seu-servidor:/root/
ssh root@seu-servidor
cd /root/WHITELABEL\ APP\ CONNECT
```

### 1.2. Verificar Estrutura

```bash
ls -la
```

Você deve ver:
- `docker-compose.yml`
- `install.sh` ou `install.ps1`
- `env.template`
- `frontend/`
- `backend-supabase/`
- `DOCUMENTACAO/`

---

## 📝 PASSO 2: Configurar Supabase

### 2.1. Criar Projeto Supabase

1. Acesse: **https://app.supabase.com**
2. Faça login ou crie conta
3. Clique em **"New Project"**
4. Preencha:
   - **Name:** `app-connect-prod` (ou nome de sua preferência)
   - **Database Password:** [crie uma senha forte e ANOTE]
   - **Region:** `South America (São Paulo)` ou mais próximo
   - **Pricing Plan:** Free (ou pago se quiser mais recursos)
5. Clique em **"Create new project"**
6. ⏱️ Aguarde 2-3 minutos até o projeto ficar pronto

### 2.2. Copiar Credenciais

Após o projeto ser criado:

1. Vá em: **Settings** (⚙️ no menu lateral)
2. Clique em: **API**
3. Você verá 2 seções importantes:

**Project URL:**
```
https://xxxxxxxxxxxxxx.supabase.co
```
📋 Copie este valor

**Project API keys:**
- **anon public:** `eyJhbGciOiJI...` 📋 Copie
- **service_role:** `eyJhbGciOiJI...` 📋 Copie (⚠️ Secreta!)

---

## 📝 PASSO 3: Configurar .env

### 3.1. Criar arquivo .env

```bash
# Linux/Mac
cp env.template .env

# Windows (PowerShell)
Copy-Item env.template .env
```

### 3.2. Editar .env

Abra o arquivo `.env` no editor:

```bash
# Linux
nano .env

# Mac
open .env

# Windows
notepad .env
```

### 3.3. Preencher Valores

**Cole as credenciais do Supabase:**
```env
DOMAIN=connect.seudominio.com.br  # Seu domínio
SUPABASE_URL=https://xxx.supabase.co  # Cole aqui
SUPABASE_ANON_KEY=eyJhbGc...  # Cole aqui
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # Cole aqui (service_role)
ADMIN_EMAIL=seu@email.com.br  # Seu email
```

**💾 Salve e feche o arquivo!**

---

## 📝 PASSO 4: Executar Instalação

### 4.1. Windows (PowerShell):

```powershell
# Executar como Administrador
.\install.ps1
```

### 4.2. Linux/Mac:

```bash
# Dar permissão de execução
chmod +x install.sh

# Executar
./install.sh
```

### 4.3. Durante a Instalação

Você verá várias etapas:
1. ✅ Verificar requisitos (Docker, etc.)
2. ✅ Validar arquivo .env
3. ✅ Mostrar configurações
4. ⏸️ **Confirmação:** Digite `s` e pressione Enter
5. ✅ Criar pastas
6. ✅ Build do frontend (1-2 minutos)
7. ✅ Iniciar containers Docker
8. ✅ Instalação concluída!

---

## 📝 PASSO 5: Instalar Banco de Dados

### 5.1. Executar Script

**Windows:**
```powershell
.\install-database.ps1
```

**Linux/Mac:**
```bash
./install-database.sh
```

### 5.2. Executar SQL no Supabase

O script vai te mostrar instruções. Siga:

1. Acesse: https://app.supabase.com
2. Selecione seu projeto
3. Vá em: **SQL Editor** (menu lateral)
4. Clique em **+ New Query**
5. Copie TUTTO o conteúdo do arquivo:
   `./backend-supabase/supabase/migrations/install-all.sql`
6. Cole no SQL Editor
7. Clique em **"Run"** (ou pressione Ctrl+Enter)
8. ⏱️ Aguarde 1-2 minutos
9. Você deve ver: **"Success. No rows returned"**
10. ✅ Banco instalado!

---

## 📝 PASSO 6: Verificar Instalação

### 6.1. Verificar Containers

```bash
docker-compose ps
```

Deve mostrar:
```
NAME                    STATUS
app-connect-frontend    Up (healthy)
```

### 6.2. Verificar Logs

```bash
docker-compose logs -f frontend
```

Você verá logs do Nginx. Pressione Ctrl+C para sair.

### 6.3. Acessar Sistema

Abra no navegador:
- **http://localhost** (se instalou localmente)
- **http://seudominio.com.br** (se configurou domínio)

Você deve ver a tela de login! ✅

---

## 📝 PASSO 7: Criar Primeiro Usuário Admin

1. Na tela de login, clique em **"Criar Conta"**
2. Preencha:
   - **Email:** [o mesmo do ADMIN_EMAIL no .env]
   - **Senha:** [crie uma senha forte]
   - **Nome:** Seu nome
3. Clique em **"Criar Conta"**
4. ✅ Você será logado automaticamente com permissões de admin!

---

## 🎉 INSTALAÇÃO CONCLUÍDA!

### O que você tem agora:

✅ Sistema funcionando 100%
✅ Banco de dados configurado
✅ Frontend rodando em Docker
✅ Pronto para uso

### Próximos passos:

📖 Leia: `03_CONFIGURACAO.md` - Configurações adicionais
🎨 Leia: `04_PERSONALIZACAO.md` - Customizar logo, cores, etc.
🐛 Problemas? `05_TROUBLESHOOTING.md`

---

## 🆘 Problemas Durante Instalação?

Veja o arquivo `05_TROUBLESHOOTING.md` com soluções para problemas comuns.

---

**Parabéns! Você instalou o APP CONNECT com sucesso! 🎊**

