import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ReactNode, memo } from "react";

interface GradientButtonProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: "purple-cyan" | "pink-red" | "blue";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  type?: "button" | "submit";
}

export const GradientButton = memo(({
  children,
  onClick,
  className,
  variant = "purple-cyan",
  size = "md",
  disabled,
  type = "button",
}: GradientButtonProps) => {
  const gradients = {
    "purple-cyan": "bg-gradient-to-r from-accent-purple to-accent-cyan",
    "pink-red": "bg-gradient-to-r from-accent-pink to-red-500",
    "blue": "bg-gradient-to-r from-accent-blue to-accent-cyan",
  };

  const sizes = {
    sm: "h-9 px-4 text-sm",
    md: "h-12 px-6 text-base",
    lg: "h-14 px-8 text-lg",
  };

  return (
    <Button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative overflow-hidden font-semibold transition-all duration-300",
        "hover:scale-[0.98] active:scale-95",
        "shadow-lg hover:shadow-xl",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "hover:animate-pulse-glow",
        gradients[variant],
        sizes[size],
        className
      )}
      style={{
        boxShadow: variant === "purple-cyan" 
          ? "0 8px 32px hsl(var(--accent-purple) / 0.4)" 
          : "0 8px 32px hsl(var(--accent-pink) / 0.4)",
      }}
    >
      {children}
    </Button>
  );
});
GradientButton.displayName = 'GradientButton';
