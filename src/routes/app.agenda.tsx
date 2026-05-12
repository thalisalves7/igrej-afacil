import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { useChurches, useActiveChurch } from "@/lib/data";
import { ChurchFilter } from "@/components/ChurchFilter";
import { scopedChurchIds } from "./app.index";
import { Calendar, Clock } from "lucide-react";

export const Route = createFileRoute("/app/agenda")({
  component: Agenda,
});

function Agenda() {
  const { user } = useAuth();
  const { data: churches } = useChurches();
  const { value: filter } = useActiveChurch();

  const { data: events = [] } = useQuery({
    queryKey: ["events", user?.id, filter],
    enabled: !!user,
    queryFn: async () => {
      const ids = scopedChurchIds(churches ?? [], filter);
      let q = supabase.from("events").select("*").order("starts_at", { ascending: true });
      if (ids) q = q.in("church_id", ids);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const grouped = events.reduce<Record<string, typeof events>>((acc, e) => {
    const k = new Date(e.starts_at).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
    (acc[k] ||= []).push(e);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-2xl px-5 pt-8">
      <header className="mb-5">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Calendário</p>
        <h1 className="text-2xl font-bold">Agenda</h1>
      </header>

      <ChurchFilter />

      <div className="mt-6 space-y-6 pb-10">
        {events.length === 0 && (
          <div className="neu-card p-6 text-center text-sm text-muted-foreground">
            Sem eventos cadastrados. Use o botão ➕ para criar.
          </div>
        )}
        {Object.entries(grouped).map(([day, list]) => (
          <div key={day}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{day}</p>
            <div className="space-y-2">
              {list.map((e) => (
                <div key={e.id} className="neu-card flex items-center gap-3 p-4">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
                    <Calendar className="h-4 w-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-semibold">{e.title}</p>
                    <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(e.starts_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      <span className="ml-2 rounded-full bg-surface-elevated px-2 py-0.5 capitalize">{e.type}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
