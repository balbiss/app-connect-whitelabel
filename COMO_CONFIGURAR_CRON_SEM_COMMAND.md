# 🔧 Configurar Cron Sem Campo "Command" no Coolify

## ✅ Solução: Usar Dockerfile Separado

Criei um **Dockerfile.cron** separado que já executa o cron automaticamente.

---

## 🎯 PASSO 1: Atualizar Aplicação no Coolify

### 1.1. Acessar Configuração

1. No Coolify, vá para a aplicação **`app-connect-backend-cron`**
2. Clique em **"Configuration"** ou **"Settings"** ou **"Edit"**

### 1.2. Mudar Dockerfile Location

**Procure por:**
- **"Dockerfile Location"** ou
- **"Dockerfile"** ou
- **"Dockerfile Path"**

**Mude de:**
```
Dockerfile
```

**Para:**
```
Dockerfile.cron
```

### 1.3. Salvar

Clique em **"Save"**

---

## 🎯 PASSO 2: Redeploy

1. Clique em **"Redeploy"** ou **"Rebuild"**
2. Aguarde o build completar
3. Verifique os logs

---

## ✅ Logs Corretos (Depois da Correção)

**Deve aparecer:**
```
> app-connect-backend-api@1.0.0 cron
> node src/cron/index.js

🕐 Iniciando cron jobs...
✅ Cron jobs iniciados:
   - Executar campanhas agendadas: a cada minuto
```

**A cada minuto:**
```
[2025-12-16T23:XX:XX.XXXZ] Executando campanhas agendadas...
✅ Campanhas processadas: X
```

---

## 🔍 Verificar

### Se os logs mostrarem:
- ❌ "Server listening at http://0.0.0.0:3001" → **AINDA ERRADO**
- ✅ "🕐 Iniciando cron jobs..." → **CORRETO!**

---

## 📝 Resumo

1. Vá em **Configuration** da aplicação `app-connect-backend-cron`
2. Procure **"Dockerfile Location"**
3. Mude para: `Dockerfile.cron`
4. **Salve**
5. **Redeploy**
6. Verifique logs

**Mude o Dockerfile Location para `Dockerfile.cron`!** 🚀

