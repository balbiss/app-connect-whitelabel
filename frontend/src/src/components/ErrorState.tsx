import { memo } from "react";
import { X, RefreshCw } from "lucide-react";
import { GlassCard } from "./GlassCard";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export const ErrorState = memo(({
  title = "Algo deu errado",
  description = "Ocorreu um erro ao carregar os dados. Tente novamente.",
  onRetry,
}: ErrorStateProps) => {
  return (
    <GlassCard className="text-center py-8 sm:py-12 px-4 sm:px-6">
      <div className="text-4xl sm:text-6xl mb-3 sm:mb-4 animate-float">
        <X className="w-12 h-12 sm:w-16 sm:h-16 text-destructive mx-auto" />
      </div>
      <h3 className="text-lg sm:text-xl font-bold mb-2 text-destructive">{title}</h3>
      <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6 px-2">{description}</p>
      {onRetry && (
        <Button
          onClick={onRetry}
          variant="outline"
          className="gap-2 w-full sm:w-auto active:scale-[0.98]"
        >
          <RefreshCw className="w-4 h-4" />
          Tentar novamente
        </Button>
      )}
    </GlassCard>
  );
});
ErrorState.displayName = 'ErrorState';




