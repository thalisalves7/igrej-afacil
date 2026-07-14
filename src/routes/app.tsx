import { createFileRoute, Outlet, useNavigate, Link, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/use-auth";
import { useChurches } from "@/lib/data";
import { useOrgContext, can, type AppRole } from "@/lib/org";
import { Home, Users, User, Plus, Loader2, Wallet, Shield, AlertCircle } from "lucide-react";
import { useState } from "react";
import { QuickAddModal } from "@/components/QuickAddModal";
import { InstallPrompt } from "@/components/InstallPrompt";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { data: churches, isLoading: churchesLoading } = useChurches();
  const { data: orgCtx, isLoading: orgLoading } = useOrgContext();
  const location = useLocation();
  const [quickOpen, setQuickOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user || churchesLoading || orgLoading) return;
    // Only the owner of an organization can/should create the matriz.
    // Invited members (admin/treasurer/secretary/branch_leader) never see onboarding.
    if (!orgCtx?.is_owner) return;
    const hasMatriz = (churches ?? []).some((c) => c.type === "matriz");
    if (!hasMatriz && location.pathname !== "/app/onboarding") {
      navigate({ to: "/app/onboarding" });
    }
  }, [user, churches, churchesLoading, orgCtx, orgLoading, navigate, location.pathname]);

  if (loading || !user || churchesLoading || orgLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // Invited user without a valid org link — never show onboarding or blank screen.
  if (!orgCtx) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-6">
        <div className="neu-card max-w-sm p-8 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-destructive/10 text-destructive">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-lg font-semibold">Sua conta não está configurada</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Fale com o administrador do ministério para liberar seu acesso.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex h-11 items-center justify-center rounded-full text-sm font-semibold text-primary-foreground"
              style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
            >
              Tentar novamente
            </button>
            <button
              onClick={async () => {
                await signOut();
                navigate({ to: "/auth" });
              }}
              className="inline-flex h-11 items-center justify-center rounded-full border border-input bg-background text-sm font-medium hover:bg-accent"
            >
              Sair
            </button>
          </div>
        </div>
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
        <RoleAwareBottomNav active={location.pathname} onPlus={() => setQuickOpen(true)} />
      )}
      <QuickAddModal open={quickOpen} onClose={() => setQuickOpen(false)} />
      {!onboarding && <InstallPrompt />}
    </div>
  );
}


function RoleAwareBottomNav({ active, onPlus }: { active: string; onPlus: () => void }) {
  const { data: ctx } = useOrgContext();
  const role: AppRole | null = ctx?.role ?? null;
  return <BottomNav active={active} onPlus={onPlus} role={role} canManageTeam={ctx?.role === "admin" || !!ctx?.is_owner} />;
}

type NavItem = { kind: "link"; to: string; icon: typeof Home; label: string } | { kind: "plus" };

function BottomNav({ active, onPlus, role, canManageTeam }: { active: string; onPlus: () => void; role: AppRole | null; canManageTeam: boolean }) {
  const showMembers = !role || can(role, "members.view");
  const showFinance = !role || can(role, "financial.view");

  const items: NavItem[] = [
    { kind: "link", to: "/app", icon: Home, label: "Início" },
    ...(showMembers ? [{ kind: "link", to: "/app/membros", icon: Users, label: "Membros" } as NavItem] : []),
    { kind: "plus" },
    ...(showFinance ? [{ kind: "link", to: "/app/financeiro", icon: Wallet, label: "Finanças" } as NavItem] : []),
    ...(canManageTeam ? [{ kind: "link", to: "/app/equipe", icon: Shield, label: "Equipe" } as NavItem] : []),
    { kind: "link", to: "/app/perfil", icon: User, label: "Perfil" },
  ];

  return (
    <nav className="fixed bottom-4 left-1/2 z-30 w-[min(100%-1.5rem,28rem)] -translate-x-1/2">
      <div className="glass flex items-center justify-between gap-1 rounded-full px-3 py-2 shadow-[var(--shadow-soft)]">
        {items.map((it, i) => {
          if (it.kind === "plus") {
            return (
              <button
                key={i}
                onClick={onPlus}
                aria-label="Adicionar"
                className="grid h-12 w-12 shrink-0 -translate-y-3 place-items-center rounded-full text-primary-foreground transition-transform hover:scale-105"
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
              className={`flex h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-full text-[10px] font-medium leading-none transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              <span className="block max-w-full truncate whitespace-nowrap px-1">{it.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
