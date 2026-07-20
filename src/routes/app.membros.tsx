import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { useChurches, useActiveChurch, useInvalidateAll } from "@/lib/data";
import { ChurchFilter } from "@/components/ChurchFilter";
import { scopedChurchIds } from "./app.index";
import { useState, useMemo, useRef } from "react";
import { Phone, Cake, Search, Upload, CheckSquare, Square, X, Loader2, Trash2, ArrowRightLeft, Pencil, SlidersHorizontal, ChevronDown, ChevronUp, PartyPopper } from "lucide-react";
import { MINISTERIAL_ROLES, roleTone } from "@/lib/ministerial-roles";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { toast } from "sonner";
import { feedback } from "@/lib/feedback";
import { calcAge, getBand, BANDS, formatBirthdayLong, isBirthdayToday, isBirthdayThisMonth, type BandKey } from "@/lib/age";
import { assignableCargos, CARGOS_BY_ID, useOrgContext, type CargoId } from "@/lib/org";
import { Award, Copy, Share2 } from "lucide-react";

export const Route = createFileRoute("/app/membros")({
  component: Members,
});


type Member = {
  id: string; name: string; phone: string | null; email: string | null;
  birthday: string | null; type: "member" | "visitor"; church_id: string;
  ministerial_role: string | null; notes: string | null;
  sex: "masculino" | "feminino" | null;
  cargo_id: string | null; access_app: boolean;
};


type AdvFilters = {
  status: "all" | "member" | "visitor";
  sex: "all" | "masculino" | "feminino";
  bands: Set<BandKey>;
  exactAge: string;
  ageFrom: string;
  ageTo: string;
  churchId: string; // "" = all
};

const emptyAdv = (): AdvFilters => ({
  status: "all", sex: "all", bands: new Set<BandKey>(),
  exactAge: "", ageFrom: "", ageTo: "", churchId: "",
});

function Members() {
  const { user } = useAuth();
  const { data: churches = [] } = useChurches();
  const { value: filter } = useActiveChurch();
  const invalidate = useInvalidateAll();
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [q, setQ] = useState("");
  const [openMember, setOpenMember] = useState<Member | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [adv, setAdv] = useState<AdvFilters>(emptyAdv);
  const [advOpen, setAdvOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [bdayTab, setBdayTab] = useState<"today" | "month">("today");

  const { data: members = [] } = useQuery({
    queryKey: ["members", user?.id, filter],
    enabled: !!user,
    queryFn: async (): Promise<Member[]> => {
      const ids = scopedChurchIds(churches, filter);
      let qb = supabase.from("members").select("*").order("created_at", { ascending: false });
      if (ids) qb = qb.in("church_id", ids);
      const { data, error } = await qb;
      if (error) throw error;
      return (data ?? []) as Member[];
    },
  });

  const roleCounts = useMemo(() => {
    const c: Record<string, number> = {};
    members.forEach((m) => {
      const r = m.ministerial_role || (m.type === "visitor" ? "Visitante" : "Membro");
      c[r] = (c[r] ?? 0) + 1;
    });
    return c;
  }, [members]);

  const filtered = useMemo(
    () =>
      members.filter((m) => {
        const r = m.ministerial_role || (m.type === "visitor" ? "Visitante" : "Membro");
        if (roleFilter !== "all" && r !== roleFilter) return false;
        if (q && !m.name.toLowerCase().includes(q.toLowerCase())) return false;
        // Advanced filters
        if (adv.status !== "all" && m.type !== adv.status) return false;
        if (adv.sex !== "all" && m.sex !== adv.sex) return false;
        const age = calcAge(m.birthday);
        const band = getBand(age);
        if (adv.bands.size > 0 && !adv.bands.has(band.key)) return false;
        if (adv.exactAge && age !== Number(adv.exactAge)) return false;
        if (adv.ageFrom && (age === null || age < Number(adv.ageFrom))) return false;
        if (adv.ageTo && (age === null || age > Number(adv.ageTo))) return false;
        if (adv.churchId && m.church_id !== adv.churchId) return false;
        return true;
      }),
    [members, roleFilter, q, adv],
  );

  const activeAdvLabels = useMemo(() => {
    const arr: string[] = [];
    if (adv.status !== "all") arr.push(adv.status === "member" ? "Membros" : "Visitantes");
    if (adv.sex !== "all") arr.push(adv.sex === "masculino" ? "Masculino" : "Feminino");
    adv.bands.forEach((k) => arr.push(BANDS.find((b) => b.key === k)?.label ?? k));
    if (adv.exactAge) arr.push(`${adv.exactAge} anos`);
    if (adv.ageFrom || adv.ageTo) arr.push(`${adv.ageFrom || "0"}–${adv.ageTo || "∞"} anos`);
    if (adv.churchId) arr.push(churches.find((c) => c.id === adv.churchId)?.name ?? "Igreja");
    return arr;
  }, [adv, churches]);

  // Stats
  const activeMembers = useMemo(() => members.filter((m) => m.type === "member"), [members]);
  const bandCounts = useMemo(() => {
    const map: Record<BandKey, number> = { crianca: 0, adolescente: 0, jovem: 0, adulto: 0, idoso: 0, sem_info: 0 };
    activeMembers.forEach((m) => { map[getBand(calcAge(m.birthday)).key]++; });
    return map;
  }, [activeMembers]);
  const sexCounts = useMemo(() => {
    let mal = 0, fem = 0;
    activeMembers.forEach((m) => { if (m.sex === "masculino") mal++; else if (m.sex === "feminino") fem++; });
    return { mal, fem };
  }, [activeMembers]);

  const totalActive = activeMembers.length;
  const pct = (n: number) => (totalActive > 0 ? Math.round((n / totalActive) * 100) : 0);

  // Birthdays
  const bdayToday = useMemo(() => members.filter((m) => isBirthdayToday(m.birthday)), [members]);
  const bdayMonth = useMemo(() => members.filter((m) => isBirthdayThisMonth(m.birthday))
    .sort((a, b) => new Date(a.birthday!).getDate() - new Date(b.birthday!).getDate()), [members]);
  const bdayList = bdayTab === "today" ? bdayToday : bdayMonth;

  const tabs = [
    { id: "all", label: "Todos", count: members.length },
    ...MINISTERIAL_ROLES.filter((r) => roleCounts[r]).map((r) => ({
      id: r, label: r, count: roleCounts[r] ?? 0,
    })),
  ];

  // Quick band chips
  const quickChips: { key: BandKey | "male" | "female"; icon: string; label: string }[] = [
    { key: "crianca", icon: "👶", label: "Crianças" },
    { key: "adolescente", icon: "🧒", label: "Adolescentes" },
    { key: "jovem", icon: "🙋", label: "Jovens" },
    { key: "adulto", icon: "👤", label: "Adultos" },
    { key: "idoso", icon: "🧓", label: "Idosos" },
    { key: "male", icon: "👨", label: "Homens" },
    { key: "female", icon: "👩", label: "Mulheres" },
  ];
  const isChipActive = (k: BandKey | "male" | "female") =>
    k === "male" ? adv.sex === "masculino"
      : k === "female" ? adv.sex === "feminino"
      : adv.bands.has(k);
  const toggleChip = (k: BandKey | "male" | "female") => {
    feedback("tap");
    if (k === "male") setAdv((a) => ({ ...a, sex: a.sex === "masculino" ? "all" : "masculino" }));
    else if (k === "female") setAdv((a) => ({ ...a, sex: a.sex === "feminino" ? "all" : "feminino" }));
    else setAdv((a) => {
      const bands = new Set(a.bands);
      if (bands.has(k)) bands.delete(k); else bands.add(k);
      return { ...a, bands };
    });
  };

  const toggleSelect = (id: string) => {
    feedback("tap");
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const exitBulk = () => { setBulkMode(false); setSelected(new Set()); };

  return (
    <div className="mx-auto max-w-2xl px-5 pt-8">
      <header className="mb-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Pessoas</p>
          <h1 className="text-2xl font-bold">Membros</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { feedback("tap"); setImportOpen(true); }}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/60 px-3 py-2 text-xs font-medium hover:border-primary/40 active:scale-95 transition-all"
          >
            <Upload className="h-3.5 w-3.5" /> Importar
          </button>
          <button
            onClick={() => { feedback("switch"); bulkMode ? exitBulk() : setBulkMode(true); }}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium active:scale-95 transition-all ${
              bulkMode ? "border-primary bg-primary/15 text-primary" : "border-border bg-surface/60"
            }`}
          >
            <CheckSquare className="h-3.5 w-3.5" /> {bulkMode ? "Sair" : "Em massa"}
          </button>
        </div>
      </header>

      <ChurchFilter />

      {/* Painel ministerial */}
      <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
        {(["Pastor(a)", "Presbítero", "Diácono", "Líder", "Missionário(a)"] as const).map((r) => {
          const t = roleTone(r);
          return (
            <div key={r} className="neu-card p-2.5 text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">{r}</p>
              <p className="mt-0.5 text-lg font-bold" style={{ color: `var(--${t.dot.replace("bg-", "")})` }}>
                {roleCounts[r] ?? 0}
              </p>
            </div>
          );
        })}
      </div>

      {/* Visão da congregação (colapsável) */}
      <div className="neu-card mt-4 overflow-hidden">
        <button
          onClick={() => { feedback("tap"); setStatsOpen((s) => !s); }}
          className="flex w-full items-center justify-between p-4 text-left"
        >
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Visão da congregação</p>
            <p className="text-sm font-semibold">{totalActive} membro(s) ativo(s)</p>
          </div>
          {statsOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>
        {statsOpen && (
          <div className="border-t border-border/60 p-4 space-y-4">
            <div>
              <p className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">Faixa etária</p>
              <div className="space-y-2">
                {BANDS.map((b) => {
                  const n = bandCounts[b.key];
                  const p = pct(n);
                  return (
                    <div key={b.key} className="flex items-center gap-2 text-xs">
                      <span className="w-32 truncate">{b.icon} {b.label}</span>
                      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-surface-elevated">
                        <div className="absolute inset-y-0 left-0 rounded-full transition-all" style={{ width: `${p}%`, background: b.color }} />
                      </div>
                      <span className="w-14 text-right tabular-nums text-muted-foreground">{n} ({p}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">Sexo</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl bg-surface-elevated p-2.5">
                  <p className="text-muted-foreground">👨 Homens</p>
                  <p className="text-base font-bold">{sexCounts.mal} <span className="text-xs font-normal text-muted-foreground">({pct(sexCounts.mal)}%)</span></p>
                </div>
                <div className="rounded-xl bg-surface-elevated p-2.5">
                  <p className="text-muted-foreground">👩 Mulheres</p>
                  <p className="text-base font-bold">{sexCounts.fem} <span className="text-xs font-normal text-muted-foreground">({pct(sexCounts.fem)}%)</span></p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Aniversariantes */}
      <div className="neu-card mt-4 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PartyPopper className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">Aniversariantes</p>
          </div>
          <div className="flex rounded-full bg-surface-elevated p-0.5 text-xs">
            <button onClick={() => setBdayTab("today")} className={`rounded-full px-3 py-1 ${bdayTab === "today" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Hoje</button>
            <button onClick={() => setBdayTab("month")} className={`rounded-full px-3 py-1 ${bdayTab === "month" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Este mês</button>
          </div>
        </div>
        {bdayList.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum aniversariante {bdayTab === "today" ? "hoje" : "este mês"} 🎂</p>
        ) : (
          <div className="space-y-1.5">
            {bdayList.slice(0, 6).map((m) => {
              const age = calcAge(m.birthday);
              const church = churches.find((c) => c.id === m.church_id)?.name;
              const today = isBirthdayToday(m.birthday);
              return (
                <div key={m.id} className="flex items-center gap-3 rounded-xl bg-surface-elevated px-3 py-2">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15 text-sm">🎂</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {m.name} {today ? <span className="text-primary">— {age} anos hoje 🎉</span> : <span className="text-muted-foreground">— {new Date(m.birthday!).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</span>}
                    </p>
                    {church && <p className="text-[11px] text-muted-foreground">{church}</p>}
                  </div>
                </div>
              );
            })}
            {bdayList.length > 6 && <p className="pt-1 text-center text-[11px] text-muted-foreground">+ {bdayList.length - 6} outros</p>}
          </div>
        )}
      </div>

      {/* Busca + filtro avançado */}
      <div className="relative mt-4 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar pelo nome…"
            className="w-full rounded-full border border-input bg-surface/60 py-3 pl-11 pr-4 text-sm outline-none focus:border-primary"
          />
        </div>
        <button
          onClick={() => { feedback("tap"); setAdvOpen(true); }}
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border transition-all ${
            activeAdvLabels.length > 0 ? "border-primary bg-primary/15 text-primary" : "border-border bg-surface/60"
          }`}
          aria-label="Filtros avançados"
        >
          <SlidersHorizontal className="h-4 w-4" />
        </button>
      </div>

      {/* Linha 1 — status por cargo (mantida) */}
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => { feedback("tap"); setRoleFilter(t.id); }}
            className={`whitespace-nowrap rounded-full border px-4 py-1.5 text-xs font-medium ${
              roleFilter === t.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface/60 text-muted-foreground"
            }`}
          >
            {t.label} <span className="opacity-60">{t.count}</span>
          </button>
        ))}
      </div>

      {/* Linha 2 — chips rápidos (faixa etária + sexo) */}
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
        {quickChips.map((c) => {
          const active = isChipActive(c.key);
          return (
            <button
              key={c.key}
              onClick={() => toggleChip(c.key)}
              className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium ${
                active ? "border-primary bg-primary/15 text-primary" : "border-border bg-surface/60 text-muted-foreground"
              }`}
            >
              {c.icon} {c.label}
            </button>
          );
        })}
      </div>

      {/* Contador */}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>Exibindo {filtered.length} {filtered.length === 1 ? "pessoa" : "pessoas"}</span>
        {activeAdvLabels.length > 0 && (
          <>
            <span>·</span>
            <span>filtros: {activeAdvLabels.join(", ")}</span>
            <button
              onClick={() => { feedback("tap"); setAdv(emptyAdv()); }}
              className="ml-auto text-primary hover:underline"
            >
              Limpar
            </button>
          </>
        )}
      </div>

      <div className="mt-3 space-y-2 pb-32">
        {filtered.length === 0 && (
          <div className="neu-card p-6 text-center text-sm text-muted-foreground">
            {activeAdvLabels.length > 0 || q
              ? <>Nenhum resultado. <button onClick={() => { setAdv(emptyAdv()); setQ(""); setRoleFilter("all"); }} className="text-primary hover:underline">Limpar filtros</button></>
              : "Nenhuma pessoa por aqui ainda. Use ➕ ou Importar."}
          </div>
        )}
        {filtered.map((m) => {
          const role = m.ministerial_role || (m.type === "visitor" ? "Visitante" : "Membro");
          const t = roleTone(role);
          const isSel = selected.has(m.id);
          const age = calcAge(m.birthday);
          return (
            <button
              key={m.id}
              onClick={() => bulkMode ? toggleSelect(m.id) : (feedback("tap"), setOpenMember(m))}
              className={`neu-card flex w-full items-center gap-3 p-4 text-left active:scale-[0.99] transition-transform ${
                isSel ? "ring-2 ring-primary" : ""
              }`}
            >
              {bulkMode && (
                isSel
                  ? <CheckSquare className="h-4 w-4 text-primary" />
                  : <Square className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-surface-elevated text-base">{t.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-semibold">
                  {m.name}
                  {age !== null && <span className="ml-1.5 text-xs font-normal text-muted-foreground">({age} anos)</span>}
                </p>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${t.badge}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} /> {role}
                  </span>
                  {m.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {m.phone}</span>}
                  {m.birthday && <span className="inline-flex items-center gap-1"><Cake className="h-3 w-3" /> {new Date(m.birthday).toLocaleDateString("pt-BR")}</span>}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Bulk action bar */}
      {bulkMode && selected.size > 0 && (
        <BulkBar
          count={selected.size}
          churches={churches}
          onClear={() => setSelected(new Set())}
          onApply={async (action) => {
            const ids = Array.from(selected);
            if (action.kind === "delete") {
              if (!confirm(`Excluir ${ids.length} pessoa(s)?`)) return;
              const { error } = await supabase.from("members").delete().in("id", ids);
              if (error) return toast.error(error.message);
              feedback("success");
              toast.success(`${ids.length} excluído(s)`);
            } else {
              const upd: any = {};
              if (action.kind === "church") upd.church_id = action.value;
              if (action.kind === "role") upd.ministerial_role = action.value;
              if (action.kind === "type") upd.type = action.value;
              const { error } = await supabase.from("members").update(upd).in("id", ids);
              if (error) return toast.error(error.message);
              feedback("success");
              toast.success("Atualizado!");
            }
            setSelected(new Set());
            invalidate();
          }}
        />
      )}

      <MemberDialog member={openMember} churches={churches} onClose={() => setOpenMember(null)} onChanged={invalidate} />
      <ImportDialog open={importOpen} churches={churches} onClose={() => setImportOpen(false)} onDone={invalidate} />
      <AdvFilterSheet
        open={advOpen}
        onClose={() => setAdvOpen(false)}
        churches={churches}
        value={adv}
        onApply={(v) => { setAdv(v); setAdvOpen(false); feedback("success"); }}
      />
    </div>
  );
}

// =============== Advanced filter sheet ===============
function AdvFilterSheet({
  open, onClose, value, onApply, churches,
}: {
  open: boolean; onClose: () => void; value: AdvFilters;
  onApply: (v: AdvFilters) => void;
  churches: { id: string; name: string; type: "matriz" | "filial" }[];
}) {
  const [v, setV] = useState<AdvFilters>(value);
  // Sync when opened
  const openKey = open ? "1" : "0";
  useMemo(() => { if (open) setV({ ...value, bands: new Set(value.bands) }); return null; }, [openKey]);

  const toggleBand = (k: BandKey) => {
    setV((s) => {
      const bands = new Set(s.bands);
      if (bands.has(k)) bands.delete(k); else bands.add(k);
      return { ...s, bands };
    });
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-3xl border-border bg-surface">
        <SheetHeader>
          <SheetTitle>Filtrar membros</SheetTitle>
          <SheetDescription className="text-xs">Combine os filtros como preferir.</SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-5">
          <FilterSection title="Status">
            <div className="flex flex-wrap gap-2">
              {[
                { k: "all", label: "Todos" },
                { k: "member", label: "Membro" },
                { k: "visitor", label: "Visitante" },
              ].map((o) => (
                <Chip key={o.k} active={v.status === o.k} onClick={() => setV({ ...v, status: o.k as any })}>{o.label}</Chip>
              ))}
            </div>
          </FilterSection>

          <FilterSection title="Sexo">
            <div className="flex flex-wrap gap-2">
              {[
                { k: "all", label: "Todos" },
                { k: "masculino", label: "👨 Masculino" },
                { k: "feminino", label: "👩 Feminino" },
              ].map((o) => (
                <Chip key={o.k} active={v.sex === o.k} onClick={() => setV({ ...v, sex: o.k as any })}>{o.label}</Chip>
              ))}
            </div>
          </FilterSection>

          <FilterSection title="Faixa etária">
            <div className="grid grid-cols-2 gap-2">
              {BANDS.map((b) => {
                const active = v.bands.has(b.key);
                return (
                  <button
                    key={b.key}
                    type="button"
                    onClick={() => toggleBand(b.key)}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm ${
                      active ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface/60 text-muted-foreground"
                    }`}
                  >
                    <span>{b.icon}</span> <span className="truncate">{b.label}</span>
                  </button>
                );
              })}
            </div>
          </FilterSection>

          <FilterSection title="Idade exata">
            <input
              type="number" min={0} max={130} inputMode="numeric"
              value={v.exactAge}
              onChange={(e) => setV({ ...v, exactAge: e.target.value })}
              placeholder="Ex: 20"
              className="input w-32"
            />
          </FilterSection>

          <FilterSection title="Faixa personalizada">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Entre</span>
              <input
                type="number" min={0} max={130} inputMode="numeric" placeholder="18"
                value={v.ageFrom} onChange={(e) => setV({ ...v, ageFrom: e.target.value })}
                className="input w-20"
              />
              <span className="text-muted-foreground">e</span>
              <input
                type="number" min={0} max={130} inputMode="numeric" placeholder="25"
                value={v.ageTo} onChange={(e) => setV({ ...v, ageTo: e.target.value })}
                className="input w-20"
              />
              <span className="text-muted-foreground">anos</span>
            </div>
          </FilterSection>

          {churches.length > 1 && (
            <FilterSection title="Igreja">
              <div className="flex flex-wrap gap-2">
                <Chip active={!v.churchId} onClick={() => setV({ ...v, churchId: "" })}>Todas</Chip>
                {churches.map((c) => (
                  <Chip key={c.id} active={v.churchId === c.id} onClick={() => setV({ ...v, churchId: c.id })}>{c.name}</Chip>
                ))}
              </div>
            </FilterSection>
          )}
        </div>

        <div className="sticky bottom-0 -mx-6 mt-6 grid grid-cols-2 gap-2 border-t border-border bg-surface p-4">
          <button
            onClick={() => setV(emptyAdv())}
            className="rounded-full border border-border py-2.5 text-sm"
          >
            Limpar filtros
          </button>
          <button
            onClick={() => onApply(v)}
            className="rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Aplicar
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
        active ? "border-primary bg-primary/15 text-primary" : "border-border bg-surface/60 text-muted-foreground"
      }`}
    >
      {children}
    </button>
  );
}


function MemberDialog({
  member, churches, onClose, onChanged,
}: { member: Member | null; churches: { id: string; name: string; type: "matriz" | "filial" }[]; onClose: () => void; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Member>>({});
  const [busy, setBusy] = useState(false);
  const [promoteOpen, setPromoteOpen] = useState(false);
  const { data: ctx } = useOrgContext();

  if (!member) return null;
  const m = member;
  const role = m.ministerial_role || (m.type === "visitor" ? "Visitante" : "Membro");
  const t = roleTone(role);
  const churchName = churches.find((c) => c.id === m.church_id)?.name ?? "—";

  const startEdit = () => { setForm(m); setEditing(true); feedback("tap"); };

  const save = async () => {
    setBusy(true);
    const { error } = await supabase.from("members").update({
      name: form.name,
      phone: form.phone || null,
      birthday: form.birthday || null,
      ministerial_role: form.ministerial_role || null,
      church_id: form.church_id,
      type: form.type,
      sex: form.sex || null,
      notes: form.notes || null,
    } as any).eq("id", m.id);

    setBusy(false);
    if (error) return toast.error(error.message);
    feedback("success");
    toast.success("Atualizado!");
    setEditing(false);
    onChanged();
    onClose();
  };

  const remove = async () => {
    if (!confirm(`Tem certeza que deseja excluir ${m.name}?`)) return;
    const { error } = await supabase.from("members").delete().eq("id", m.id);
    if (error) return toast.error(error.message);
    feedback("warning");
    toast.success("Removido");
    onChanged();
    onClose();
  };

  const transfer = async (newId: string) => {
    if (newId === m.church_id) return;
    const { error } = await supabase.from("members").update({ church_id: newId }).eq("id", m.id);
    if (error) return toast.error(error.message);
    feedback("success");
    toast.success("Transferido!");
    onChanged();
    onClose();
  };

  return (
    <Dialog open={!!member} onOpenChange={(o) => !o && (setEditing(false), onClose())}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto border-border bg-surface sm:rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/15 text-2xl">{t.emoji}</span>
            <div>
              <p className="text-lg font-bold">{m.name}</p>
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${t.badge}`}>{role}</span>
            </div>
          </DialogTitle>
          <DialogDescription className="text-xs">{churchName}</DialogDescription>
        </DialogHeader>

        {!editing ? (
          <>
            <dl className="space-y-2 text-sm">
              <Row label="Telefone" value={m.phone || "—"} />
              <Row
                label="Nascimento"
                value={
                  m.birthday
                    ? `🎂 ${formatBirthdayLong(m.birthday)}${calcAge(m.birthday) !== null ? ` (${calcAge(m.birthday)} anos)` : ""}`
                    : "—"
                }
              />
              <Row label="Sexo" value={m.sex === "masculino" ? "👨 Masculino" : m.sex === "feminino" ? "👩 Feminino" : "—"} />
              <Row label="Status" value={m.type === "visitor" ? "Visitante" : "Membro ativo"} />
              <Row label="Igreja" value={churchName} />
              {m.notes && <Row label="Observações" value={m.notes} />}
            </dl>


            <p className="mt-4 mb-2 text-xs uppercase tracking-wider text-muted-foreground">Mudar de igreja</p>
            <div className="flex flex-wrap gap-2">
              {churches.map((c) => (
                <button
                  key={c.id}
                  onClick={() => transfer(c.id)}
                  disabled={c.id === m.church_id}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                    c.id === m.church_id ? "border-primary bg-primary/15 text-primary" : "border-border bg-surface/60 hover:border-primary/40 active:scale-95"
                  }`}
                >
                  <ArrowRightLeft className="h-3 w-3" /> {c.name}
                </button>
              ))}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <button onClick={startEdit} className="inline-flex items-center justify-center gap-2 rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground active:scale-95 transition-transform">
                <Pencil className="h-4 w-4" /> Editar
              </button>
              <button onClick={remove} className="inline-flex items-center justify-center gap-2 rounded-full border border-destructive/40 py-2.5 text-sm font-semibold text-destructive active:scale-95 transition-transform">
                <Trash2 className="h-4 w-4" /> Excluir
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <Field label="Nome">
              <input className="input" value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Telefone">
              <input className="input" value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label="Data de nascimento">
              <div className="flex items-center gap-2">
                <input type="date" className="input flex-1" value={form.birthday ?? ""} onChange={(e) => setForm({ ...form, birthday: e.target.value })} />
                {(() => { const a = calcAge(form.birthday); return a !== null ? <span className="inline-flex items-center rounded-full bg-surface-elevated px-3 py-1.5 text-xs font-medium text-muted-foreground whitespace-nowrap">{a} anos</span> : null; })()}
              </div>
            </Field>
            <Field label="Sexo">
              <div className="grid grid-cols-2 gap-2">
                {(["masculino", "feminino"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm({ ...form, sex: form.sex === s ? null : s })}
                    className={`rounded-xl border px-3 py-2.5 text-sm ${
                      form.sex === s ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface/60 text-muted-foreground"
                    }`}
                  >
                    {s === "masculino" ? "👨 Masculino" : "👩 Feminino"}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Cargo ministerial">
              <select className="input" value={form.ministerial_role ?? ""} onChange={(e) => setForm({ ...form, ministerial_role: e.target.value })}>
                <option value="">—</option>
                {MINISTERIAL_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select className="input" value={form.type ?? "member"} onChange={(e) => setForm({ ...form, type: e.target.value as any })}>
                <option value="member">Membro</option>
                <option value="visitor">Visitante</option>
              </select>
            </Field>

            <Field label="Observações">
              <textarea className="input min-h-[60px]" value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button onClick={() => setEditing(false)} className="rounded-full border border-border py-2.5 text-sm">Cancelar</button>
              <button disabled={busy} onClick={save} className="inline-flex items-center justify-center gap-2 rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl bg-surface-elevated px-3 py-2">
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-medium">{value}</dd>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

// =============== Bulk action bar ===============
type BulkAction =
  | { kind: "church"; value: string }
  | { kind: "role"; value: string }
  | { kind: "type"; value: "member" | "visitor" }
  | { kind: "delete" };

function BulkBar({
  count, churches, onClear, onApply,
}: {
  count: number;
  churches: { id: string; name: string; type: "matriz" | "filial" }[];
  onClear: () => void;
  onApply: (a: BulkAction) => void;
}) {
  const [open, setOpen] = useState<"church" | "role" | "type" | null>(null);
  return (
    <div className="fixed bottom-24 left-1/2 z-40 w-[min(100%-2rem,32rem)] -translate-x-1/2 animate-in slide-in-from-bottom-2">
      <div className="glass rounded-2xl p-3 shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">{count} selecionado(s)</p>
          <button onClick={onClear} className="text-xs text-muted-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <Pop label="Mudar igreja" open={open === "church"} onToggle={() => setOpen(open === "church" ? null : "church")}>
            {churches.map((c) => (
              <li key={c.id}><button className="block w-full px-3 py-2 text-left text-sm hover:bg-primary/10" onClick={() => { onApply({ kind: "church", value: c.id }); setOpen(null); }}>{c.name}</button></li>
            ))}
          </Pop>
          <Pop label="Cargo" open={open === "role"} onToggle={() => setOpen(open === "role" ? null : "role")}>
            {MINISTERIAL_ROLES.map((r) => (
              <li key={r}><button className="block w-full px-3 py-2 text-left text-sm hover:bg-primary/10" onClick={() => { onApply({ kind: "role", value: r }); setOpen(null); }}>{r}</button></li>
            ))}
          </Pop>
          <Pop label="Status" open={open === "type"} onToggle={() => setOpen(open === "type" ? null : "type")}>
            <li><button className="block w-full px-3 py-2 text-left text-sm hover:bg-primary/10" onClick={() => { onApply({ kind: "type", value: "member" }); setOpen(null); }}>Membro</button></li>
            <li><button className="block w-full px-3 py-2 text-left text-sm hover:bg-primary/10" onClick={() => { onApply({ kind: "type", value: "visitor" }); setOpen(null); }}>Visitante</button></li>
          </Pop>
          <button onClick={() => onApply({ kind: "delete" })} className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-destructive/40 px-3 py-1.5 text-xs font-medium text-destructive active:scale-95">
            <Trash2 className="h-3.5 w-3.5" /> Excluir
          </button>
        </div>
      </div>
    </div>
  );
}

function Pop({ label, open, onToggle, children }: { label: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="relative">
      <button onClick={onToggle} className={`rounded-full border px-3 py-1.5 text-xs font-medium ${open ? "border-primary bg-primary/15 text-primary" : "border-border bg-surface/60"}`}>
        {label}
      </button>
      {open && (
        <ul className="absolute bottom-full left-0 z-50 mb-2 max-h-60 w-48 overflow-auto rounded-xl border border-border bg-surface-elevated shadow-lg">
          {children}
        </ul>
      )}
    </div>
  );
}

// =============== Import dialog ===============
function ImportDialog({
  open, churches, onClose, onDone,
}: { open: boolean; churches: { id: string; name: string; type: "matriz" | "filial" }[]; onClose: () => void; onDone: () => void }) {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [defaultChurch, setDefaultChurch] = useState<string>(churches.find((c) => c.type === "matriz")?.id ?? churches[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState("");

  const close = () => { setRows([]); setFileName(""); onClose(); };

  const onFile = async (f: File) => {
    setFileName(f.name);
    try {
      if (f.name.toLowerCase().endsWith(".csv")) {
        const Papa = (await import("papaparse")).default;
        const text = await f.text();
        const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
        setRows((parsed.data as any[]).slice(0, 1000));
      } else {
        const XLSX = await import("xlsx");
        const buf = await f.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as any[];
        setRows(data.slice(0, 1000));
      }
      feedback("success");
    } catch (e: any) {
      toast.error("Não consegui ler o arquivo: " + (e.message ?? ""));
    }
  };

  const findKey = (row: any, names: string[]) => {
    const keys = Object.keys(row);
    for (const n of names) {
      const k = keys.find((k) => k.toLowerCase().trim() === n.toLowerCase());
      if (k && row[k] != null && String(row[k]).trim()) return String(row[k]).trim();
    }
    return "";
  };

  const valid = useMemo(
    () => rows.map((r) => ({
      name: findKey(r, ["nome", "name"]),
      phone: findKey(r, ["telefone", "phone", "celular"]),
      role: findKey(r, ["cargo", "cargo ministerial", "role", "ministerial_role"]),
      churchName: findKey(r, ["igreja", "church"]),
      type: findKey(r, ["status", "type"]).toLowerCase(),
      notes: findKey(r, ["observacao", "observação", "observações", "notes", "obs"]),
    })).filter((r) => r.name),
    [rows],
  );

  const submit = async () => {
    if (!user || !defaultChurch) return toast.error("Escolha a igreja padrão");
    setBusy(true);
    const churchByName = new Map(churches.map((c) => [c.name.toLowerCase(), c.id]));
    const payload = valid.map((r) => ({
      owner_id: user.id,
      church_id: churchByName.get(r.churchName.toLowerCase()) ?? defaultChurch,
      type: (r.type === "visitor" || r.type === "visitante") ? "visitor" : "member",
      name: r.name.slice(0, 200),
      phone: r.phone || null,
      ministerial_role: r.role || null,
      notes: r.notes || null,
    }));
    // chunked insert (200/lote)
    let inserted = 0;
    for (let i = 0; i < payload.length; i += 200) {
      const chunk = payload.slice(i, i + 200);
      const { error } = await supabase.from("members").insert(chunk as any);
      if (error) { setBusy(false); toast.error(error.message); return; }
      inserted += chunk.length;
    }
    setBusy(false);
    feedback("success");
    toast.success(`${inserted} pessoa(s) importada(s)!`);
    onDone();
    close();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto border-border bg-surface sm:rounded-3xl">
        <DialogHeader>
          <DialogTitle>Importar lista de membros</DialogTitle>
          <DialogDescription className="text-xs">CSV ou Excel (.xlsx) — até 1000 pessoas. Campos faltantes não bloqueiam.</DialogDescription>
        </DialogHeader>

        {!rows.length ? (
          <div className="space-y-3">
            <button
              onClick={() => fileRef.current?.click()}
              className="neu-card flex w-full flex-col items-center gap-2 p-8 text-center transition-transform hover:-translate-y-0.5"
            >
              <Upload className="h-6 w-6 text-primary" />
              <p className="text-sm font-semibold">Selecionar arquivo</p>
              <p className="text-xs text-muted-foreground">Colunas aceitas: Nome, Telefone, Igreja, Cargo, Status, Observações</p>
            </button>
            <input
              ref={fileRef} type="file" accept=".csv,.xlsx,.xls" hidden
              onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
            />
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">{fileName} · {valid.length} válida(s) de {rows.length}</p>
            <Field label="Igreja padrão (quando não especificada)">
              <select className="input" value={defaultChurch} onChange={(e) => setDefaultChurch(e.target.value)}>
                {churches.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <div className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-border bg-surface-elevated p-2">
              {valid.slice(0, 50).map((r, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-xs">
                  <span className="truncate font-medium">{r.name}</span>
                  <span className="ml-2 text-muted-foreground">{r.role || "Membro"}{r.churchName ? ` · ${r.churchName}` : ""}</span>
                </div>
              ))}
              {valid.length > 50 && <p className="px-2 py-1 text-[11px] text-muted-foreground">+ {valid.length - 50} a mais…</p>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setRows([])} className="rounded-full border border-border py-2.5 text-sm">Voltar</button>
              <button disabled={busy || !valid.length} onClick={submit} className="inline-flex items-center justify-center gap-2 rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Importar {valid.length}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
