import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { useChurches, useActiveChurch } from "@/lib/data";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { Bell, TrendingUp, TrendingDown, Wallet, Users, Cake, AlertTriangle, Calendar, UserPlus, ChevronRight } from "lucide-react";
import { ChurchFilter } from "@/components/ChurchFilter";
import { feedback } from "@/lib/feedback";

export const Route = createFileRoute("/app/")({
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const { data: churches } = useChurches();
  const { value: filter } = useActiveChurch();

  const matriz = churches?.find((c) => c.type === "matriz");
  const churchName = filter === "all" ? "Todas as igrejas" : filter === "matriz" ? matriz?.name : filter === "filiais" ? "Filiais" : churches?.find((c) => c.id === filter)?.name;

  const { data: summary } = useQuery({
    queryKey: ["dashboard", user?.id, filter],
    enabled: !!user,
    queryFn: async () => {
      const ids = scopedChurchIds(churches ?? [], filter);
      const today = new Date();
      const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString().slice(0, 10);

      let txQ = supabase.from("transactions").select("type,amount,occurred_at");
      if (ids) txQ = txQ.in("church_id", ids);
      const { data: txs } = await txQ;

      let memQ = supabase.from("members").select("id,type,birthday,created_at");
      if (ids) memQ = memQ.in("church_id", ids);
      const { data: members } = await memQ;

      let evQ = supabase.from("events").select("id,title,starts_at").gte("starts_at", new Date().toISOString()).order("starts_at").limit(1);
      if (ids) evQ = evQ.in("church_id", ids);
      const { data: events } = await evQ;

      const todayIns = (txs ?? []).filter((t) => t.occurred_at === startToday && t.type === "income").reduce((a, b) => a + Number(b.amount), 0);
      const todayOuts = (txs ?? []).filter((t) => t.occurred_at === startToday && t.type === "expense").reduce((a, b) => a + Number(b.amount), 0);
      const balance = (txs ?? []).reduce((a, b) => a + (b.type === "income" ? Number(b.amount) : -Number(b.amount)), 0);

      const totalMembers = (members ?? []).filter((m) => m.type !== "visitor").length;
      const weekAgo = new Date(Date.now() - 7 * 86400000);
      const weekVisitors = (members ?? []).filter((m) => m.type === "visitor" && new Date(m.created_at) >= weekAgo).length;

      const todayMD = `${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      const birthdays = (members ?? []).filter((m) => m.birthday && m.birthday.slice(5) === todayMD).length;

      return {
        todayIns, todayOuts, balance, totalMembers, weekVisitors, birthdays,
        nextEvent: events?.[0] ?? null,
      };
    },
  });

  return (
    <div className="mx-auto max-w-2xl px-5 pt-8">
      {/* Top */}
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Olá</p>
          <h1 className="text-xl font-bold">{user?.user_metadata?.full_name || user?.email?.split("@")[0]}</h1>
          <p className="mt-1 text-xs text-muted-foreground">{churchName}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => feedback("tap")} className="grid h-10 w-10 place-items-center rounded-full border border-border bg-surface/60 text-muted-foreground hover:text-foreground active:scale-95 transition-transform">
            <Bell className="h-4 w-4" />
          </button>
          <ThemeSwitcher />
        </div>
      </header>

      <ChurchFilter />

      {/* Balance hero — clicável */}
      <Link
        to="/app/financeiro"
        onClick={() => feedback("tap")}
        className="neu-card mt-5 block p-6 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-glow)] active:scale-[0.99]"
      >
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Saldo atual</p>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="mt-2 text-4xl font-bold tracking-tight text-gradient">{fmt(summary?.balance ?? 0)}</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Mini icon={TrendingUp} label="Entradas hoje" value={fmt(summary?.todayIns ?? 0)} tone="success" />
          <Mini icon={TrendingDown} label="Saídas hoje" value={fmt(summary?.todayOuts ?? 0)} tone="destructive" />
        </div>
      </Link>

      {/* Cards clicáveis */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <ClickStat to="/app/membros" icon={Users} label="Membros" value={String(summary?.totalMembers ?? 0)} />
        <ClickStat to="/app/membros" icon={UserPlus} label="Visitantes (semana)" value={String(summary?.weekVisitors ?? 0)} />
      </div>

      {/* Quick links */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Link
          to="/app/financeiro"
          onClick={() => feedback("tap")}
          className="neu-card flex items-center gap-3 p-4 hover:-translate-y-0.5 active:scale-[0.98] transition-transform"
        >
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary"><Wallet className="h-5 w-5" /></span>
          <div><p className="text-sm font-semibold">Financeiro</p><p className="text-xs text-muted-foreground">Gráficos e relatórios</p></div>
        </Link>
        <Link
          to="/app/agenda"
          onClick={() => feedback("tap")}
          className="neu-card flex items-center gap-3 p-4 hover:-translate-y-0.5 active:scale-[0.98] transition-transform"
        >
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary"><Calendar className="h-5 w-5" /></span>
          <div><p className="text-sm font-semibold">Agenda</p><p className="text-xs text-muted-foreground">Próximos eventos</p></div>
        </Link>
      </div>

      {/* Alerts */}
      <h2 className="mt-8 mb-3 text-sm font-semibold text-muted-foreground">Alertas</h2>
      <div className="space-y-3">
        {summary?.birthdays ? (
          <Alert icon={Cake} title={`${summary.birthdays} aniversariante${summary.birthdays > 1 ? "s" : ""} hoje`} desc="Mande uma mensagem carinhosa." />
        ) : null}
        {summary?.nextEvent ? (
          <Alert icon={Calendar} title={summary.nextEvent.title} desc={new Date(summary.nextEvent.starts_at).toLocaleString("pt-BR")} />
        ) : null}
        {!summary?.birthdays && !summary?.nextEvent && (
          <div className="neu-card flex items-center gap-3 p-4 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4 text-primary" />
            Nenhum alerta no momento. Tudo certo!
          </div>
        )}
      </div>
    </div>
  );
}

function Mini({ icon: Icon, label, value, tone }: { icon: typeof TrendingUp; label: string; value: string; tone: "success" | "destructive" }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-surface-elevated/80 p-3">
      <div className={`mb-1 inline-flex items-center gap-1.5 text-xs ${tone === "success" ? "text-success" : "text-destructive"}`}>
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <p className="text-base font-semibold">{value}</p>
    </div>
  );
}

function ClickStat({ to, icon: Icon, label, value }: { to: string; icon: typeof Users; label: string; value: string }) {
  return (
    <Link
      to={to}
      onClick={() => feedback("tap")}
      className="neu-card group block p-4 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-glow)] active:scale-[0.98]"
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Icon className="h-3.5 w-3.5" /> {label}
        </span>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </Link>
  );
}

function Alert({ icon: Icon, title, desc }: { icon: typeof Cake; title: string; desc: string }) {
  return (
    <div className="neu-card flex items-start gap-3 p-4">
      <span className="mt-0.5 grid h-9 w-9 place-items-center rounded-xl bg-primary/15 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div className="flex-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}

export function fmt(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function scopedChurchIds(churches: { id: string; type: "matriz" | "filial" }[], filter: string): string[] | null {
  if (filter === "all") return null;
  if (filter === "matriz") {
    const m = churches.find((c) => c.type === "matriz");
    return m ? [m.id] : [];
  }
  if (filter === "filiais") return churches.filter((c) => c.type === "filial").map((c) => c.id);
  return [filter];
}
