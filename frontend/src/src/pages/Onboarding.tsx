import { useState } from "react";
import { GradientButton } from "@/components/GradientButton";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Sparkles, Smartphone, BarChart3, ChevronRight, Rocket } from "lucide-react";

const slides = [
  {
    icon: Sparkles,
    title: "Disparos Inteligentes",
    description: "Envie mensagens em massa no WhatsApp com IA",
    color: "text-accent-purple",
  },
  {
    icon: Smartphone,
    title: "Conecte seu WhatsApp",
    description: "Escaneie o QR Code e comece a enviar",
    color: "text-accent-cyan",
  },
  {
    icon: BarChart3,
    title: "Acompanhe em Tempo Real",
    description: "Monitore entregas, erros e performance das campanhas",
    color: "text-accent-pink",
  },
];

export default function Onboarding() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      navigate("/login");
    }
  };

  const handleSkip = () => {
    navigate("/login");
  };

  const slide = slides[currentSlide];
  const Icon = slide.icon;
  const isLastSlide = currentSlide === slides.length - 1;

  return (
    <div className="min-h-screen bg-[hsl(var(--bg-primary))] flex flex-col relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[hsl(var(--bg-primary))] opacity-30" />
      <div className="absolute top-20 -right-20 w-96 h-96 bg-accent-purple/20 rounded-full blur-[100px]" />
      <div className="absolute bottom-20 -left-20 w-96 h-96 bg-accent-cyan/20 rounded-full blur-[100px]" />

      {/* Skip Button */}
      {!isLastSlide && (
        <div className="relative z-10 flex justify-end p-4">
          <Button variant="ghost" onClick={handleSkip}>
            Skip
          </Button>
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 text-center">
        {/* Icon */}
        <div className="mb-8 animate-float">
          <div className="glass rounded-3xl p-8 inline-block glow-purple">
            <Icon className={`w-24 h-24 ${slide.color}`} />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold mb-4 gradient-text">{slide.title}</h1>

        {/* Description */}
        <p className="text-lg text-muted-foreground mb-12 max-w-sm">{slide.description}</p>

        {/* Indicators */}
        <div className="flex gap-2 mb-8">
          {slides.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentSlide
                  ? "w-8 bg-gradient-to-r from-accent-purple to-accent-cyan"
                  : "w-2 bg-muted"
              }`}
            />
          ))}
        </div>

        {/* Button */}
        <GradientButton onClick={handleNext} size="lg" className="min-w-[200px]">
          {isLastSlide ? (
            <>
              Começar Agora <Rocket className="w-5 h-5 ml-2" />
            </>
          ) : (
            <>
              Próximo <ChevronRight className="w-5 h-5 ml-2" />
            </>
          )}
        </GradientButton>
      </div>
    </div>
  );
}
