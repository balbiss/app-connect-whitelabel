import { useState, useMemo, useCallback, memo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { GlassCard } from "@/components/GlassCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
import { Search, ChevronRight, MessageCircle, Mail, Phone } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { toast } from "sonner";

const Support = memo(() => {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const faqAnswers: Record<string, string> = useMemo(() => ({
    "Como conectar WhatsApp?": "1. Vá em Instâncias\n2. Clique em + Nova Instância\n3. Escaneie o QR Code com seu WhatsApp\n4. Pronto! Sua instância estará conectada.",
    "Limites de envio": "FREE: 100 msgs/dia\nBASIC: 1.000 msgs/dia\nPRO: 10.000 msgs/dia\nENTERPRISE: Ilimitado",
    "Como agendar campanha?": "1. Crie uma nova campanha\n2. Selecione 'Agendar para'\n3. Escolha data e hora\n4. Clique em INICIAR CAMPANHA",
  }), []);

  // Filtrar FAQ baseado na busca (memoizado)
  const filteredFAQ = useMemo(() => {
    if (!debouncedSearchTerm.trim()) return Object.keys(faqAnswers);
    
    const searchLower = debouncedSearchTerm.toLowerCase();
    return Object.keys(faqAnswers).filter(q => 
      q.toLowerCase().includes(searchLower) || 
      faqAnswers[q].toLowerCase().includes(searchLower)
    );
  }, [faqAnswers, debouncedSearchTerm]);

  const handleFAQClick = useCallback((question: string) => {
    toast.info(faqAnswers[question], { duration: 5000 });
  }, [faqAnswers]);

  const handleStartChat = useCallback(() => {
    toast.success("Chat iniciado! Em breve um atendente entrará em contato.");
  }, []);

  return (
    <div className="min-h-screen bg-[hsl(var(--bg-primary))] pb-24">
      <PageHeader
        title="Suporte"
        showBack
        action={
          <button 
            onClick={() => toast.info("Buscar ajuda")}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            <Search className="w-5 h-5" />
          </button>
        }
      />

      <div className="max-w-lg mx-auto px-4 sm:px-6 space-y-3 sm:space-y-4 py-4">
        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar ajuda..."
            className="pl-10 bg-[hsl(var(--bg-input))]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* FAQ */}
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            📚 Perguntas Frequentes
          </h2>

          <div className="space-y-3">
            {filteredFAQ.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Nenhuma pergunta encontrada com "{searchTerm}"</p>
              </div>
            ) : (
              filteredFAQ.map((question) => (
                <button 
                  key={question}
                  onClick={() => handleFAQClick(question)}
                  className="w-full glass rounded-xl p-4 flex items-center justify-between hover:border-[hsl(var(--border-hover))] transition-all active:scale-[0.98]"
                >
                  <span className="text-sm">{question}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              ))
            )}
          </div>
        </div>

        {/* Divisor */}
        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
        </div>

        {/* Chat */}
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            💬 Chat com Suporte
          </h2>

          <GlassCard>
            <div className="text-center mb-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
                <span className="font-medium">Equipe Online 👤</span>
              </div>
              <p className="text-sm text-muted-foreground">Tempo médio: ~2 min</p>
            </div>

            <Button 
              className="w-full bg-gradient-to-r from-accent-purple to-accent-cyan hover:opacity-90 transition-opacity active:scale-[0.98]"
              onClick={handleStartChat}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Iniciar Chat
            </Button>
          </GlassCard>
        </div>

        {/* Contatos */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Outros Contatos</h2>

          <div className="space-y-3">
            <a
              href="mailto:suporte@connect.com"
              className="glass rounded-xl p-4 flex items-center gap-3 hover:border-[hsl(var(--border-hover))] transition-all"
            >
              <Mail className="w-5 h-5 text-accent-purple" />
              <div>
                <div className="text-sm font-medium">Email</div>
                <div className="text-xs text-muted-foreground">suporte@connect.com</div>
              </div>
            </a>

            <a
              href="https://wa.me/5511999999999"
              className="glass rounded-xl p-4 flex items-center gap-3 hover:border-[hsl(var(--border-hover))] transition-all"
            >
              <Phone className="w-5 h-5 text-accent-cyan" />
              <div>
                <div className="text-sm font-medium">WhatsApp</div>
                <div className="text-xs text-muted-foreground">+55 11 99999-9999</div>
              </div>
            </a>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
});

Support.displayName = 'Support';

export default Support;
