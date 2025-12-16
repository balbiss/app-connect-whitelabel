# 🎨 GUIA DE PERSONALIZAÇÃO

## 🌟 Transforme o Sistema na SUA MARCA!

Este guia mostra como personalizar completamente o APP CONNECT para sua marca.

---

## 1️⃣ LOGO E FAVICON

### 1.1. Preparar Arquivos

**Logo Principal:**
- **Formato:** PNG com fundo transparente
- **Tamanho recomendado:** 200x50px ou 400x100px
- **Nome:** `logo.png`

**Favicon:**
- **Formato:** ICO ou PNG
- **Tamanho:** 32x32px ou 64x64px
- **Nome:** `favicon.ico`

**Logo Tema Escuro (Opcional):**
- **Formato:** PNG com fundo transparente
- **Tamanho:** Mesmo da logo principal
- **Nome:** `logo-dark.png`

### 1.2. Substituir Arquivos

```bash
# Copiar seus arquivos para:
./branding/logo.png
./branding/favicon.ico
./branding/logo-dark.png  # Opcional
```

**Windows:**
- Cole seus arquivos na pasta: `WHITELABEL APP CONNECT\branding\`

### 1.3. Aplicar Mudanças

```bash
docker-compose restart
```

**⏱️ Aguarde 10 segundos e recarregue o navegador (Ctrl+Shift+R)**

---

## 2️⃣ CORES DO SISTEMA

### 2.1. Escolher Paleta de Cores

Use ferramentas online:
- https://coolors.co/ (gerador de paletas)
- https://color.adobe.com/ (Adobe Color)

Você precisa de 3 cores em formato HEX:
- **Primária:** Cor principal do sistema
- **Secundária:** Cor secundária/complementar
- **Destaque:** Cor para botões/CTAs

### 2.2. Configurar no .env

Edite o arquivo `.env`:

```env
# Cores do tema (HEX)
PRIMARY_COLOR="#8b5cf6"    # Roxo (padrão)
SECONDARY_COLOR="#06b6d4"  # Ciano (padrão)
ACCENT_COLOR="#ec4899"     # Rosa (padrão)
```

**Exemplo - Paleta Azul/Verde:**
```env
PRIMARY_COLOR="#3b82f6"    # Azul
SECONDARY_COLOR="#10b981"  # Verde
ACCENT_COLOR="#f59e0b"     # Laranja
```

**Exemplo - Paleta Vermelha/Preta:**
```env
PRIMARY_COLOR="#ef4444"    # Vermelho
SECONDARY_COLOR="#1f2937"  # Cinza escuro
ACCENT_COLOR="#fbbf24"     # Amarelo dourado
```

### 2.3. Aplicar Cores

```bash
# Rebuild do container
docker-compose up -d --build
```

**⏱️ Aguarde 1-2 minutos para o build**

---

## 3️⃣ NOME E TÍTULOS

### 3.1. Nome do Sistema

Edite o `.env`:

```env
APP_NAME="SuaMarca Connect"
APP_SUBTITLE="Seu Slogan Aqui"
```

**Exemplos:**
```env
# Exemplo 1
APP_NAME="ZapMaster"
APP_SUBTITLE="Automação Inteligente"

# Exemplo 2  
APP_NAME="MegaZap Pro"
APP_SUBTITLE="Disparo em Massa"

# Exemplo 3
APP_NAME="ChatFlow"
APP_SUBTITLE="Chatbot + WhatsApp"
```

### 3.2. Aplicar

```bash
docker-compose up -d --build
```

---

## 4️⃣ DOMÍNIO PERSONALIZADO

### 4.1. Configurar DNS

No seu provedor de domínio (Registro.br, GoDaddy, etc.):

```
Tipo: A
Nome: connect (ou @, se for domínio principal)
Valor: IP_DO_SEU_SERVIDOR
TTL: 3600
```

**Exemplo:**
- Domínio: meusite.com.br
- Subdomínio: connect.meusite.com.br
- IP do servidor: 82.29.59.13

### 4.2. Configurar no Sistema

Edite o `.env`:

```env
DOMAIN=connect.meusite.com.br
```

### 4.3. Aplicar

```bash
docker-compose restart
```

### 4.4. Aguardar Propagação DNS

⏱️ Pode levar de 5 minutos a 24 horas

Verificar:
```bash
# Linux/Mac
nslookup connect.meusite.com.br

# Windows
nslookup connect.meusite.com.br
```

---

## 5️⃣ SSL/HTTPS (Segurança)

### 5.1. Gerar Certificado (Let's Encrypt - Grátis)

```bash
# Instalar Certbot
sudo apt update
sudo apt install certbot

# Parar nginx temporariamente
docker-compose stop

# Gerar certificado
sudo certbot certonly --standalone -d connect.meusite.com.br

# Copiar certificados
sudo cp /etc/letsencrypt/live/connect.meusite.com.br/fullchain.pem ./ssl/certificate.crt
sudo cp /etc/letsencrypt/live/connect.meusite.com.br/privkey.pem ./ssl/private.key

# Ajustar permissões
sudo chmod 644 ./ssl/*.crt
sudo chmod 600 ./ssl/*.key
```

### 5.2. Habilitar HTTPS no Nginx

Edite o arquivo `nginx.conf` e descomente a seção SSL (linhas com `#`).

### 5.3. Reiniciar

```bash
docker-compose up -d
```

### 5.4. Testar

Acesse: **https://connect.meusite.com.br** (com S)

---

## 6️⃣ PERSONALIZAÇÃO AVANÇADA

### 6.1. Cores CSS Customizadas

Para alterações mais avançadas, edite:
```
./frontend/src/index.css
```

Procure por `:root` e modifique as variáveis CSS.

### 6.2. Textos e Mensagens

Todos os textos estão nos componentes React:
```
./frontend/src/pages/*.tsx
./frontend/src/components/*.tsx
```

### 6.3. Rebuild Após Mudanças

```bash
cd frontend
npm run build
cd ..
docker-compose up -d --build
```

---

## 7️⃣ CONFIGURAR MERCADO PAGO

### 7.1. Obter Chave API

1. Acesse: https://www.mercadopago.com.br
2. Faça login
3. Vá em: **Developers** → **Credenciais**
4. Copie o **Access Token** (Production)

### 7.2. Configurar no Sistema

1. Acesse seu sistema
2. Faça login como admin
3. Vá em: **Configurações** → **Pagamentos**
4. Clique em **"Adicionar Provedor"**
5. Selecione: **Mercado Pago**
6. Cole o **Access Token**
7. Marque como **Padrão**
8. Salve

✅ Agora as cobranças vão gerar PIX automaticamente!

---

## 8️⃣ CONFIGURAR API WHATSAPP

### 8.1. Sobre a API

A API WhatsApp já está configurada e pronta para uso:
- **URL:** https://weeb.inoovaweb.com.br
- **Fornecedor:** Incluído no pacote
- **Suporte:** Pelo vendedor do sistema

### 8.2. Criar Instância

1. No sistema, vá em: **Instâncias**
2. Clique em **"+ Nova Instância"**
3. Preencha o nome
4. Escaneie o QR Code com WhatsApp
5. ✅ Conectado!

**Observação:** Cada instância conectada consome recursos da API.

---

## 9️⃣ TEMAS E APARÊNCIA

### 9.1. Modo Escuro/Claro

O sistema já tem tema escuro/claro automático baseado nas preferências do navegador.

Para forçar um tema, edite:
```
./frontend/src/App.tsx
```

### 9.2. Fontes

Para mudar a fonte, edite:
```
./frontend/index.html
```

Adicione o link do Google Fonts e atualize o CSS.

---

## 🔟 MENSAGENS PADRÃO

### 10.1. Email de Boas-Vindas

Configurado no Supabase:
- **Settings** → **Authentication** → **Email Templates**

### 10.2. Mensagens do Chatbot

Edite os fluxos no painel:
- **Chatbot** → **Fluxos** → **Editar Fluxo**

---

## ✅ CHECKLIST DE PERSONALIZAÇÃO

- [ ] Logo substituída
- [ ] Favicon substituído
- [ ] Cores configuradas no .env
- [ ] Nome do sistema alterado
- [ ] Domínio configurado
- [ ] SSL/HTTPS habilitado
- [ ] Mercado Pago configurado
- [ ] Instância WhatsApp conectada
- [ ] Testado em navegador
- [ ] Testado em mobile

---

## 🎯 RESULTADO

Após todas essas personalizações, o sistema estará **100% com sua identidade visual**!

Ninguém saberá que é um white label. 🎭

---

## 💡 DICAS

1. **Mantenha backups** antes de fazer mudanças grandes
2. **Teste em ambiente local** antes de aplicar em produção
3. **Use cores acessíveis** (contraste mínimo de 4.5:1)
4. **Otimize imagens** (use TinyPNG ou similar)
5. **Teste em múltiplos navegadores** (Chrome, Firefox, Safari)

---

**Seu sistema, sua marca, seu sucesso! 🚀**

