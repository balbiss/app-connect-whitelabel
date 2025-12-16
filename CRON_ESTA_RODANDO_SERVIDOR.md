# ⚠️ Problema: Cron Está Rodando Servidor

## ❌ O Que Está Acontecendo

Pelos logs, o container está executando:
```
> node src/server.js
🚀 Servidor rodando na porta 3001
```

**Mas deveria executar:**
```
> npm run cron
🕐 Iniciando cron jobs...
```

---

## ✅ Solução: Corrigir Command no Coolify

### Passo 1: Acessar Configuração

1. No Coolify, vá para a aplicação **`app-connect-backend-cron`**
2. Clique em **"Configuration"** ou **"Settings"** ou **"Edit"**

### Passo 2: Procurar Campo "Command"

Procure por:
- **"Command"** ou
- **"Start Command"** ou
- **"Docker Command"** ou
- **"CMD"** ou
- **"Override Command"**

### Passo 3: Verificar/Corrigir

**Deve estar:**
```
npm run cron
```

**Se estiver vazio ou com outro valor:**
- Apague o que estiver
- Digite: `npm run cron`
- Salve

### Passo 4: Redeploy

1. Clique em **"Redeploy"** ou **"Restart"**
2. Aguarde o container reiniciar
3. Verifique os logs novamente

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

## 🔍 Como Verificar se Está Correto

### Se os logs mostrarem:
- ❌ "Server listening at http://0.0.0.0:3001" → **ERRADO** (está rodando servidor)
- ✅ "🕐 Iniciando cron jobs..." → **CORRETO** (está rodando cron)

---

## 📝 Resumo

1. Vá em **Configuration** da aplicação `app-connect-backend-cron`
2. Procure **"Command"**
3. Coloque: `npm run cron`
4. **Salve**
5. **Redeploy**
6. Verifique logs

**Vá corrigir o Command no Coolify!** 🚀

