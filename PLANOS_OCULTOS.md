# 🔒 PLANOS OCULTOS DOS USUÁRIOS

## ✅ Alterações Realizadas

Os planos foram ocultados dos usuários para permitir vendas com valores personalizados para cada cliente.

### O que foi alterado:

1. **Rota `/plans` removida:**
   - Agora redireciona para o dashboard (`/`)
   - Usuários não podem acessar a página de planos

2. **Seção de planos removida da Landing Page:**
   - Seção "Escolha o plano ideal para você" foi removida
   - Botão "Teste Grátis" removido

3. **Links para planos removidos/alterados:**
   - **Create.tsx:** Redireciona para dashboard com mensagem
   - **Instances.tsx:** Redireciona para dashboard com mensagem
   - **Checkout.tsx:** Redireciona para dashboard após pagamento
   - **Register.tsx:** Redireciona para dashboard após registro
   - **Settings.tsx:** Botão de planos mostra mensagem informativa

4. **Admin ainda pode gerenciar planos:**
   - Painel Admin (`/admin`) continua funcionando
   - Admin pode ver e editar planos normalmente

---

## 💡 Como vender agora:

1. **Criar usuário no sistema**
2. **Ativar assinatura manualmente via Admin:**
   - Acesse: `/admin`
   - Aba "Usuários"
   - Selecione o usuário
   - Clique em "Editar"
   - Selecione o plano e defina o preço personalizado
   - Ative a assinatura

3. **Ou usar Edge Function:**
   - Use a função `ativar-assinatura-manual` para ativar via API

---

## 📝 Notas:

- Os planos continuam funcionando no backend
- Apenas a visualização foi removida do frontend
- Admin pode gerenciar tudo normalmente
- Usuários não veem mais preços ou planos

---

## 🔄 Para reativar os planos:

Se precisar reativar no futuro, basta:
1. Descomentar a rota `/plans` no `App.tsx`
2. Descomentar a seção de planos na `Landing.tsx`
3. Restaurar os links nas outras páginas

