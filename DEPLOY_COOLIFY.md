# 🚀 DEPLOY NO COOLIFY - GUIA COMPLETO

## 📋 O QUE É COOLIFY?

Coolify é uma plataforma de deploy self-hosted (você hospeda no seu próprio servidor) que facilita o deploy de aplicações Docker.

---

## ✅ PRÉ-REQUISITOS

- [ ] Coolify instalado e rodando
- [ ] Acesso ao painel do Coolify
- [ ] Domínio configurado (opcional, mas recomendado)
- [ ] Banco de dados Supabase criado e configurado
- [ ] Build do frontend já feito (pasta `frontend/dist`)

---

## 🎯 OPÇÃO 1: DEPLOY COM DOCKER COMPOSE (Recomendado)

### Passo 1: Preparar Arquivos

1. **Compactar o projeto:**
   ```bash
   # No Windows (PowerShell)
   Compress-Archive -Path "WHITELABEL APP CONNECT" -DestinationPath "app-connect.zip"
   ```

2. **Ou faça upload via Git:**
   - Crie um repositório Git
   - Faça commit de todos os arquivos
   - Use o link do repositório no Coolify

### Passo 2: Criar Aplicação no Coolify

1. Acesse o painel do Coolify
2. Clique em **"New Resource"** → **"Application"**
3. Escolha **"Docker Compose"**

### Passo 3: Configurar Docker Compose

**Cole o conteúdo do `docker-compose.yml`:**

```yaml
version: '3.8'

services:
  frontend:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: app-connect-frontend
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
      - ./branding:/usr/share/nginx/html/branding:ro
    environment:
      - DOMAIN=${DOMAIN}
    restart: unless-stopped
    networks:
      - app-network

networks:
  app-network:
    driver: bridge
```

### Passo 4: Configurar Variáveis de Ambiente

No Coolify, adicione estas variáveis de ambiente:

```env
# Supabase
SUPABASE_URL=https://oxpcmdejlcmsopjbqncf.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94cGNtZGVqbGNtc29wamJxbmNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MzY5NjMsImV4cCI6MjA4MTQxMjk2M30.1FBpKmn-I5oJ7OniEqCT4tmutdldzC34CJXcefFuyEg
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94cGNtZGVqbGNtc29wamJxbmNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTgzNjk2MywiZXhwIjoyMDgxNDEyOTYzfQ.J6Xt-8mAdWB4rTJunEK8jPvNFD73MlL5wL9SPXx_vCU

# Frontend Build
VITE_SUPABASE_URL=https://oxpcmdejlcmsopjbqncf.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94cGNtZGVqbGNtc29wamJxbmNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MzY5NjMsImV4cCI6MjA4MTQxMjk2M30.1FBpKmn-I5oJ7OniEqCT4tmutdldzC34CJXcefFuyEg

# WhatsApp API
WHATSAPP_API_URL=https://weeb.inoovaweb.com.br

# Domínio
DOMAIN=connect.visitaia.com.br

# Admin
ADMIN_EMAIL=guilhermedigitalworld@gmail.com
```

### Passo 5: Ajustar Dockerfile para Build no Coolify

O Dockerfile precisa ser ajustado para funcionar no Coolify. Crie um `Dockerfile` na raiz:

```dockerfile
# ============================================
# DOCKERFILE PARA COOLIFY
# ============================================

# Etapa 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Copiar package.json
COPY frontend/package*.json ./

# Instalar dependências
RUN npm install --legacy-peer-deps

# Copiar código fonte
COPY frontend/ ./

# Build arguments (serão passados pelo Coolify)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_WHATSAPP_API_URL

# Configurar variáveis de ambiente para o build
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_WHATSAPP_API_URL=$VITE_WHATSAPP_API_URL

# Fazer build
RUN npm run build

# Etapa 2: Servir com Nginx
FROM nginx:alpine

# Remover configuração padrão
RUN rm /etc/nginx/conf.d/default.conf

# Copiar arquivos buildados
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar configuração customizada do nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expor porta
EXPOSE 80 443

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

# Iniciar nginx
CMD ["nginx", "-g", "daemon off;"]
```

### Passo 6: Deploy

1. No Coolify, clique em **"Deploy"**
2. Aguarde o build e deploy
3. ✅ Pronto! A aplicação estará rodando

---

## 🎯 OPÇÃO 2: DEPLOY APENAS DO FRONTEND (Mais Simples)

Se você já fez o build localmente, pode fazer deploy apenas do frontend buildado:

### Passo 1: Criar Dockerfile Simples

Crie um `Dockerfile` na raiz:

```dockerfile
FROM nginx:alpine

# Copiar arquivos buildados
COPY frontend/dist /usr/share/nginx/html

# Copiar configuração nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
```

### Passo 2: No Coolify

1. Crie uma nova aplicação
2. Escolha **"Dockerfile"**
3. Aponte para o Dockerfile
4. Configure o domínio
5. Deploy!

---

## 🔧 CONFIGURAÇÕES IMPORTANTES NO COOLIFY

### 1. Portas

- **Porta HTTP:** 80
- **Porta HTTPS:** 443

### 2. Domínio

- Configure o domínio: `connect.visitaia.com.br`
- O Coolify gerencia SSL automaticamente (Let's Encrypt)

### 3. Variáveis de Ambiente

Certifique-se de adicionar TODAS as variáveis listadas acima.

### 4. Volumes (Opcional)

Se quiser manter logo/branding:
- `./branding:/usr/share/nginx/html/branding:ro`

---

## 📝 CHECKLIST PARA O CLIENTE

- [ ] Coolify instalado e acessível
- [ ] Banco Supabase criado e migrações executadas
- [ ] Variáveis de ambiente configuradas no Coolify
- [ ] Domínio apontando para o servidor do Coolify
- [ ] Dockerfile configurado
- [ ] Deploy executado com sucesso
- [ ] SSL/HTTPS funcionando (gerenciado pelo Coolify)
- [ ] Primeiro usuário admin criado

---

## 🆘 PROBLEMAS COMUNS

### Erro: "Build failed"
→ Verifique se todas as variáveis de ambiente estão configuradas
→ Verifique se o Dockerfile está correto

### Erro: "Cannot connect to Supabase"
→ Verifique se as credenciais do Supabase estão corretas
→ Verifique se o Supabase permite conexões do IP do servidor

### SSL não funciona
→ O Coolify gerencia SSL automaticamente
→ Aguarde alguns minutos após configurar o domínio
→ Verifique se o DNS está apontando corretamente

---

## ✅ PRONTO!

Após o deploy, o sistema estará acessível em:
**https://connect.visitaia.com.br**

O cliente pode criar a primeira conta e começar a usar!

---

## 📞 SUPORTE

Se tiver problemas, verifique:
1. Logs no Coolify
2. Status do container
3. Variáveis de ambiente
4. Configuração do domínio/DNS

