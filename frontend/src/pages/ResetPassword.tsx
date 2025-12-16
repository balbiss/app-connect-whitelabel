import { useState, useEffect } from "react";
import { Eye, EyeOff, Lock, Check } from "lucide-react";
import { GradientButton } from "@/components/GradientButton";
import { Input } from "@/components/ui/input";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const ResetPassword = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Verificar se há um token de recuperação na URL
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const type = hashParams.get('type');

    if (!accessToken || type !== 'recovery') {
      toast.error("Link inválido ou expirado. Solicite um novo link de recuperação.");
      navigate("/forgot-password");
    }
  }, [navigate]);

  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return { strength: 0, label: "", color: "" };
    if (password.length < 6) return { strength: 33, label: "Fraca", color: "bg-destructive" };
    if (password.length < 10) return { strength: 66, label: "Média", color: "bg-warning" };
    return { strength: 100, label: "Forte", color: "bg-success" };
  };

  const passwordStrength = getPasswordStrength(password);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      setSuccess(true);
      toast.success("Senha redefinida com sucesso!");
      
      // Redirecionar para login após 2 segundos
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (error: any) {
      console.error("Erro ao redefinir senha:", error);
      toast.error(error.message || "Erro ao redefinir senha. O link pode ter expirado.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[hsl(var(--bg-primary))] pb-20">
        <PageHeader title="Senha Redefinida" showBack={false} />
        
        <div className="max-w-md mx-auto px-4">
          <div className="glass rounded-2xl p-8 text-center space-y-6 animate-slide-up">
            <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-success" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Senha Redefinida!</h2>
              <p className="text-muted-foreground">
                Sua senha foi redefinida com sucesso. Você será redirecionado para o login.
              </p>
            </div>

            <GradientButton
              onClick={() => navigate("/login")}
              className="w-full"
              size="lg"
            >
              Ir para Login
            </GradientButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--bg-primary))] pb-20">
      <PageHeader title="Redefinir Senha" showBack={false} />

      <div className="max-w-md mx-auto px-4">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-2">Redefinir Senha</h2>
          <p className="text-muted-foreground">
            Digite sua nova senha abaixo
          </p>
        </div>

        <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Lock className="w-4 h-4" /> Nova Senha
            </label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-11 h-12 bg-bg-input border-border/50 focus:border-accent-purple"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {password && (
              <div className="space-y-1">
                <div className="h-1.5 bg-bg-input rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                    style={{ width: `${passwordStrength.strength}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Força: {passwordStrength.label}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Lock className="w-4 h-4" /> Confirmar Nova Senha
            </label>
            <div className="relative">
              <Input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pr-11 h-12 bg-bg-input border-border/50 focus:border-accent-purple"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {confirmPassword && (
              <div className="flex items-center gap-2 text-xs">
                {passwordsMatch ? (
                  <span className="text-success flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Senhas coincidem
                  </span>
                ) : (
                  <span className="text-destructive">Senhas não coincidem</span>
                )}
              </div>
            )}
          </div>

          <GradientButton 
            type="submit" 
            className="w-full" 
            size="lg"
            disabled={loading || !password || !confirmPassword || !passwordsMatch}
          >
            {loading ? "Redefinindo..." : "Redefinir Senha"}
          </GradientButton>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;

