#!/bin/bash

# ============================================
# SCRIPT DE INSTALAÇÃO DO BANCO DE DADOS
# APP CONNECT - WHITE LABEL
# ============================================

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
PURPLE='\033[0;35m'
NC='\033[0m'

echo -e "${PURPLE}"
echo "╔═══════════════════════════════════════════════════════╗"
echo "║                                                       ║"
echo "║     🗄️  INSTALAÇÃO DO BANCO DE DADOS                  ║"
echo "║              (Supabase)                               ║"
echo "║                                                       ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Carregar .env
if [ ! -f .env ]; then
    echo -e "${RED}❌ Arquivo .env não encontrado!${NC}"
    echo -e "${YELLOW}Execute primeiro: ./install.sh${NC}"
    exit 1
fi

set -a
source .env
set +a

echo -e "${CYAN}📊 INSTRUÇÕES PARA INSTALAÇÃO DO BANCO${NC}"
echo ""
echo -e "${YELLOW}Este script vai te guiar para executar os SQLs no Supabase.${NC}"
echo ""
echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ============================================
# OPÇÃO 1: CLI (Automático)
# ============================================
echo -e "${CYAN}OPÇÃO 1: Instalação Automática (Supabase CLI)${NC}"
echo ""

if command -v supabase &> /dev/null; then
    echo -e "${GREEN}✅ Supabase CLI detectado!${NC}"
    echo ""
    read -p "$(echo -e ${YELLOW}Deseja instalar automaticamente via CLI? [s/N]: ${NC})" -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[SsYy]$ ]]; then
        echo -e "${CYAN}📡 Conectando ao Supabase...${NC}"
        
        # Extrair project ref da URL
        PROJECT_REF=$(echo $SUPABASE_URL | sed 's/https:\/\///' | sed 's/.supabase.co//')
        
        echo -e "${YELLOW}Project Ref: $PROJECT_REF${NC}"
        echo ""
        
        # Link ao projeto
        supabase link --project-ref $PROJECT_REF
        
        # Executar migrations
        echo -e "${CYAN}📝 Executando SQLs...${NC}"
        
        for sql_file in backend-supabase/migrations/*.sql; do
            if [ -f "$sql_file" ]; then
                filename=$(basename "$sql_file")
                echo -e "${CYAN}   Executando: $filename${NC}"
                supabase db execute --file "$sql_file"
                
                if [ $? -eq 0 ]; then
                    echo -e "${GREEN}   ✅ $filename - OK${NC}"
                else
                    echo -e "${RED}   ❌ $filename - ERRO${NC}"
                fi
            fi
        done
        
        echo ""
        echo -e "${GREEN}✅ Banco de dados instalado com sucesso!${NC}"
        exit 0
    fi
fi

# ============================================
# OPÇÃO 2: Manual (Dashboard)
# ============================================
echo ""
echo -e "${CYAN}OPÇÃO 2: Instalação Manual (Dashboard)${NC}"
echo ""
echo -e "${YELLOW}Execute os seguintes passos:${NC}"
echo ""
echo -e "1. Acesse: ${CYAN}https://app.supabase.com${NC}"
echo -e "2. Selecione seu projeto"
echo -e "3. Vá em: ${CYAN}SQL Editor${NC}"
echo -e "4. Clique em ${CYAN}+ New Query${NC}"
echo -e "5. Copie e cole o conteúdo do arquivo:"
echo -e "   ${CYAN}./backend-supabase/migrations/install-all.sql${NC}"
echo -e "6. Clique em ${CYAN}Run${NC} (ou pressione Ctrl+Enter)"
echo -e "7. Aguarde a execução (pode levar 1-2 minutos)"
echo ""
echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}✅ Após executar os SQLs, o banco estará pronto!${NC}"
echo ""
echo -e "${CYAN}📝 Arquivo para executar:${NC}"
echo -e "${YELLOW}$(pwd)/backend-supabase/migrations/install-all.sql${NC}"
echo ""

# Abrir arquivo no editor padrão (opcional)
read -p "$(echo -e ${YELLOW}Deseja abrir o arquivo SQL agora? [s/N]: ${NC})" -n 1 -r
echo ""
if [[ $REPLY =~ ^[SsYy]$ ]]; then
    if command -v xdg-open &> /dev/null; then
        xdg-open ./backend-supabase/migrations/install-all.sql
    elif command -v open &> /dev/null; then
        open ./backend-supabase/migrations/install-all.sql
    else
        echo -e "${YELLOW}Abra manualmente: ./backend-supabase/migrations/install-all.sql${NC}"
    fi
fi

