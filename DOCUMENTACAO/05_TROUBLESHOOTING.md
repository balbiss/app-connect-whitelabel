# 🐛 TROUBLESHOOTING - Soluções para Problemas Comuns

## 🔍 Problemas Durante Instalação

### ❌ "Docker não está instalado"

**Solução:**
```bash
# Windows
- Baixe Docker Desktop: https://docs.docker.com/desktop/install/windows-install/
- Instale e reinicie o computador
- Execute install.ps1 novamente

# Linux (Ubuntu/Debian)
sudo apt update
sudo apt install docker.io docker-compose
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
# Faça logout e login novamente
```

---

### ❌ "SUPABASE_URL não configurado"

**Causa:** Arquivo `.env` não foi configurado corretamente

**Solução:**
1. Abra o arquivo `.env`
2. Certifique-se de que configurou:
   - `SUPABASE_URL=https://xxx.supabase.co` (sem espaços!)
   - `SUPABASE_ANON_KEY=eyJhbGc...` (chave completa)
3. Salve e execute install novamente

---

###❌ "Porta 80 já está em uso"

**Causa:** Outro serviço está usando a porta 80 (Apache, IIS, outro Nginx)

**Solução Rápida:**
1. Edite o `.env`
2. Mude: `FRONTEND_PORT=8080`
3. Reinicie: `docker-compose up -d`
4. Acesse em: `http://localhost:8080`

**Solução Definitiva:**
```bash
# Parar serviço conflitante
# Apache
sudo systemctl stop apache2
sudo systemctl disable apache2

# Nginx
sudo systemctl stop nginx
sudo systemctl disable nginx

# IIS (Windows - no PowerShell como Admin)
Stop-Service -Name "W3SVC"
```

---

### ❌ "npm run build falhou"

**Causa:** Dependências não instaladas ou incompatíveis

**Solução:**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
npm run build
```

---

### ❌ "Erro ao executar SQL no Supabase"

**Causa:** SQL muito grande ou erro de sintaxe

**Solução:**
1. Execute os SQLs separadamente (um por vez)
2. Vá na pasta: `./backend-supabase/supabase/migrations/`
3. Execute na ordem numérica:
   - 001_profiles.sql
   - 002_connections.sql
   - 003_disparos.sql
   - ... (continua)

---

## 🔍 Problemas Após Instalação

### ❌ "Página em branco / não carrega"

**Soluções:**

**1. Limpar cache do navegador:**
- Pressione: `Ctrl + Shift + R` (hard refresh)
- Ou: `Ctrl + F5`

**2. Verificar se containers estão rodando:**
```bash
docker-compose ps

# Deve mostrar:
# app-connect-frontend    Up (healthy)
```

**3. Ver logs do container:**
```bash
docker-compose logs -f frontend
```

**4. Rebuild completo:**
```bash
docker-compose down
docker-compose up -d --build --force-recreate
```

---

### ❌ "Erro 404 - Not Found"

**Causa:** Rotas do React não configuradas no Nginx

**Solução:**
Verifique se o arquivo `nginx.conf` tem:
```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

Se não tiver, adicione e reinicie:
```bash
docker-compose restart
```

---

### ❌ "Erro ao fazer login / Criar conta"

**Causas possíveis:**

**1. Supabase não configurado:**
- Verifique se o `.env` tem as credenciais corretas
- Teste acessando diretamente: `https://xxx.supabase.co`

**2. Email não confirmado:**
- Vá no Supabase Dashboard
- Authentication → Users
- Clique no usuário → Confirm Email

**3. RLS bloqueando:**
- Execute TODOS os SQLs da pasta migrations
- Certifique-se que as políticas RLS foram criadas

---

### ❌ "WhatsApp não conecta"

**Soluções:**

**1. Verificar API WhatsApp:**
```bash
# Testar se API está online
curl https://weeb.inoovaweb.com.br/status
```

**2. Verificar configuração:**
- Vá em: Configurações
- Verifique se `WHATSAPP_API_URL` está correto

**3. Verificar quota:**
- Entre em contato com o fornecedor
- Pode haver limite de instâncias

---

### ❌ "PIX não é gerado nas cobranças"

**Causas:**

**1. Mercado Pago não configurado:**
- Acesse: Configurações → Pagamentos
- Adicione seu Access Token do Mercado Pago
- Marque como "Padrão"

**2. Chave API inválida:**
- Gere uma nova chave em: https://www.mercadopago.com.br/developers/panel/credentials
- Use a chave de PRODUCTION, não Sandbox

**3. Edge Function não deployada:**
- Vá no Supabase: Edge Functions
- Verifique se `generate-mercado-pago-pix` está deployada

---

### ❌ "Chatbot não responde"

**Checklist:**

- [ ] Fluxo está ATIVO (botão ▶️ Play verde)
- [ ] Webhook configurado na instância
- [ ] Palavra-chave está correta
- [ ] Mensagem enviada para instância correta
- [ ] Edge Function `whatsapp-chatbot` está deployada

**Ver logs:**
1. Supabase Dashboard
2. Edge Functions → whatsapp-chatbot
3. Logs
4. Envie mensagem e veja se aparece log

---

## 🔍 Problemas de Performance

### ⚠️ "Sistema está lento"

**Soluções:**

**1. Aumentar recursos do servidor:**
```bash
# Ver uso de recursos
docker stats

# Se CPU/RAM estiver alta:
# - Upgrade do servidor (mais RAM/CPU)
# - Ou otimizar banco de dados
```

**2. Otimizar banco de dados:**
```sql
-- Executar no Supabase SQL Editor
VACUUM ANALYZE;
REINDEX DATABASE postgres;
```

**3. Limpar dados antigos:**
- Deletar disparos muito antigos
- Limpar conversas de chatbot finalizadas
- Remover notificações lidas

---

## 🔍 Problemas com Docker

### ❌ "docker: command not found"

**Solução:**
```bash
# Linux
sudo systemctl start docker

# Verificar se está rodando
sudo systemctl status docker
```

### ❌ "permission denied"

**Solução:**
```bash
# Adicionar usuário ao grupo docker
sudo usermod -aG docker $USER

# Logout e login novamente
# Ou execute:
newgrp docker
```

### ❌ "Container não inicia"

**Solução:**
```bash
# Ver logs detalhados
docker-compose logs frontend

# Remover e recriar
docker-compose down -v
docker-compose up -d --build
```

---

## 🔍 Problemas com Supabase

### ❌ "Missing authorization header"

**Causa:** Edge Function não está pública

**Solução:**
1. Supabase Dashboard
2. Edge Functions → whatsapp-chatbot
3. Settings → Security
4. Marque: "Allow Anonymous Access"

---

### ❌ "Row Level Security policy violation"

**Causa:** Políticas RLS não foram criadas

**Solução:**
Execute TODOS os SQLs na ordem:
```bash
./backend-supabase/supabase/migrations/001_profiles.sql
./backend-supabase/supabase/migrations/002_connections.sql
# ... continue com todos
```

---

## 🔍 Comandos Úteis para Debug

### Ver status dos containers:
```bash
docker-compose ps
```

### Ver logs em tempo real:
```bash
docker-compose logs -f
```

### Reiniciar tudo:
```bash
docker-compose restart
```

### Rebuild completo:
```bash
docker-compose down
docker-compose up -d --build --force-recreate
```

### Entrar no container:
```bash
docker-compose exec frontend sh
```

### Ver uso de recursos:
```bash
docker stats
```

---

## 📞 Ainda com Problemas?

Se nenhuma solução acima funcionou:

1. **Colete informações:**
   ```bash
   # Versões
   docker --version
   docker-compose --version
   
   # Logs
   docker-compose logs > logs.txt
   
   # Status
   docker-compose ps > status.txt
   ```

2. **Entre em contato com suporte:**
   - 📧 Email: [suporte@vendedor.com.br]
   - 📱 WhatsApp: [XX] XXXXX-XXXX
   - Anexe: logs.txt e status.txt

---

## 💡 DICAS DE PREVENÇÃO

1. ✅ Faça backups regulares (diário recomendado)
2. ✅ Monitore logs do Supabase
3. ✅ Mantenha Docker atualizado
4. ✅ Use SSL/HTTPS em produção
5. ✅ Configure alertas de erro
6. ✅ Teste atualizações em staging primeiro

---

**A maioria dos problemas são resolvidos com:**
1. Reiniciar containers
2. Limpar cache do navegador
3. Verificar arquivo .env

**Não desista! A maioria dos problemas tem solução simples! 💪**

