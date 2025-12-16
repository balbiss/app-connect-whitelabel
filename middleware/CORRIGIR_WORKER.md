# 🔧 CORRIGIR WORKER NO COOLIFY

## ❌ Problema

O Worker está tentando rodar como API:
- Está executando `npm start` em vez de `npm run worker`
- Está tentando iniciar servidor HTTP (não precisa)
- Healthcheck está falhando (Worker não expõe porta)

---

## ✅ Solução

### Opção 1: Desabilitar Healthcheck (Recomendado)

1. **No Coolify, vá na aplicação `whatsapp-middleware-worker`**

2. **Vá em "Healthcheck"** (no menu lateral)

3. **Desabilite o healthcheck:**
   - Desmarque a opção "Enable Healthcheck"
   - OU configure para não fazer healthcheck

4. **Verifique o Command:**
   - Deve estar: `npm run worker`
   - Se estiver `npm start`, mude para `npm run worker`

5. **Salve e faça Redeploy**

---

### Opção 2: Usar Dockerfile Específico

1. **No Coolify, vá em "General"**

2. **Dockerfile Location:**
   - Mude para: `middleware/Dockerfile.worker`
   - (em vez de apenas `Dockerfile`)

3. **Salve e faça Redeploy**

---

## 📋 Verificar Logs

Depois do deploy, vá em "Logs" e deve aparecer:

```
✅ Redis conectado
🚀 Worker iniciado
Aguardando jobs...
```

**NÃO deve aparecer:**
- "Server listening at http://..."
- "Servidor rodando na porta..."

---

## ✅ Pronto!

O Worker não precisa de servidor HTTP, apenas processa jobs da fila!

