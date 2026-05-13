import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { useChurches, useActiveChurch } from "@/lib/data";
import { ChurchFilter } from "@/components/ChurchFilter";
import { scopedChurchIds } from "./app.index";
import { useState, useMemo } from "react";
import { Phone, Cake, Search } from "lucide-react";
import { MINISTERIAL_ROLES, roleTone } from "@/lib/ministerial-roles";

export const Route = createFileRoute("/app/membros")({
  component: Members,
});

function Members() {
  const { user } = useAuth();
  const { data: churches } = useChurches();
  const { value: filter } = useActiveChurch();
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [q, setQ] = useState("");

  const { data: members = [] } = useQuery({
    queryKey: ["members", user?.id, filter],
    enabled: !!user,
    queryFn: async () => {
      const ids = scopedChurchIds(churches ?? [], filter);
      let qb = supabase.from("members").select("*").order("created_at", { ascending: false });
      if (ids) qb = qb.in("church_id", ids);
      const { data, error } = await qb;
      if (error) throw error;
      return data ?? [];
    },
  });

  const roleCounts = useMemo(() => {
    const c: Record<string, number> = {};
    members.forEach((m) => {
      const r = (m as any).ministerial_role || (m.type === "visitor" ? "Visitante" : "Membro");
      c[r] = (c[r] ?? 0) + 1;
    });
    return c;
  }, [members]);

  const filtered = useMemo(
    () =>
      members.filter((m) => {
        const r = (m as any).ministerial_role || (m.type === "visitor" ? "Visitante" : "Membro");
        const okRole = roleFilter === "all" || r === roleFilter;
        const okQ = !q || m.name.toLowerCase().includes(q.toLowerCase());
        return okRole && okQ;
      }),
    [members, roleFilter, q],
  );

  const tabs = [
    { id: "all", label: "Todos", count: members.length },
    ...MINISTERIAL_ROLES.filter((r) => roleCounts[r]).map((r) => ({
      id: r,
      label: r,
      count: roleCounts[r] ?? 0,
    })),
  ];

  return (
    <div className="mx-auto max-w-2xl px-5 pt-8">
      <header className="mb-5">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Pessoas</p>
        <h1 className="text-2xl font-bold">Membros</h1>
      </header>

      <ChurchFilter />

      {/* Painel ministerial */}
      <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
        {(["Pastor(a)", "Presbítero", "Diácono", "Líder", "Missionário(a)"] as const).map((r) => {
          const t = roleTone(r);
          return (
            <div key={r} className="neu-card p-2.5 text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">{r}</p>
              <p className={`mt-0.5 text-lg font-bold`} style={{ color: `var(--${t.dot.replace("bg-", "")})` }}>
                {roleCounts[r] ?? 0}
              </p>
            </div>
          );
        })}
      </div>

      <div className="relative mt-4">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar pelo nome…"
          className="w-full rounded-full border border-input bg-surface/60 py-3 pl-11 pr-4 text-sm outline-none focus:border-primary"
        />
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setRoleFilter(t.id)}
            className={`whitespace-nowrap rounded-full border px-4 py-1.5 text-xs font-medium ${
              roleFilter === t.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface/60 text-muted-foreground"
            }`}
          >
            {t.label} <span className="opacity-60">{t.count}</span>
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-2 pb-10">
        {filtered.length === 0 && (
          <div className="neu-card p-6 text-center text-sm text-muted-foreground">
            Nenhuma pessoa por aqui ainda. Use o botão ➕ para adicionar.
          </div>
        )}
        {filtered.map((m) => {
          const role = (m as any).ministerial_role || (m.type === "visitor" ? "Visitante" : "Membro");
          const t = roleTone(role);
          return (
            <div key={m.id} className="neu-card flex items-center gap-3 p-4">
              <span
                className="grid h-10 w-10 place-items-center rounded-xl bg-surface-elevated text-base"
                aria-hidden
              >
                {t.emoji}
              </span>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-semibold">{m.name}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${t.badge}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} /> {role}
                  </span>
                  {m.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {m.phone}</span>}
                  {m.birthday && <span className="inline-flex items-center gap-1"><Cake className="h-3 w-3" /> {new Date(m.birthday).toLocaleDateString("pt-BR")}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
