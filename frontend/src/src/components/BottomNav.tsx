import { Home, Smartphone, Send, BarChart3, Settings, Shield } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAdmin } from "@/hooks/useAdmin";
import { memo, useMemo } from "react";

const navItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Smartphone, label: "Instâncias", path: "/instances" },
  { icon: Send, label: "Disparos", path: "/create" },
  { icon: BarChart3, label: "Campanhas", path: "/campaigns" },
  { icon: Settings, label: "Config", path: "/settings" },
];

export const BottomNav = memo(() => {
  const { isAdmin, profile } = useAdmin();
  
  // Debug log
  console.log('🔍 [BottomNav] isAdmin check:', {
    isAdmin,
    profileEmail: profile?.email,
    profileIsAdmin: profile?.is_admin,
  });
  
  // Adicionar item Admin se for admin (memoizado)
  const allNavItems = useMemo(() => {
    return isAdmin 
      ? [...navItems, { icon: Shield, label: "Admin", path: "/admin" }]
      : navItems;
  }, [isAdmin]);

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 glass safe-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {allNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all duration-300 text-muted-foreground ${
                item.path === '/admin' ? 'bg-gradient-to-br from-accent-purple/20 to-accent-cyan/20' : ''
              }`}
              activeClassName="text-foreground bg-gradient-to-br from-accent-purple/20 to-accent-cyan/20 glow-purple"
            >
              <Icon className="w-5 h-5 transition-all" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
});
BottomNav.displayName = 'BottomNav';
