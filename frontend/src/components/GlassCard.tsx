import { cn } from "@/lib/utils";
import { ReactNode, CSSProperties, memo } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
  style?: CSSProperties;
  onClick?: () => void;
  id?: string;
}

export const GlassCard = memo(({ children, className, hover = true, glow = false, style, onClick, id }: GlassCardProps) => {
  return (
    <div
      id={id}
      className={cn(
        "glass rounded-2xl p-4 sm:p-5 transition-all duration-300",
        hover && "glass-hover",
        glow && "glow-purple animate-pulse-glow",
        onClick && "cursor-pointer",
        className
      )}
      style={style}
      onClick={onClick}
    >
      {children}
    </div>
  );
});
GlassCard.displayName = 'GlassCard';
