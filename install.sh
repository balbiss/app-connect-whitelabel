#!/bin/bash

# ============================================
# SCRIPT DE INSTALAÇÃO AUTOMÁTICA
# APP CONNECT - WHITE LABEL
# ============================================

set -e  # Parar se houver erro

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Banner
echo -e "${PURPLE}"
echo "╔═══════════════════════════════════════════════════════╗"
echo "║                                                       ║"
echo "║          🚀 APP CONNECT - INSTALAÇÃO                 ║"
echo "║              WHITE LABEL EDITION                      ║"
echo "║                                                       ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# ============================================
# VERIFICAR REQUISITOS
# ============================================
echo -e "${CYAN}📋 Verificando requisitos...${NC}"

# Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker não está instalado!${NC}"
    echo -e "${YELLOW}Instale em: https://docs.docker.com/get-docker/${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker instalado${NC}"

# Docker Compose
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Docker Compose não está instalado!${NC}"
    echo -e "${YELLOW}Instale em: https://docs.docker.com/compose/install/${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker Compose instalado${NC}"

echo ""

# ============================================
# VERIFICAR ARQUIVO .env
# ============================================
echo -e "${CYAN}📝 Verificando arquivo .env...${NC}"

if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  Arquivo .env não encontrado!${NC}"
    echo -e "${YELLOW}Criando a partir de .env.example...${NC}"
    cp .env.example .env
    echo ""
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}⚠️  IMPORTANTE: Configure o arquivo .env ANTES de continuar!${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${YELLOW}Edite o arquivo .env e configure:${NC}"
    echo -e "  1. ${CYAN}DOMAIN${NC} - Seu domínio"
    echo -e "  2. ${CYAN}SUPABASE_URL${NC} - URL do seu projeto Supabase"
    echo -e "  3. ${CYAN}SUPABASE_ANON_KEY${NC} - Chave pública do Supabase"
    echo -e "  4. ${CYAN}ADMIN_EMAIL${NC} - Email do administrador"
    echo ""
    echo -e "${YELLOW}Depois execute novamente: ${CYAN}./install.sh${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Arquivo .env encontrado${NC}"

# Carregar variáveis do .env
set -a
source .env
set +a

# Verificar variáveis obrigatórias
echo -e "${CYAN}🔍 Validando configurações...${NC}"

if [ -z "$SUPABASE_URL" ] || [ "$SUPABASE_URL" == "https://seu-projeto.supabase.co" ]; then
    echo -e "${RED}❌ SUPABASE_URL não configurado!${NC}"
    echo -e "${YELLOW}Configure no arquivo .env${NC}"
    exit 1
fi

if [ -z "$SUPABASE_ANON_KEY" ] || [ "$SUPABASE_ANON_KEY" == "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." ]; then
    echo -e "${RED}❌ SUPABASE_ANON_KEY não configurado!${NC}"
    echo -e "${YELLOW}Configure no arquivo .env${NC}"
    exit 1
fi

if [ -z "$DOMAIN" ] || [ "$DOMAIN" == "connect.seudominio.com.br" ]; then
    echo -e "${RED}❌ DOMAIN não configurado!${NC}"
    echo -e "${YELLOW}Configure no arquivo .env${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Configurações validadas${NC}"
echo ""

# ============================================
# MOSTRAR CONFIGURAÇÕES
# ============================================
echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${PURPLE}📊 CONFIGURAÇÕES DO SISTEMA${NC}"
echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}🌐 Domínio:${NC} $DOMAIN"
echo -e "${CYAN}📡 Supabase:${NC} $SUPABASE_URL"
echo -e "${CYAN}📱 API WhatsApp:${NC} $WHATSAPP_API_URL"
echo -e "${CYAN}👤 Admin:${NC} ${ADMIN_EMAIL:-Não configurado}"
echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Confirmação
read -p "$(echo -e ${YELLOW}Continuar com a instalação? [s/N]: ${NC})" -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[SsYy]$ ]]; then
    echo -e "${RED}Instalação cancelada.${NC}"
    exit 1
fi
echo ""

# ============================================
# CRIAR PASTAS NECESSÁRIAS
# ============================================
echo -e "${CYAN}📁 Criando estrutura de pastas...${NC}"

mkdir -p ssl
mkdir -p branding
mkdir -p data/postgres
mkdir -p logs

echo -e "${GREEN}✅ Pastas criadas${NC}"
echo ""

# ============================================
# VERIFICAR BRANDING
# ============================================
echo -e "${CYAN}🎨 Verificando arquivos de marca...${NC}"

if [ ! -f branding/logo.png ]; then
    echo -e "${YELLOW}⚠️  Logo não encontrada em branding/logo.png${NC}"
    echo -e "${YELLOW}   Usando logo padrão. Você pode substituir depois.${NC}"
fi

if [ ! -f branding/favicon.ico ]; then
    echo -e "${YELLOW}⚠️  Favicon não encontrado em branding/favicon.ico${NC}"
    echo -e "${YELLOW}   Usando favicon padrão. Você pode substituir depois.${NC}"
fi

echo ""

# ============================================
# BUILD DO FRONTEND
# ============================================
echo -e "${CYAN}🔨 Fazendo build do frontend...${NC}"
echo -e "${YELLOW}(Isso pode levar 1-2 minutos)${NC}"
echo ""

cd frontend
npm install --legacy-peer-deps
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erro ao fazer build do frontend!${NC}"
    exit 1
fi

cd ..
echo -e "${GREEN}✅ Build concluído${NC}"
echo ""

# ============================================
# INICIAR CONTAINERS
# ============================================
echo -e "${CYAN}🚀 Iniciando containers Docker...${NC}"
echo ""

docker-compose down 2>/dev/null || true  # Parar containers antigos se existirem
docker-compose up -d --build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erro ao iniciar containers!${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Containers iniciados com sucesso!${NC}"
echo ""

# ============================================
# VERIFICAR STATUS
# ============================================
echo -e "${CYAN}🔍 Verificando status dos containers...${NC}"
sleep 3  # Aguardar containers iniciarem

docker-compose ps

echo ""

# ============================================
# INSTRUÇÕES FINAIS
# ============================================
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 INSTALAÇÃO CONCLUÍDA COM SUCESSO!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${CYAN}📋 PRÓXIMOS PASSOS:${NC}"
echo ""
echo -e "${YELLOW}1. Configure o DNS do seu domínio:${NC}"
echo -e "   - Tipo: A"
echo -e "   - Nome: ${DOMAIN}"
echo -e "   - Valor: $(curl -s ifconfig.me || echo 'SEU_IP_AQUI')"
echo ""
echo -e "${YELLOW}2. Execute os SQLs no Supabase:${NC}"
echo -e "   ${CYAN}./install-database.sh${NC}"
echo ""
echo -e "${YELLOW}3. Acesse o sistema:${NC}"
echo -e "   ${CYAN}http://${DOMAIN}${NC}"
echo -e "   ${CYAN}http://localhost${NC} (se estiver local)"
echo ""
echo -e "${YELLOW}4. Faça login com email de admin:${NC}"
echo -e "   ${CYAN}${ADMIN_EMAIL}${NC}"
echo ""
echo -e "${YELLOW}5. Configure o Mercado Pago:${NC}"
echo -e "   - Acesse: Configurações > Pagamentos"
echo -e "   - Adicione sua chave API do Mercado Pago"
echo ""
echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${PURPLE}📚 DOCUMENTAÇÃO COMPLETA:${NC}"
echo -e "   ${CYAN}./DOCUMENTACAO/${NC}"
echo ""
echo -e "${PURPLE}🆘 SUPORTE:${NC}"
echo -e "   ${CYAN}Leia: TROUBLESHOOTING.md${NC}"
echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}✨ Sistema pronto para uso! Boa sorte! 🚀${NC}"
echo ""

