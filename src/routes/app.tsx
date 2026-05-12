import { createFileRoute, Outlet, useNavigate, Link, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/use-auth";
import { useChurches } from "@/lib/data";
import { Home, Users, Calendar, User, Plus, Loader2, Wallet } from "lucide-react";
import { useState } from "react";
import { QuickAddModal } from "@/components/QuickAddModal";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { data: churches, isLoading: churchesLoading } = useChurches();
  const location = useLocation();
  const [quickOpen, setQuickOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user || churchesLoading) return;
    const hasMatriz = (churches ?? []).some((c) => c.type === "matriz");
    if (!hasMatriz && location.pathname !== "/app/onboarding") {
      navigate({ to: "/app/onboarding" });
    }
  }, [user, churches, churchesLoading, navigate, location.pathname]);

  if (loading || !user || churchesLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const onboarding = location.pathname === "/app/onboarding";

  return (
    <div className="relative min-h-screen bg-background pb-24">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 opacity-70" style={{ background: "var(--gradient-hero)" }} />
      </div>

      <Outlet />

      {!onboarding && (
        <BottomNav active={location.pathname} onPlus={() => setQuickOpen(true)} />
      )}
      <QuickAddModal open={quickOpen} onClose={() => setQuickOpen(false)} />
    </div>
  );
}

type NavItem = { kind: "link"; to: string; icon: typeof Home; label: string } | { kind: "plus" };

function BottomNav({ active, onPlus }: { active: string; onPlus: () => void }) {
  const items: NavItem[] = [
    { kind: "link", to: "/app", icon: Home, label: "Início" },
    { kind: "link", to: "/app/membros", icon: Users, label: "Membros" },
    { kind: "plus" },
    { kind: "link", to: "/app/financeiro", icon: Wallet, label: "Finanças" },
    { kind: "link", to: "/app/perfil", icon: User, label: "Perfil" },
  ];

  return (
    <nav className="fixed bottom-4 left-1/2 z-30 w-[min(100%-1.5rem,28rem)] -translate-x-1/2">
      <div className="glass flex items-center justify-around rounded-full px-2 py-2 shadow-[var(--shadow-soft)]">
        {items.map((it, i) => {
          if (it.kind === "plus") {
            return (
              <button
                key={i}
                onClick={onPlus}
                aria-label="Adicionar"
                className="grid h-12 w-12 -translate-y-3 place-items-center rounded-full text-primary-foreground transition-transform hover:scale-105"
                style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
              >
                <Plus className="h-5 w-5" />
              </button>
            );
          }
          const Icon = it.icon;
          const isActive = active === it.to || (it.to !== "/app" && active.startsWith(it.to));
          return (
            <Link
              key={it.to}
              to={it.to}
              className={`flex h-12 w-12 flex-col items-center justify-center gap-0.5 rounded-full text-[10px] font-medium transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{it.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
