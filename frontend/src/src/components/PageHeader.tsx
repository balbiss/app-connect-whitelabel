import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ReactNode, memo, useCallback } from "react";

interface PageHeaderProps {
  title: string;
  showBack?: boolean;
  action?: ReactNode;
}

export const PageHeader = memo(({ title, showBack = false, action }: PageHeaderProps) => {
  const navigate = useNavigate();

  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  return (
    <header className="sticky top-0 z-40 glass px-4 py-3 mb-4 safe-top">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          {showBack && (
            <button
              onClick={handleBack}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors flex-shrink-0"
              aria-label="Voltar"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <h1 className="text-lg sm:text-xl font-bold">{title}</h1>
        </div>
        {action && <div className="flex-shrink-0 ml-2">{action}</div>}
      </div>
    </header>
  );
});
PageHeader.displayName = 'PageHeader';
