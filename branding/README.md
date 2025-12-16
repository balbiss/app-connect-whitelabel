# 🎨 PASTA DE BRANDING

## 📁 Coloque Seus Arquivos Aqui

### Arquivos Necessários:

#### **logo.png** (Obrigatório)
- **Formato:** PNG com fundo transparente
- **Tamanho recomendado:** 200x50px ou 400x100px
- **Uso:** Logo principal do sistema
- **Onde aparece:** Header, rodapé, emails

#### **favicon.ico** (Obrigatório)
- **Formato:** ICO ou PNG
- **Tamanho:** 32x32px ou 64x64px  
- **Uso:** Ícone do navegador (aba)
- **Onde aparece:** Barra do navegador, favoritos

#### **logo-dark.png** (Opcional)
- **Formato:** PNG com fundo transparente
- **Tamanho:** Mesmo da logo.png
- **Uso:** Logo para tema escuro
- **Onde aparece:** Quando tema escuro está ativo

---

## 📐 Especificações Técnicas

### Logo Principal (logo.png):

**Dimensões:**
- Largura: 150-400px
- Altura: 40-100px
- Proporção: 3:1 ou 4:1 (horizontal)

**Formato:**
- PNG-24 com transparência
- Ou SVG (para melhor qualidade)

**Cores:**
- Use cores do seu `.env` (PRIMARY_COLOR, SECONDARY_COLOR)
- Ou logo em preto/branco para flexibilidade

**Exemplos:**
```
✅ BOM: logo_200x50.png (3KB)
✅ BOM: logo_400x100.png (8KB)
❌ RUIM: logo_4000x1000.png (500KB) - muito pesado!
```

### Favicon (favicon.ico):

**Dimensões:**
- 32x32px (padrão)
- 64x64px (alta resolução)
- Pode incluir múltiplos tamanhos no mesmo arquivo

**Formato:**
- ICO (multi-size)
- Ou PNG simples

**Dica:** Use ferramentas online:
- https://favicon.io/ (gera a partir de texto ou imagem)
- https://realfavicongenerator.net/ (gera todos os tamanhos)

---

## 🛠️ Ferramentas Recomendadas

### Para Criar/Editar:

**Logo:**
- 🎨 Figma (online, grátis)
- 🎨 Canva (fácil de usar)
- 🎨 Adobe Illustrator (profissional)
- 🎨 Inkscape (grátis, open source)

**Favicon:**
- 🔧 https://favicon.io/
- 🔧 https://realfavicongenerator.net/
- 🔧 GIMP (grátis)

**Otimizar Imagens:**
- 🚀 TinyPNG: https://tinypng.com/
- 🚀 Squoosh: https://squoosh.app/

---

## 📋 Checklist

Antes de finalizar, verifique:

- [ ] Logo está em PNG transparente
- [ ] Logo tem tamanho adequado (não muito grande)
- [ ] Logo está otimizada (< 50KB)
- [ ] Favicon está em 32x32px ou 64x64px
- [ ] Cores da logo combinam com cores do .env
- [ ] Testou em fundo claro E escuro
- [ ] Logo é legível em tamanhos pequenos

---

## 🔄 Como Aplicar

Após colocar os arquivos aqui:

```bash
# Reiniciar containers
docker-compose restart

# Aguardar 10 segundos
# Recarregar navegador (Ctrl + Shift + R)
```

---

## 💡 Dicas de Design

### Logo Efetiva:

✅ **Simples** - Evite muitos detalhes
✅ **Legível** - Mesmo em tamanhos pequenos
✅ **Versátil** - Funciona em claro e escuro
✅ **Memorável** - Fácil de lembrar
✅ **Profissional** - Transmite confiança

### Cores:

- Use no máximo 3 cores
- Alto contraste com fundo
- Consistente com identidade visual
- Acessível (WCAG 2.1)

---

## 📸 Preview Antes de Aplicar

Teste sua logo online:
- https://looka.com/logo-maker (preview grátis)
- https://www.brandmark.io/ (gerador de logos)

---

**Sua marca, sua identidade! 🎨**

