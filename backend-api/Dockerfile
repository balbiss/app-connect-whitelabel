FROM node:18-alpine

WORKDIR /app

# Instalar wget para healthcheck
RUN apk add --no-cache wget

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências (usar npm install se não tiver package-lock.json)
RUN npm install --omit=dev || npm install --production

# Copiar código fonte
COPY . .

# Expor porta
EXPOSE 3001

# Healthcheck (aguardar mais tempo para o servidor iniciar)
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3001/health || exit 1

# Comando padrão
CMD ["npm", "start"]

