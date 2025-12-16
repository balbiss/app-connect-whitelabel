import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  width?: string | number;
  height?: string | number;
}

export const Skeleton = ({ 
  className, 
  variant = 'rectangular',
  width,
  height,
  style,
  ...props 
}: SkeletonProps) => {
  const baseClasses = "animate-pulse bg-bg-input rounded";
  
  const variantClasses = {
    text: "h-4 w-full",
    circular: "rounded-full",
    rectangular: "w-full",
    card: "w-full h-32",
  };

  const combinedStyle = {
    width: width || (variant === 'circular' ? height : undefined),
    height: height || (variant === 'circular' ? width : undefined),
    ...style,
  };

  return (
    <div
      className={cn(baseClasses, variantClasses[variant], className)}
      style={combinedStyle}
      {...props}
    />
  );
};

export const SkeletonCard = () => (
  <div className="glass rounded-xl p-4 space-y-3">
    <Skeleton variant="rectangular" height={20} width="60%" />
    <Skeleton variant="rectangular" height={16} width="40%" />
    <Skeleton variant="rectangular" height={12} width="80%" />
  </div>
);

export const SkeletonList = ({ count = 3 }: { count?: number }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
);




