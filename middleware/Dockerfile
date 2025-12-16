FROM node:18-alpine

WORKDIR /app

# Instalar curl para healthcheck
RUN apk add --no-cache curl

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production

# Copiar código fonte
COPY . .

# Expor porta
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/messages/health || exit 1

# Comando padrão (pode ser sobrescrito no docker-compose ou Coolify)
CMD ["npm", "start"]

