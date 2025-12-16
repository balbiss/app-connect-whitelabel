# 🔧 Corrigir Healthcheck no Coolify

## ❌ Problema

O healthcheck está falhando porque:
1. `wget` não está instalado na imagem Alpine
2. O servidor precisa de mais tempo para iniciar

## ✅ Solução Aplicada

1. ✅ Instalar `wget` no Dockerfile
2. ✅ Aumentar `start-period` de 5s para 30s

## 🔄 Próximo Passo

### Opção 1: Redeploy (Recomendado)

1. No Coolify, clique em **"Redeploy"** ou **"Rebuild"**
2. Aguarde o build completar
3. O healthcheck deve funcionar agora

### Opção 2: Desabilitar Healthcheck no Coolify

Se ainda der problema:

1. No Coolify, vá em **"Configuration"** ou **"Settings"**
2. Procure por **"Healthcheck"**
3. **Desabilite** o healthcheck
4. O container vai rodar mesmo sem healthcheck

---

## ✅ Status Atual

Pelos logs, o servidor **ESTÁ RODANDO**:
- ✅ Supabase conectado
- ✅ Redis conectado
- ✅ Servidor na porta 3001

O problema é apenas o healthcheck. O servidor está funcionando!

---

## 🧪 Testar Manualmente

Depois do redeploy, teste:

```bash
curl http://seu-coolify-domain/app-connect-backend-api/health
```

Deve retornar:
```json
{
  "status": "healthy",
  "services": {
    "supabase": "connected",
    "redis": "connected"
  }
}
```

