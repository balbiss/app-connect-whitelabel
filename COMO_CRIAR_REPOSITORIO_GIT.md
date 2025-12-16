# 📦 COMO CRIAR REPOSITÓRIO GIT PARA COOLIFY

## 🎯 PASSO A PASSO RÁPIDO

### **1. Criar Repositório no GitHub**

1. Acesse: **https://github.com**
2. Faça login (ou crie conta)
3. Clique no botão **"+"** (canto superior direito) → **"New repository"**
4. Preencha:
   - **Repository name:** `app-connect-whitelabel` (ou nome de sua preferência)
   - **Description:** "App Connect White Label - Sistema WhatsApp SaaS"
   - **Visibility:** Escolha **Private** (recomendado) ou **Public**
   - **NÃO marque** "Add a README file"
   - **NÃO marque** "Add .gitignore"
   - **NÃO marque** "Choose a license"
5. Clique em **"Create repository"**

### **2. Conectar Repositório Local ao GitHub**

Depois de criar o repositório, o GitHub vai mostrar comandos. Execute estes comandos no PowerShell:

```powershell
# Navegar para a pasta do projeto
cd "C:\Users\inoov\Downloads\APP CONNECT DISPARO\blastwave-ai-10977-main\WHITELABEL APP CONNECT"

# Adicionar remote (substitua SEU_USUARIO pelo seu usuário do GitHub)
git remote add origin https://github.com/SEU_USUARIO/app-connect-whitelabel.git

# Fazer push
git branch -M main
git push -u origin main
```

**⚠️ IMPORTANTE:** Substitua `SEU_USUARIO` pelo seu usuário do GitHub!

### **3. No Coolify**

Depois de fazer push para o GitHub:

1. Volte para a tela inicial do Coolify
2. Clique em **"Private Repository (with GitHub App)"** ou **"Public Repository"**
3. Conecte sua conta GitHub
4. Selecione o repositório: `app-connect-whitelabel`
5. Configure o Dockerfile e variáveis de ambiente
6. Deploy!

---

## ✅ ALTERNATIVA: Usar Repositório Público Temporário

Se quiser testar rápido, pode criar um repositório **Público** temporariamente e depois mudar para privado.

---

## 📝 NOTA IMPORTANTE

O arquivo `.env` está no `.gitignore`, então **NÃO será enviado** para o Git (isso é bom para segurança!).

As variáveis de ambiente você configura direto no Coolify (já fizemos isso).

---

**Crie o repositório no GitHub e me avise quando estiver pronto para conectar!**

