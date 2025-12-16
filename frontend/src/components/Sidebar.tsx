import { memo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  Home, 
  Smartphone, 
  Send, 
  BarChart3, 
  Settings, 
  Users, 
  Contact,
  LogOut,
  Crown
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { Badge } from "@/components/ui/badge";

const Sidebar = memo(() => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const { isAdmin } = useAdmin();

  const menuItems = [
    { path: "/", icon: Home, label: "Dashboard" },
    { path: "/instances", icon: Smartphone, label: "Instâncias" },
    { path: "/create", icon: Send, label: "Criar Campanha" },
    { path: "/campaigns", icon: BarChart3, label: "Campanhas" },
    { path: "/extract-members", icon: Users, label: "Disparar Grupos" },
    { path: "/extract-contacts", icon: Contact, label: "Extrair Contatos" },
    { path: "/analytics", icon: BarChart3, label: "Analytics" },
    { path: "/settings", icon: Settings, label: "Configurações" },
  ];

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const handleLogout = async () => {
    if (confirm('Tem certeza que deseja sair?')) {
      try {
        await signOut();
      } catch (error) {
        console.error('Erro ao fazer logout:', error);
      }
    }
  };

  return (
    <div className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:z-50 glass">
      {/* Logo/Header */}
      <div className="flex items-center h-16 px-6">
        <div className="flex items-center gap-3">
          <img 
            src="https://i.postimg.cc/zfK0BqB7/Gemini-Generated-Image-urlh0ourlh0ourlh-1.png" 
            alt="Connect Logo" 
            className="w-10 h-10 rounded-full object-cover"
          />
          <div>
            <h1 className="text-lg font-bold gradient-text">Connect</h1>
            <p className="text-xs text-muted-foreground">WhatsApp SaaS</p>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                active
                  ? 'bg-gradient-to-r from-accent-purple/20 to-accent-cyan/20 text-white border border-accent-purple/30'
                  : 'text-muted-foreground hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? 'text-accent-cyan' : ''}`} />
              <span>{item.label}</span>
            </button>
          );
        })}

        {/* Admin Link */}
        {(() => {
          // Debug log
          console.log('🔍 [Sidebar] isAdmin check:', {
            isAdmin,
            profileEmail: profile?.email,
            profileIsAdmin: profile?.is_admin,
          });
          return isAdmin;
        })() && (
          <button
            onClick={() => navigate("/admin")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              isActive("/admin")
                ? 'bg-gradient-to-r from-accent-purple/20 to-accent-cyan/20 text-white border border-accent-purple/30'
                : 'text-muted-foreground hover:bg-white/5 hover:text-white'
            }`}
          >
            <Crown className={`w-5 h-5 ${isActive("/admin") ? 'text-accent-cyan' : ''}`} />
            <span>Admin</span>
          </button>
        )}
      </nav>

      {/* User Info & Logout */}
      <div className="px-4 py-4 space-y-3">
        {/* User Profile */}
        <div className="px-2">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-purple to-accent-cyan flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">
                {profile?.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate text-white">{profile?.name || 'Usuário'}</p>
              <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
            </div>
          </div>
          
          {/* Plano Badge */}
          {profile?.plan && (
            <div className="ml-[52px]">
              <Badge className="bg-gradient-to-r from-accent-purple to-accent-cyan text-white border-0 text-xs px-2 py-0.5">
                {profile.plan.toUpperCase()}
              </Badge>
            </div>
          )}
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-all"
        >
          <LogOut className="w-5 h-5" />
          <span>Sair</span>
        </button>
      </div>
    </div>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;

