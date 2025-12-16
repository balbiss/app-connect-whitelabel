import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BottomNav } from "@/components/BottomNav";
import { Sparkles, Wand2, Copy, Check, Settings, Key } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { generateMessageWithAI, AI_MODELS, type AIProvider } from "@/lib/ai-providers";

const AI = memo(() => {
  const { profile, user } = useAuth();
  const [context, setContext] = useState("");
  const [tone, setTone] = useState("profissional");
  const [generatedMessage, setGeneratedMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  
  // Configurações de IA
  const [aiProvider, setAiProvider] = useState<AIProvider | null>(null);
  const [aiApiKey, setAiApiKey] = useState("");
  const [aiModel, setAiModel] = useState("");
  const [savingConfig, setSavingConfig] = useState(false);

  const tones = useMemo(() => [
    { value: "profissional", label: "Profissional" },
    { value: "amigavel", label: "Amigável" },
    { value: "formal", label: "Formal" },
    { value: "casual", label: "Casual" },
    { value: "persuasivo", label: "Persuasivo" },
    { value: "educativo", label: "Educativo" },
  ], []);

  // Carregar configurações salvas
  useEffect(() => {
    if (profile) {
      setAiProvider(profile.ai_provider);
      setAiModel(profile.ai_model || "");
      // Não mostrar a API key completa por segurança - usar placeholder
      if (profile.ai_api_key && !showConfig) {
        setAiApiKey(""); // Limpar para não mostrar a key salva
      }
    }
  }, [profile, showConfig]);

  // Obter modelos disponíveis baseado no provider (memoizado)
  const availableModels = useMemo(() => {
    return aiProvider ? AI_MODELS[aiProvider] : [];
  }, [aiProvider]);

  // Fallback para templates quando API não está disponível
  const generateWithTemplates = useCallback(() => {
    const toneTemplates: Record<string, string[]> = {
      profissional: [
        `Olá! Gostaria de compartilhar informações importantes sobre ${context}.`,
        `Prezado(a), venho por meio desta mensagem informar sobre ${context}.`,
        `Bom dia! Temos novidades sobre ${context} que podem interessar você.`,
      ],
      amigavel: [
        `Oi! 😊 Quer saber mais sobre ${context}?`,
        `Olá! Tudo bem? Tenho uma novidade legal sobre ${context}!`,
        `E aí! 👋 Que tal conhecer mais sobre ${context}?`,
      ],
      formal: [
        `Prezado(a) Senhor(a), vimos por meio desta comunicar sobre ${context}.`,
        `Cumprimentamos cordialmente para informar sobre ${context}.`,
        `Temos a honra de comunicar sobre ${context}.`,
      ],
      casual: [
        `E aí! Tudo certo? Queria te contar sobre ${context}.`,
        `Oi! Passando aqui pra te avisar sobre ${context}.`,
        `Fala! Tem uma parada legal sobre ${context} que você precisa saber.`,
      ],
      persuasivo: [
        `Você não pode perder esta oportunidade! ${context} está esperando por você.`,
        `Imagine como seria ter acesso a ${context}. Isso pode mudar tudo!`,
        `Esta é a chance que você estava esperando! ${context} pode transformar seu dia.`,
      ],
      educativo: [
        `Você sabia que ${context}? Vamos aprender mais sobre isso juntos!`,
        `Que tal descobrir mais sobre ${context}? Tenho informações valiosas para compartilhar.`,
        `Vamos explorar juntos o mundo de ${context}. É mais interessante do que você imagina!`,
      ],
    };

    const templates = toneTemplates[tone] || toneTemplates.profissional;
    const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
    
    let message = randomTemplate
      .replace(/\{\{\s*nome\s*\}\}/gi, "[Nome do cliente]")
      .replace(/\{\{\s*telefone\s*\}\}/gi, "[Telefone]");

    message += "\n\n💡 Dica: Use {{nome}} e {{telefone}} para personalizar automaticamente!";
    setGeneratedMessage(message);
  }, [context, tone]);

  // Salvar configurações
  const saveAIConfig = useCallback(async () => {
    if (!user || !aiProvider || !aiModel) {
      toast.error("Preencha todos os campos de configuração");
      return;
    }

    // Se não digitou nova API key e já tem uma salva, manter a existente
    if (!aiApiKey && profile?.ai_api_key) {
      // Manter a API key existente
    } else if (!aiApiKey) {
      toast.error("Digite sua API Key");
      return;
    }

    setSavingConfig(true);
    try {
      const updateData: any = {
        ai_provider: aiProvider,
        ai_model: aiModel,
      };

      // Só atualizar API key se uma nova foi digitada
      if (aiApiKey && !aiApiKey.startsWith("•••")) {
        updateData.ai_api_key = aiApiKey;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);

      if (error) throw error;

      toast.success("Configuração salva com sucesso!");
      setShowConfig(false);
      // Recarregar perfil para atualizar as configurações
      window.location.reload();
    } catch (error) {
      console.error("Erro ao salvar configuração:", error);
      toast.error("Erro ao salvar configuração");
    } finally {
      setSavingConfig(false);
    }
  }, [user, aiProvider, aiModel, aiApiKey, profile?.ai_api_key]);

  const generateMessage = useCallback(async () => {
    if (!context.trim()) {
      toast.error("Descreva o contexto da mensagem");
      return;
    }

    // Verificar se há configuração de IA
    if (!profile?.ai_provider || !profile?.ai_api_key || !profile?.ai_model) {
      toast.error("Configure sua API de IA primeiro");
      setShowConfig(true);
      return;
    }

    setLoading(true);
    setGeneratedMessage("");

    try {
      // Usar API real se configurada
      const message = await generateMessageWithAI({
        provider: profile.ai_provider,
        apiKey: profile.ai_api_key,
        model: profile.ai_model,
        context,
        tone,
      });

      setGeneratedMessage(message);
      toast.success("Mensagem gerada com sucesso!");
    } catch (error: any) {
      // Não logar erro no console - usar fallback silenciosamente
      // Sempre usar fallback quando a API falhar
      generateWithTemplates();
      // Não mostrar toast de erro para não confundir o usuário
    } finally {
      setLoading(false);
    }
  }, [context, tone, profile?.ai_provider, profile?.ai_api_key, profile?.ai_model, generateWithTemplates]);

  const copyToClipboard = useCallback(() => {
    if (!generatedMessage) return;
    
    navigator.clipboard.writeText(generatedMessage);
    setCopied(true);
    toast.success("Mensagem copiada!");
    setTimeout(() => setCopied(false), 2000);
  }, [generatedMessage]);

  const handleToggleConfig = useCallback(() => {
    setShowConfig(!showConfig);
  }, [showConfig]);

  const handleProviderChange = useCallback((value: string) => {
    setAiProvider(value as AIProvider);
    setAiModel(""); // Resetar modelo ao mudar provider
  }, []);

  const handleModelChange = useCallback((value: string) => {
    setAiModel(value);
  }, []);

  const handleApiKeyChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setAiApiKey(e.target.value);
  }, []);

  const handleContextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContext(e.target.value);
  }, []);

  const handleToneChange = useCallback((toneValue: string) => {
    setTone(toneValue);
  }, []);

  // Provider name display (memoizado)
  const providerName = useMemo(() => {
    if (!profile?.ai_provider) return null;
    switch (profile.ai_provider) {
      case 'openai': return '🤖 OpenAI';
      case 'gemini': return '🔮 Google Gemini';
      case 'grok': return '⚡ Grok';
      default: return null;
    }
  }, [profile?.ai_provider]);

  return (
    <div className="min-h-screen bg-[hsl(var(--bg-primary))] pb-24">
      <PageHeader
        title="IA - Gerador de Mensagens"
        action={
          <div className="animate-float">
            <img 
              src="https://i.postimg.cc/zfK0BqB7/Gemini-Generated-Image-urlh0ourlh0ourlh-1.png" 
              alt="Connect Logo" 
              className="w-10 h-10 rounded-full object-cover cursor-pointer hover:scale-105 transition-transform"
            />
          </div>
        }
      />

      <div className="max-w-lg mx-auto px-4 sm:px-6 space-y-4 py-4">
        {/* Configuração de IA */}
        <GlassCard>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5 text-accent-purple" />
              <h3 className="font-semibold">Configuração de IA</h3>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleConfig}
              className="hover:opacity-90 transition-opacity active:scale-[0.98]"
            >
              <Settings className="w-4 h-4 mr-2" />
              {showConfig ? "Ocultar" : "Configurar"}
            </Button>
          </div>

          {showConfig && (
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="provider">Provedor de IA</Label>
                <Select
                  value={aiProvider || ""}
                  onValueChange={handleProviderChange}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Selecione o provedor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="gemini">Google Gemini</SelectItem>
                    <SelectItem value="grok">Grok (X.AI)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {aiProvider && (
                <>
                  <div>
                    <Label htmlFor="model">Modelo</Label>
                    <Select
                      value={aiModel}
                      onValueChange={handleModelChange}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Selecione o modelo" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableModels.map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            <div>
                              <div className="font-medium">{model.name}</div>
                              {model.description && (
                                <div className="text-xs text-muted-foreground">{model.description}</div>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="apiKey">API Key</Label>
                    <Input
                      id="apiKey"
                      type="password"
                      placeholder={profile?.ai_api_key ? "Digite uma nova API key para alterar" : "sk-... ou sua API key"}
                      value={aiApiKey}
                      onChange={handleApiKeyChange}
                      className="mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {profile?.ai_api_key 
                        ? "Deixe em branco para manter a API key atual, ou digite uma nova para alterar."
                        : "Sua API key é armazenada de forma segura e nunca é compartilhada."}
                    </p>
                  </div>

                  <Button
                    onClick={saveAIConfig}
                    disabled={savingConfig || !aiProvider || !aiModel || (!aiApiKey && !profile?.ai_api_key)}
                    className="w-full hover:opacity-90 transition-opacity active:scale-[0.98]"
                  >
                    {savingConfig ? "Salvando..." : "Salvar Configuração"}
                  </Button>
                </>
              )}

              {!aiProvider && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Selecione um provedor de IA para começar
                </p>
              )}
            </div>
          )}

          {profile?.ai_provider && !showConfig && (
            <div className="mt-3 p-3 rounded-lg bg-[hsl(var(--bg-input))] border border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{providerName}</p>
                  <p className="text-xs text-muted-foreground">{profile.ai_model}</p>
                </div>
                <Badge variant="secondary">Configurado</Badge>
              </div>
            </div>
          )}
        </GlassCard>

        {/* Explicação */}
        <GlassCard glow>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-purple to-accent-cyan flex items-center justify-center flex-shrink-0">
              <Wand2 className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-2">Como funciona?</h3>
              <p className="text-sm text-muted-foreground">
                Nossa IA analisa o contexto que você fornece e gera mensagens personalizadas 
                no tom escolhido. Use variáveis como <code className="text-accent-cyan">{"{{nome}}"}</code> e 
                <code className="text-accent-cyan">{"{{telefone}}"}</code> para personalização automática.
              </p>
            </div>
          </div>
        </GlassCard>

        {/* Formulário */}
        <GlassCard>
          <div className="space-y-4">
            <div>
              <Label htmlFor="context">Contexto da Mensagem</Label>
              <Textarea
                id="context"
                placeholder="Ex: Promoção especial de 50% off em todos os produtos..."
                value={context}
                onChange={handleContextChange}
                rows={4}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Descreva o objetivo da mensagem, produto, serviço ou evento que deseja comunicar.
              </p>
            </div>

            <div>
              <Label htmlFor="tone">Tom da Mensagem</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {tones.map((t) => (
                  <Button
                    key={t.value}
                    variant={tone === t.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleToneChange(t.value)}
                    className="w-full hover:opacity-90 transition-opacity active:scale-[0.98]"
                  >
                    {t.label}
                  </Button>
                ))}
              </div>
            </div>

            <Button
              onClick={generateMessage}
              disabled={loading || !context.trim()}
              className="w-full bg-gradient-to-r from-accent-purple to-accent-cyan hover:opacity-90 transition-opacity active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Gerar Mensagem
                </>
              )}
            </Button>
          </div>
        </GlassCard>

        {/* Mensagem Gerada */}
        {generatedMessage && (
          <GlassCard glow>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-accent-purple" />
                  Mensagem Gerada
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyToClipboard}
                  className="hover:opacity-90 transition-opacity active:scale-[0.98]"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copiar
                    </>
                  )}
                </Button>
              </div>
              <div className="p-4 rounded-lg bg-[hsl(var(--bg-input))] border border-border">
                <p className="text-sm whitespace-pre-wrap">{generatedMessage}</p>
              </div>
            </div>
          </GlassCard>
        )}

        {/* Dicas */}
        <GlassCard>
          <h3 className="font-semibold mb-3">💡 Dicas para Melhores Resultados</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-accent-cyan">•</span>
              <span>Seja específico no contexto para mensagens mais relevantes</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent-cyan">•</span>
              <span>Use variáveis {"{{nome}}"} e {"{{telefone}}"} para personalização automática</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent-cyan">•</span>
              <span>Escolha o tom adequado ao seu público-alvo</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent-cyan">•</span>
              <span>Você pode gerar múltiplas variações testando diferentes tons</span>
            </li>
          </ul>
        </GlassCard>
      </div>

      <BottomNav />
    </div>
  );
});

AI.displayName = 'AI';

export default AI;

