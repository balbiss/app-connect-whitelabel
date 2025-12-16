# 🔧 Corrigir Rota /health

## ❌ Problema

O Coolify está adicionando o prefixo `/app-connect-backend-api` na URL:
- URL acessada: `/app-connect-backend-api/health`
- Servidor esperava: `/health`
- Erro: `Route GET:/app-connect-backend-api/health not found`

## ✅ Solução Aplicada

Adicionei rota que aceita qualquer prefixo:
- `/health` → Funciona
- `/*/health` → Funciona com qualquer prefixo (incluindo `/app-connect-backend-api/health`)

## 🔄 Próximo Passo

1. **Redeploy no Coolify**
   - Clique em "Redeploy"
   - Aguarde build completar

2. **Testar novamente**
   - Acesse: `http://seu-coolify/app-connect-backend-api/health`
   - Deve retornar JSON com status "healthy"

## ✅ Alternativa: Configurar Coolify

Se ainda não funcionar, você pode:

1. No Coolify, vá em **"Configuration"** → **"Domains"**
2. Configure um domínio customizado sem prefixo
3. Ou ajuste o proxy reverso para não adicionar prefixo

Mas a solução atual deve funcionar! 🚀

