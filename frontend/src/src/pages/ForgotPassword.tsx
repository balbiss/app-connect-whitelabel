import { useState } from "react";
import { Mail, ArrowLeft } from "lucide-react";
import { GradientButton } from "@/components/GradientButton";
import { Input } from "@/components/ui/input";
import { Link, useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setEmailSent(true);
      toast.success("Email de recuperação enviado! Verifique sua caixa de entrada.");
    } catch (error: any) {
      console.error("Erro ao enviar email de recuperação:", error);
      toast.error(error.message || "Erro ao enviar email de recuperação. Verifique se o email está correto.");
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-[hsl(var(--bg-primary))] pb-20">
        <PageHeader title="Email Enviado" showBack />
        
        <div className="max-w-md mx-auto px-4">
          <div className="glass rounded-2xl p-8 text-center space-y-6 animate-slide-up">
            <div className="w-16 h-16 bg-accent-purple/20 rounded-full flex items-center justify-center mx-auto">
              <Mail className="w-8 h-8 text-accent-purple" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Email Enviado!</h2>
              <p className="text-muted-foreground">
                Enviamos um link de recuperação de senha para:
              </p>
              <p className="font-semibold text-accent-purple">{email}</p>
            </div>

            <div className="space-y-4 pt-4">
              <div className="bg-bg-input rounded-lg p-4 text-left space-y-2">
                <p className="text-sm font-medium">Próximos passos:</p>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Verifique sua caixa de entrada</li>
                  <li>Clique no link de recuperação de senha</li>
                  <li>Defina uma nova senha</li>
                </ol>
              </div>

              <p className="text-xs text-muted-foreground">
                Não recebeu o email? Verifique sua pasta de spam ou tente novamente.
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <GradientButton
                onClick={() => {
                  setEmailSent(false);
                  setEmail("");
                }}
                variant="pink-red"
                className="flex-1"
              >
                Enviar Novamente
              </GradientButton>
              <GradientButton
                onClick={() => navigate("/login")}
                className="flex-1"
              >
                Voltar ao Login
              </GradientButton>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--bg-primary))] pb-20">
      <PageHeader title="Recuperar Senha" showBack />

      <div className="max-w-md mx-auto px-4">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-2">Esqueceu sua senha?</h2>
          <p className="text-muted-foreground">
            Digite seu email e enviaremos um link para redefinir sua senha
          </p>
        </div>

        <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 space-y-5">
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
              />
            </div>
          </div>

          <GradientButton 
            type="submit" 
            className="w-full" 
            size="lg"
            disabled={loading || !email.trim()}
          >
            {loading ? "Enviando..." : "Enviar Link de Recuperação"}
          </GradientButton>

          <div className="text-center">
            <Link 
              to="/login" 
              className="text-sm text-accent-purple hover:text-accent-cyan transition-colors inline-flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar ao login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;

