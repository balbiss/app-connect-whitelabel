# 📋 REQUISITOS DO SISTEMA

## 🖥️ Hardware Mínimo

### Para Desenvolvimento/Teste:
- **CPU:** 2 cores
- **RAM:** 4GB
- **Disco:** 10GB livres
- **Internet:** 5Mbps

### Para Produção:
- **CPU:** 4 cores (recomendado)
- **RAM:** 8GB (recomendado)
- **Disco:** 50GB SSD
- **Internet:** 20Mbps ou mais
- **IP fixo:** Recomendado

---

## 💻 Software Necessário

### 1. **Docker** (Obrigatório)

#### Windows:
- Docker Desktop para Windows
- Download: https://docs.docker.com/desktop/install/windows-install/
- Requisitos: Windows 10/11 64-bit Pro, Enterprise ou Education

#### Linux (Ubuntu/Debian):
```bash
# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Instalar Docker Compose
sudo apt install docker-compose

# Adicionar usuário ao grupo docker
sudo usermod -aG docker $USER
```

#### Mac:
- Docker Desktop para Mac
- Download: https://docs.docker.com/desktop/install/mac-install/

### 2. **Conta Supabase** (Obrigatório)

- Acesse: https://app.supabase.com
- Clique em "Sign up"
- Crie sua conta (grátis)
- **Plano Free inclui:**
  - 500MB de banco de dados
  - 1GB de storage
  - 2GB de transferência
  - SSL incluído
  - Backups automáticos

### 3. **Conta Mercado Pago** (Para cobranças)

- Acesse: https://mercadopago.com.br
- Crie uma conta
- Vá em: Developers → Credenciais
- Gere um **Access Token** (Production)

---

## 🌐 Domínio (Opcional mas Recomendado)

### Por que ter domínio próprio?

- ✅ Mais profissional
- ✅ Melhor SEO
- ✅ Email corporativo
- ✅ Confiança dos clientes

### Onde comprar:

- Registro.br (domínios .br)
- GoDaddy
- Hostinger
- Cloudflare

### Configuração DNS:

```
Tipo: A
Nome: connect (ou @)
Valor: IP_DO_SEU_SERVIDOR
TTL: 3600
```

---

## 📱 API WhatsApp

### Incluído no Pacote:

✅ API já configurada e pronta para uso
✅ URL: https://weeb.inoovaweb.com.br
✅ Sem necessidade de instalação
✅ Suporte do fornecedor

**Observação:** A API é fornecida pelo vendedor do sistema.

---

## 🔐 SSL/HTTPS (Recomendado para Produção)

### Opção 1: Let's Encrypt (Grátis)

```bash
# Instalar Certbot
sudo apt install certbot

# Gerar certificado
sudo certbot certonly --standalone -d seudominio.com.br

# Copiar certificados
sudo cp /etc/letsencrypt/live/seudominio.com.br/fullchain.pem ./ssl/certificate.crt
sudo cp /etc/letsencrypt/live/seudominio.com.br/privkey.pem ./ssl/private.key
```

### Opção 2: Certificado Pago

- Compre em: Cloudflare, DigiCert, etc.
- Coloque os arquivos em: `./ssl/`

---

## ✅ Checklist Antes de Instalar

- [ ] Docker instalado e funcionando
- [ ] Docker Compose instalado
- [ ] Conta Supabase criada
- [ ] Credenciais do Supabase anotadas
- [ ] Domínio registrado e DNS configurado
- [ ] Logo e favicon preparados (opcional)
- [ ] Conta Mercado Pago criada

---

## 🎯 Está Pronto?

Se marcou todos os itens acima, você está pronto para instalar!

**Próximo passo:** Leia `02_INSTALACAO.md`

