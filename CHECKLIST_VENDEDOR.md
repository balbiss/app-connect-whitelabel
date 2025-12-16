# ✅ CHECKLIST DO VENDEDOR

## 📋 Antes de Entregar ao Cliente

Use este checklist para garantir que está entregando um pacote completo e profissional.

---

## 🎯 PREPARAÇÃO DO PACOTE

### Arquivos de Configuração:

- [ ] `env.template` está completo
- [ ] Scripts de instalação testados (`install.sh`, `install.ps1`)
- [ ] `docker-compose.yml` funcionando
- [ ] `nginx.conf` configurado
- [ ] `.gitignore` incluído

### Documentação:

- [ ] `LEIA-ME-PRIMEIRO.txt` revisado
- [ ] `INDEX.md` atualizado com seus contatos
- [ ] `LICENSE.txt` preenchido com seus dados
- [ ] `COMO_VENDER.md` (se aplicável)
- [ ] Todos os MDs da pasta `DOCUMENTACAO/` revisados

### Customização:

- [ ] Seus dados de contato em TODOS os arquivos
- [ ] Email de suporte atualizado
- [ ] WhatsApp de suporte atualizado
- [ ] Links de suporte atualizados
- [ ] Sua empresa/nome nos copyrights

---

## 🎨 PERSONALIZAÇÃO POR CLIENTE

### Antes da Instalação:

- [ ] Receber logo do cliente (.png transparente)
- [ ] Receber favicon do cliente (.ico ou .png 32x32)
- [ ] Definir cores do cliente (HEX codes)
- [ ] Confirmar domínio do cliente
- [ ] Confirmar email de admin do cliente

### Durante Instalação:

- [ ] Criar projeto Supabase para o cliente
- [ ] Anotar URL e Keys do Supabase
- [ ] Configurar `.env` com dados do cliente
- [ ] Colocar logo e favicon na pasta `branding/`
- [ ] Executar script de instalação
- [ ] Executar SQLs no Supabase
- [ ] Testar acesso ao sistema

---

## 🔐 CONFIGURAÇÕES DE SEGURANÇA

### Supabase:

- [ ] RLS habilitado em todas as tabelas
- [ ] Políticas RLS testadas
- [ ] Edge Functions deployadas
- [ ] Edge Function `whatsapp-chatbot` é PÚBLICA
- [ ] Backup automático configurado

### Servidor:

- [ ] SSL/HTTPS configurado (Let's Encrypt)
- [ ] Firewall configurado (portas 80, 443)
- [ ] Docker rodando como serviço (restart automático)
- [ ] Logs sendo salvos
- [ ] Monitoramento configurado (opcional)

---

## 🧪 TESTES PRÉ-ENTREGA

### Funcionalidades Críticas:

- [ ] Login funciona
- [ ] Criar usuário funciona
- [ ] Conectar instância WhatsApp funciona
- [ ] QR Code aparece corretamente
- [ ] Enviar mensagem teste funciona
- [ ] Criar campanha funciona
- [ ] Criar fluxo de chatbot funciona
- [ ] Webhook do chatbot configurado automaticamente
- [ ] Criar cobrança funciona
- [ ] Gerar PIX funciona (se Mercado Pago configurado)
- [ ] Notificações funcionam
- [ ] Analytics mostra dados
- [ ] Exportar relatórios funciona

### Navegadores:

- [ ] Testado no Chrome
- [ ] Testado no Firefox
- [ ] Testado no Edge
- [ ] Testado no Safari (se disponível)
- [ ] Testado em mobile (Chrome mobile)

---

## 📦 ENTREGA AO CLIENTE

### Arquivos a Entregar:

**Opção A: Pasta Completa**
- [ ] Zipar pasta `WHITELABEL APP CONNECT`
- [ ] Tamanho: ~50-100MB
- [ ] Enviar via Google Drive, Dropbox ou similar
- [ ] Enviar link de download por email

**Opção B: Repositório Git** (Mais Profissional)
- [ ] Criar repositório privado (GitHub, GitLab, Bitbucket)
- [ ] Fazer push do código
- [ ] Adicionar cliente como colaborador
- [ ] Enviar link do repositório

### Credenciais a Fornecer:

- [ ] URL do Supabase (se você criou)
- [ ] Anon Key e Service Role Key
- [ ] Email e senha do primeiro admin
- [ ] Link de acesso ao sistema
- [ ] Dados de acesso SSH (se instalou em servidor do cliente)

---

## 📞 PÓS-VENDA

### Primeira Semana:

- [ ] Enviar email de boas-vindas
- [ ] Agendar treinamento inicial (1-2h)
- [ ] Realizar treinamento (gravar se possível)
- [ ] Enviar resumo do treinamento
- [ ] Estar disponível para dúvidas rápidas

### Primeiro Mês:

- [ ] Check-in semanal (WhatsApp ou email)
- [ ] Resolver dúvidas e problemas
- [ ] Coletar feedback
- [ ] Sugerir melhorias
- [ ] Pedir testemunho (se cliente feliz)

### Contínuo:

- [ ] Avisar sobre atualizações
- [ ] Oferecer novos recursos
- [ ] Monitorar uso da API (se usa sua API)
- [ ] Renovar contrato (se mensal)
- [ ] Upsell serviços adicionais

---

## 💰 FINANCEIRO

### Antes de Fechar Venda:

- [ ] Proposta enviada e aceita
- [ ] Valores claros (setup + mensalidade)
- [ ] Forma de pagamento definida
- [ ] Contrato assinado (ambas partes)
- [ ] Nota fiscal emitida (se aplicável)

### Recebimento:

- [ ] Setup recebido (pelo menos 50% adiantado)
- [ ] Mensalidade configurada (boleto, cartão, PIX)
- [ ] Cobrança automática configurada
- [ ] Cliente ciente dos prazos de pagamento

---

## 📊 CONTROLE DE CLIENTES

### Planilha de Controle (Criar):

| Cliente | Data Venda | Plano | Setup | Mensalidade | Status | Próx. Cobrança |
|---------|------------|-------|-------|-------------|--------|----------------|
| Empresa A | 15/12/2025 | Pro | R$ 15k | R$ 997 | Ativo | 15/01/2026 |
| Empresa B | 20/12/2025 | Starter | R$ 8k | R$ 497 | Ativo | 20/01/2026 |

### Informações por Cliente:

- [ ] Nome da empresa
- [ ] CNPJ
- [ ] Contato (nome, email, WhatsApp)
- [ ] Domínio configurado
- [ ] Supabase URL
- [ ] Data de instalação
- [ ] Plano contratado
- [ ] Valor setup
- [ ] Valor mensalidade
- [ ] Dia de vencimento
- [ ] Status (ativo, inadimplente, cancelado)
- [ ] Observações

---

## 🚨 ALERTAS E MONITORAMENTO

### Monitorar (Se Cliente Usa Sua API):

- [ ] Número de instâncias ativas por cliente
- [ ] Volume de mensagens por cliente
- [ ] Uso de recursos (CPU, RAM, banda)
- [ ] Erros ou problemas recorrentes
- [ ] Taxa de uptime da API

### Alertas Configurar:

- [ ] Quando uso > 80% do limite
- [ ] Quando cliente não paga (inadimplência)
- [ ] Quando API fica offline
- [ ] Quando há erros críticos

---

## 📈 MÉTRICAS DE SUCESSO

### KPIs para Acompanhar:

**Vendas:**
- [ ] Número de demos realizadas
- [ ] Taxa de conversão (demos → vendas)
- [ ] Valor médio de venda
- [ ] Tempo médio de fechamento

**Clientes:**
- [ ] Número de clientes ativos
- [ ] Churn rate (cancelamentos)
- [ ] LTV (Lifetime Value por cliente)
- [ ] NPS (satisfação)

**Financeiro:**
- [ ] MRR (Receita Recorrente Mensal)
- [ ] ARR (Receita Recorrente Anual)
- [ ] Taxa de crescimento mensal
- [ ] Custo de aquisição (CAC)

---

## 🎯 METAS SUGERIDAS

### Mês 1:
- [ ] 3 vendas fechadas
- [ ] 3 instalações concluídas
- [ ] 3 clientes satisfeitos
- [ ] 1 testemunho obtido

### Mês 3:
- [ ] 10 clientes ativos
- [ ] R$ 10k+ MRR
- [ ] 5 testemunhos
- [ ] 90%+ satisfação

### Mês 6:
- [ ] 20 clientes ativos
- [ ] R$ 20k+ MRR
- [ ] 10 indicações recebidas
- [ ] 95%+ retenção

### Ano 1:
- [ ] 30-50 clientes ativos
- [ ] R$ 30k-50k MRR
- [ ] Processo de vendas otimizado
- [ ] Equipe de suporte (se necessário)

---

## 📚 KNOWLEDGE BASE

### Criar Base de Conhecimento:

- [ ] Artigos de ajuda comuns
- [ ] Vídeos tutoriais
- [ ] FAQs
- [ ] Casos de uso
- [ ] Best practices

### Ferramentas Sugeridas:

- Notion (grátis)
- GitBook (documentação bonita)
- YouTube (vídeos)
- Loom (gravação de tela)

---

## 🔄 ATUALIZAÇÕES

### Quando Você Atualizar o Sistema:

- [ ] Testar atualização em ambiente local primeiro
- [ ] Documentar mudanças (changelog)
- [ ] Avisar clientes com antecedência (7 dias)
- [ ] Fazer backup antes de atualizar
- [ ] Atualizar um cliente por vez (testar)
- [ ] Ter rollback preparado (caso dê problema)

---

## ⚖️ LEGAL E COMPLIANCE

### Documentos Importantes:

- [ ] Contrato de licença assinado
- [ ] Termo de uso para clientes finais
- [ ] Política de privacidade (LGPD)
- [ ] Termos de serviço
- [ ] SLA (Service Level Agreement)

### LGPD/Proteção de Dados:

- [ ] Cliente é avisado sobre coleta de dados
- [ ] Consentimento explícito para mensagens
- [ ] Opção de opt-out
- [ ] Dados criptografados
- [ ] Backup seguro

---

## 💡 DICAS FINAIS

1. ✅ **Mantenha este checklist atualizado**
2. ✅ **Use para cada novo cliente**
3. ✅ **Documente tudo** (anotações, problemas, soluções)
4. ✅ **Peça feedback** constantemente
5. ✅ **Melhore continuamente** o processo

---

## 🎊 PARABÉNS!

Se você chegou até aqui e marcou todos os itens, você está **PRONTO** para vender e entregar um produto de qualidade!

**Vá em frente e faça acontecer! 🚀💰**

---

*Use este checklist como um guia vivo. Adicione itens conforme sua experiência.*

