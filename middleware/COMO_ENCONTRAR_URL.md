# 🔍 COMO ENCONTRAR A URL DA API

## ❌ Problema

Você está tentando acessar: `coolify.visitaia.com.br/api/messages/health`

Mas essa não é a URL da aplicação middleware!

---

## ✅ Solução

### Opção 1: Verificar no Coolify

1. **No Coolify, vá na aplicação `whatsapp-middleware-api`**
2. **Procure por "Domains" ou "Links"** (no menu lateral ou na tela)
3. **Você verá a URL gerada automaticamente**, algo como:
   - `http://uc08ws4s8okgk400o44wkss8.72.60.136.16.sslip.io`
   - Ou outro domínio gerado pelo Coolify

4. **Use essa URL para testar:**
   ```
   http://sua-url-gerada/api/messages/health
   ```

---

### Opção 2: Configurar Domínio Customizado

Se quiser usar um domínio customizado:

1. **No Coolify, vá em "Domains"**
2. **Adicione um domínio:**
   - Exemplo: `middleware.visitaia.com.br`
3. **Configure o DNS:**
   - Adicione um registro CNAME apontando para o domínio do Coolify
4. **Aguarde a propagação DNS**
5. **Teste:**
   ```
   http://middleware.visitaia.com.br/api/messages/health
   ```

---

### Opção 3: Verificar nos Logs

1. **No Coolify, vá em "Logs"**
2. **Procure por mensagens como:**
   - "Server listening at http://..."
   - Ou a URL do container

---

## 📋 Teste Correto

Depois de encontrar a URL correta, teste:

```
http://SUA-URL-DO-COOLIFY/api/messages/health
```

Deve retornar:
```json
{"success":true,"status":"healthy","timestamp":"..."}
```

---

## 💡 Dica

A URL do middleware é **diferente** da URL do frontend!

- Frontend: `connect.visitaia.com.br`
- Middleware: `sua-url-gerada-pelo-coolify` ou `middleware.visitaia.com.br`

