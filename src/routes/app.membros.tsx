import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { useChurches, useActiveChurch } from "@/lib/data";
import { ChurchFilter } from "@/components/ChurchFilter";
import { scopedChurchIds } from "./app.index";
import { useState, useMemo } from "react";
import { Phone, Cake, Search, UserCheck, UserPlus, Crown } from "lucide-react";

export const Route = createFileRoute("/app/membros")({
  component: Members,
});

function Members() {
  const { user } = useAuth();
  const { data: churches } = useChurches();
  const { value: filter } = useActiveChurch();
  const [tab, setTab] = useState<"all" | "member" | "visitor" | "leader">("all");
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

  const filtered = useMemo(
    () => members.filter((m) => (tab === "all" || m.type === tab) && (!q || m.name.toLowerCase().includes(q.toLowerCase()))),
    [members, tab, q],
  );

  const tabs = [
    { id: "all", label: "Todos", count: members.length },
    { id: "member", label: "Membros", count: members.filter((m) => m.type === "member").length },
    { id: "visitor", label: "Visitantes", count: members.filter((m) => m.type === "visitor").length },
    { id: "leader", label: "Líderes", count: members.filter((m) => m.type === "leader").length },
  ] as const;

  return (
    <div className="mx-auto max-w-2xl px-5 pt-8">
      <header className="mb-5">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Pessoas</p>
        <h1 className="text-2xl font-bold">Membros</h1>
      </header>

      <ChurchFilter />

      <div className="relative mt-4">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar pelo nome…"
          className="w-full rounded-full border border-input bg-surface/60 py-3 pl-11 pr-4 text-sm outline-none focus:border-primary"
        />
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`whitespace-nowrap rounded-full border px-4 py-1.5 text-xs font-medium ${
              tab === t.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface/60 text-muted-foreground"
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
          const Icon = m.type === "leader" ? Crown : m.type === "visitor" ? UserPlus : UserCheck;
          const tone = m.type === "leader" ? "text-primary" : m.type === "visitor" ? "text-success" : "text-foreground";
          return (
            <div key={m.id} className="neu-card flex items-center gap-3 p-4">
              <span className={`grid h-10 w-10 place-items-center rounded-xl bg-surface-elevated ${tone}`}>
                <Icon className="h-4 w-4" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-semibold">{m.name}</p>
                <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
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
