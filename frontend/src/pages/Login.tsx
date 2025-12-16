import { useState } from "react";
import { Eye, EyeOff, Mail, Lock, Loader2 } from "lucide-react";
import { GradientButton } from "@/components/GradientButton";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signIn, signInWithGoogle } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação básica
    if (!email.trim() || !password.trim()) {
      toast.error("Preencha todos os campos");
      return;
    }
    
    // Ativar loading imediatamente
    setLoading(true);
    
    // Feedback visual imediato
    toast.loading("Entrando...", { id: "login-loading" });

    try {
      await signIn(email, password);
      
      // Fechar toast de loading e mostrar sucesso
      toast.dismiss("login-loading");
      toast.success("Login realizado com sucesso!");
      
      // Navegar após um breve delay
      setTimeout(() => {
        navigate("/");
      }, 500);
    } catch (error: any) {
      // Fechar toast de loading e mostrar erro
      toast.dismiss("login-loading");
      toast.error(error.message || "Erro ao fazer login");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--bg-primary))] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Glow effects */}
      <div className="absolute top-20 left-10 w-64 h-64 bg-accent-purple/20 rounded-full blur-[100px] animate-float" />
      <div className="absolute bottom-20 right-10 w-80 h-80 bg-accent-cyan/20 rounded-full blur-[100px] animate-float" style={{ animationDelay: "-1.5s" }} />

      <div className="w-full max-w-md z-10 animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-xl overflow-hidden glow-purple animate-float">
              <img 
                src="https://i.postimg.cc/zfK0BqB7/Gemini-Generated-Image-urlh0ourlh0ourlh-1.png" 
                alt="Connect Logo" 
                className="w-full h-full object-cover"
              />
            </div>
            <h1 className="text-3xl font-bold gradient-text">Connect</h1>
          </div>
          <p className="text-muted-foreground">Disparos WhatsApp com IA</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="glass rounded-2xl p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-11 h-12 bg-bg-input border-border/50 focus:border-accent-purple"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-11 pr-11 h-12 bg-bg-input border-border/50 focus:border-accent-purple"
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox id="remember" />
              <label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">
                Lembrar-me
              </label>
            </div>
            <Link to="/forgot-password" className="text-sm text-accent-purple hover:text-accent-cyan transition-colors">
              Esqueceu a senha?
            </Link>
          </div>

          <GradientButton 
            type="submit" 
            className="w-full" 
            size="lg"
            disabled={loading || !email.trim() || !password.trim()}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Entrando...
              </>
            ) : (
              "Entrar"
            )}
          </GradientButton>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/30" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card px-2 text-muted-foreground">ou</span>
            </div>
          </div>

          <button
            type="button"
            onClick={async () => {
              if (loading) return; // Prevenir múltiplos cliques
              
              setLoading(true);
              toast.loading("Entrando com Google...", { id: "google-login-loading" });
              
              try {
                await signInWithGoogle();
                toast.dismiss("google-login-loading");
                toast.success("Login realizado com sucesso!");
                setTimeout(() => {
                  navigate("/");
                }, 500);
              } catch (error: any) {
                toast.dismiss("google-login-loading");
                toast.error(error.message || "Erro ao fazer login com Google");
                setLoading(false);
              }
            }}
            disabled={loading}
            className="w-full h-12 glass-hover rounded-xl flex items-center justify-center gap-2 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Entrar com Google
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Não tem conta?{" "}
          <Link to="/register" className="text-accent-purple font-semibold hover:text-accent-cyan transition-colors">
            Criar conta grátis →
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
