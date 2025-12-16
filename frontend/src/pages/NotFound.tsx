import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, memo } from "react";
import { Button } from "@/components/ui/button";
import { Home, AlertCircle } from "lucide-react";

const NotFound = memo(() => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[hsl(var(--bg-primary))] flex items-center justify-center p-4">
      <div className="text-center max-w-md mx-auto space-y-6">
        <div className="w-24 h-24 mx-auto bg-destructive/20 rounded-full flex items-center justify-center">
          <AlertCircle className="w-12 h-12 text-destructive" />
        </div>
        <div className="space-y-2">
          <h1 className="text-6xl font-bold gradient-text">404</h1>
          <p className="text-xl text-muted-foreground">Página não encontrada</p>
          <p className="text-sm text-muted-foreground">
            A página que você está procurando não existe ou foi movida.
          </p>
        </div>
        <Button
          onClick={() => navigate("/")}
          className="bg-gradient-to-r from-accent-purple to-accent-cyan hover:opacity-90 transition-opacity active:scale-[0.98]"
        >
          <Home className="w-4 h-4 mr-2" />
          Voltar para Home
        </Button>
      </div>
    </div>
  );
});

NotFound.displayName = 'NotFound';

export default NotFound;
