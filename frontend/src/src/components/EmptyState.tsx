import { memo, ReactNode } from "react";
import { GlassCard } from "./GlassCard";
import { GradientButton } from "./GradientButton";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState = memo(({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) => {
  return (
    <GlassCard className="text-center py-8 sm:py-12 px-4 sm:px-6">
      {icon && (
        <div className="text-4xl sm:text-6xl mb-3 sm:mb-4 animate-float">
          {icon}
        </div>
      )}
      <h3 className="text-lg sm:text-xl font-bold mb-2">{title}</h3>
      <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6 px-2">{description}</p>
      {actionLabel && onAction && (
        <GradientButton onClick={onAction} size="lg" className="w-full sm:w-auto">
          {actionLabel}
        </GradientButton>
      )}
    </GlassCard>
  );
});
EmptyState.displayName = 'EmptyState';




