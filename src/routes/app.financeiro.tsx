import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { useChurches, useActiveChurch, useInvalidateAll } from "@/lib/data";
import { ChurchFilter } from "@/components/ChurchFilter";
import { fmt, scopedChurchIds } from "./app.index";
import { useMemo, useState } from "react";
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, BarChart,
} from "recharts";
import { Wallet, TrendingUp, TrendingDown, MessageCircle, FileDown, ArrowUpRight, ArrowDownRight, Loader2, ChevronLeft, ChevronRight, Sparkles, Users as UsersIcon, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { feedback } from "@/lib/feedback";
import { roleTone } from "@/lib/ministerial-roles";

const RANGES = [
  { id: "7", label: "7 dias", days: 7 },
  { id: "30", label: "30 dias", days: 30 },
  { id: "90", label: "3 meses", days: 90 },
  { id: "180", label: "6 meses", days: 180 },
  { id: "365", label: "1 ano", days: 365 },
] as const;

export const Route = createFileRoute("/app/financeiro")({
  component: Finance,
});

type Tx = {
  id: string;
  type: "income" | "expense";
  amount: number;
  category: string | null;
  description: string | null;
  occurred_at: string;
  church_id: string;
  tither_name: string | null;
  tither_member_id: string | null;
};

type SubTab = "overview" | "income" | "expense" | "tithers" | "offers";

function Finance() {
  const { user } = useAuth();
  const { data: churches } = useChurches();
  const { value: filter } = useActiveChurch();
  const [range, setRange] = useState<(typeof RANGES)[number]["id"]>("30");
  const days = RANGES.find((r) => r.id === range)!.days;
  const [tab, setTab] = useState<SubTab>("overview");
  const [selectedTx, setSelectedTx] = useState<Tx | null>(null);

  const { data: txs = [], isLoading } = useQuery({
    queryKey: ["transactions", user?.id, filter, range],
    enabled: !!user,
    queryFn: async (): Promise<Tx[]> => {
      const ids = scopedChurchIds(churches ?? [], filter);
      const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
      let q = supabase.from("transactions").select("*").gte("occurred_at", since).order("occurred_at", { ascending: false });
      if (ids) q = q.in("church_id", ids);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((d) => ({ ...d, amount: Number(d.amount) })) as Tx[];
    },
  });

  const totals = useMemo(() => {
    const ins = txs.filter((t) => t.type === "income").reduce((a, b) => a + b.amount, 0);
    const outs = txs.filter((t) => t.type === "expense").reduce((a, b) => a + b.amount, 0);
    return { ins, outs, balance: ins - outs };
  }, [txs]);

  const chartData = useMemo(() => buildSeries(txs, days), [txs, days]);
  const insights = useMemo(() => buildInsights(txs), [txs]);
  const titheStats = useMemo(() => buildTitheStats(txs, churches ?? []), [txs, churches]);

  const churchLabel = (() => {
    if (filter === "all") return "Todas as igrejas";
    if (filter === "matriz") return "Matriz";
    if (filter === "filiais") return "Filiais";
    return churches?.find((c) => c.id === filter)?.name ?? "Igreja";
  })();

  const sendWhatsapp = () => {
    const topChurch = titheStats.byChurch[0];
    const text =
      `📊 *Resumo Financeiro — ${churchLabel}*\n` +
      `🗓 Últimos ${days} dias\n\n` +
      `💰 Entradas: ${fmt(totals.ins)}\n` +
      `📤 Saídas: ${fmt(totals.outs)}\n` +
      `✅ Saldo: ${fmt(totals.balance)}\n\n` +
      `📌 Total de Dízimos: ${fmt(titheStats.total)}\n` +
      `📌 Dizimistas: ${titheStats.uniqueCount}\n` +
      (topChurch ? `📌 Igreja com maior arrecadação: ${topChurch.name} (${fmt(topChurch.total)})\n` : "") +
      `\n_Relatório gerado pelo Igreja Fácil_`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const downloadPdf = async () => {
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      doc.setFontSize(20);
      doc.text("Relatório Financeiro", 14, 20);
      doc.setFontSize(11);
      doc.setTextColor(120);
      doc.text(`${churchLabel} — Últimos ${days} dias`, 14, 28);

      doc.setTextColor(0);
      doc.setFontSize(13);
      doc.text(`Entradas: ${fmt(totals.ins)}`, 14, 44);
      doc.text(`Saídas:   ${fmt(totals.outs)}`, 14, 52);
      doc.text(`Saldo:    ${fmt(totals.balance)}`, 14, 60);

      doc.setFontSize(12);
      doc.text("Movimentações", 14, 76);
      let y = 84;
      doc.setFontSize(10);
      txs.slice(0, 35).forEach((t) => {
        const sign = t.type === "income" ? "+" : "-";
        doc.text(
          `${t.occurred_at}   ${sign} ${fmt(t.amount)}   ${(t.category ?? "")}  ${(t.tither_name ?? t.description ?? "")}`.slice(0, 95),
          14,
          y,
        );
        y += 6;
        if (y > 280) { doc.addPage(); y = 20; }
      });

      // Dizimistas
      if (titheStats.byPerson.length) {
        if (y > 240) { doc.addPage(); y = 20; }
        y += 6;
        doc.setFontSize(12);
        doc.text(`Dizimistas — ${fmt(titheStats.total)} (${titheStats.uniqueCount})`, 14, y);
        y += 8;
        doc.setFontSize(10);
        titheStats.byChurch.forEach((c) => {
          if (y > 280) { doc.addPage(); y = 20; }
          doc.setTextColor(120);
          doc.text(`${c.name}: ${fmt(c.total)}`, 14, y);
          doc.setTextColor(0);
          y += 6;
        });
        y += 2;
        titheStats.byPerson.slice(0, 40).forEach((p) => {
          if (y > 280) { doc.addPage(); y = 20; }
          doc.text(`${p.name.slice(0, 40).padEnd(40)} ${fmt(p.total)}`, 14, y);
          y += 6;
        });
      }

      doc.setFontSize(9);
      doc.setTextColor(140);
      doc.text("Relatório gerado pelo Igreja Fácil", 14, 290);

      doc.save(`relatorio-igreja-facil-${Date.now()}.pdf`);
    } catch (e) {
      toast.error("Não foi possível gerar o PDF.");
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-5 pt-8">
      <header className="mb-5">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Carro-chefe</p>
        <h1 className="text-2xl font-bold">Financeiro</h1>
      </header>

      <ChurchFilter />

      {/* Action buttons */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <button onClick={sendWhatsapp} className="neu-card flex items-center justify-center gap-2 p-3 text-sm font-medium">
          <MessageCircle className="h-4 w-4 text-success" /> WhatsApp
        </button>
        <button onClick={downloadPdf} className="neu-card flex items-center justify-center gap-2 p-3 text-sm font-medium">
          <FileDown className="h-4 w-4 text-primary" /> PDF
        </button>
      </div>

      {/* Subtabs */}
      <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
        {([
          { id: "overview", label: "Visão Geral" },
          { id: "income", label: "Entradas" },
          { id: "expense", label: "Saídas" },
          { id: "tithers", label: "Dizimistas" },
          { id: "offers", label: "Ofertas" },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`whitespace-nowrap rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors ${
              tab === t.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Range */}
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {RANGES.map((r) => (
          <button
            key={r.id}
            onClick={() => setRange(r.id)}
            className={`whitespace-nowrap rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
              range === r.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {tab === "tithers" ? (
        <TithersView churches={churches ?? []} churchLabel={churchLabel} />
      ) : tab === "offers" ? (
        <OffersView churches={churches ?? []} churchLabel={churchLabel} />
      ) : (
        <>
          <div className="neu-card mt-5 p-6">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <Wallet className="h-3.5 w-3.5" /> {tab === "income" ? "Total de entradas" : tab === "expense" ? "Total de saídas" : "Saldo"}
            </div>
            <p className="mt-2 text-4xl font-bold tracking-tight text-gradient">
              {fmt(tab === "income" ? totals.ins : tab === "expense" ? totals.outs : totals.balance)}
            </p>
            {tab === "overview" && (
              <div className="mt-5 grid grid-cols-2 gap-3">
                <Tile icon={ArrowUpRight} label="Entradas" value={fmt(totals.ins)} tone="success" />
                <Tile icon={ArrowDownRight} label="Saídas" value={fmt(totals.outs)} tone="destructive" />
              </div>
            )}
          </div>

          {tab === "overview" && (
            <>
              <div className="neu-card mt-4 p-4">
                <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Evolução</p>
                <div className="h-[240px]">
                  {isLoading ? (
                    <div className="grid h-full place-items-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={chartData} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
                        <CartesianGrid stroke="oklch(1 0 0 / 6%)" vertical={false} />
                        <XAxis dataKey="label" stroke="oklch(0.68 0.018 260)" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="oklch(0.68 0.018 260)" fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip
                          contentStyle={{ background: "var(--surface-elevated)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
                          labelStyle={{ color: "var(--muted-foreground)" }}
                          formatter={(v: number) => fmt(v)}
                        />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="entradas" name="Entradas" radius={[6, 6, 0, 0]} fill="var(--success)" />
                        <Bar dataKey="saidas" name="Saídas" radius={[6, 6, 0, 0]} fill="var(--destructive)" />
                        <Line dataKey="saldo" name="Saldo" stroke="var(--primary)" strokeWidth={2.5} dot={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <Insight label="Maior entrada" value={fmt(insights.maxIn)} />
                <Insight label="Maior gasto" value={fmt(insights.maxOut)} />
                <Insight label="Melhor mês" value={insights.bestMonth} />
                <Insight label="Saldo médio" value={fmt(insights.avgBalance)} />
              </div>
            </>
          )}

          <h2 className="mt-8 mb-3 text-sm font-semibold text-muted-foreground">
            {tab === "income" ? "Entradas" : tab === "expense" ? "Saídas" : "Movimentações"}
          </h2>
          <div className="space-y-2 pb-10">
            {(() => {
              const list = txs.filter((t) => tab === "overview" || t.type === tab);
              if (!list.length) {
                return (
                  <div className="neu-card p-5 text-center text-sm text-muted-foreground">
                    Nenhuma movimentação no período.
                  </div>
                );
              }
              return list.slice(0, 50).map((t) => (
                <button
                  key={t.id}
                  onClick={() => { feedback("tap"); setSelectedTx(t); }}
                  className="neu-card flex w-full items-center gap-3 p-3.5 text-left active:scale-[0.99] transition-transform"
                >
                  <span className={`grid h-9 w-9 place-items-center rounded-xl ${t.type === "income" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
                    {t.type === "income" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium">
                      {t.category || (t.type === "income" ? "Entrada" : "Saída")}
                      {t.tither_name && <span className="text-muted-foreground"> · {t.tither_name}</span>}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{t.description || new Date(t.occurred_at).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <p className={`text-sm font-semibold ${t.type === "income" ? "text-success" : "text-destructive"}`}>
                    {t.type === "income" ? "+" : "-"}{fmt(t.amount)}
                  </p>
                </button>
              ));
            })()}
          </div>
        </>
      )}

      {selectedTx && (
        <TxDetailModal tx={selectedTx} churches={churches ?? []} onClose={() => setSelectedTx(null)} />
      )}
    </div>
  );
}

function Tile({ icon: Icon, label, value, tone }: { icon: typeof ArrowUpRight; label: string; value: string; tone: "success" | "destructive" }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-surface-elevated/80 p-3">
      <div className={`mb-1 inline-flex items-center gap-1.5 text-xs ${tone === "success" ? "text-success" : "text-destructive"}`}>
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <p className="text-base font-semibold">{value}</p>
    </div>
  );
}

function Insight({ label, value }: { label: string; value: string }) {
  return (
    <div className="neu-card p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1.5 text-base font-semibold">{value}</p>
    </div>
  );
}

function buildSeries(txs: Tx[], days: number) {
  const buckets = days <= 31 ? days : days <= 90 ? Math.ceil(days / 7) : 12;
  const isMonthly = days > 90;
  const now = new Date();
  const map = new Map<string, { entradas: number; saidas: number; key: string }>();

  if (isMonthly) {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map.set(k, { entradas: 0, saidas: 0, key: k });
    }
  } else if (days > 31) {
    for (let i = buckets - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 7 * 86400000);
      const k = `${d.getFullYear()}-W${weekOf(d)}`;
      map.set(k, { entradas: 0, saidas: 0, key: k });
    }
  } else {
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const k = d.toISOString().slice(0, 10);
      map.set(k, { entradas: 0, saidas: 0, key: k });
    }
  }

  txs.forEach((t) => {
    const d = new Date(t.occurred_at);
    let k: string;
    if (isMonthly) k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    else if (days > 31) k = `${d.getFullYear()}-W${weekOf(d)}`;
    else k = t.occurred_at;
    const b = map.get(k);
    if (!b) return;
    if (t.type === "income") b.entradas += t.amount;
    else b.saidas += t.amount;
  });

  let saldo = 0;
  return Array.from(map.values()).map((b) => {
    saldo += b.entradas - b.saidas;
    return {
      label: formatLabel(b.key, isMonthly, days > 31),
      entradas: b.entradas,
      saidas: b.saidas,
      saldo,
    };
  });
}

function weekOf(d: Date) {
  const onejan = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7);
}
function formatLabel(k: string, monthly: boolean, weekly: boolean) {
  if (monthly) {
    const [y, m] = k.split("-");
    return new Date(Number(y), Number(m) - 1, 1).toLocaleString("pt-BR", { month: "short" });
  }
  if (weekly) return k.split("-W")[1] + "ª";
  const d = new Date(k);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function buildInsights(txs: Tx[]) {
  const maxIn = Math.max(0, ...txs.filter((t) => t.type === "income").map((t) => t.amount));
  const maxOut = Math.max(0, ...txs.filter((t) => t.type === "expense").map((t) => t.amount));
  const byMonth = new Map<string, number>();
  txs.forEach((t) => {
    const k = t.occurred_at.slice(0, 7);
    byMonth.set(k, (byMonth.get(k) ?? 0) + (t.type === "income" ? t.amount : -t.amount));
  });
  const sorted = [...byMonth.entries()].sort((a, b) => b[1] - a[1]);
  const best = sorted[0];
  const bestMonth = best
    ? new Date(best[0] + "-01").toLocaleString("pt-BR", { month: "long", year: "numeric" })
    : "—";
  const avgBalance = sorted.length ? sorted.reduce((a, b) => a + b[1], 0) / sorted.length : 0;
  return { maxIn, maxOut, bestMonth, avgBalance };
}

type TitheStats = {
  total: number;
  uniqueCount: number;
  byPerson: { name: string; total: number; count: number; lastDate: string; churchId: string }[];
  byChurch: { id: string; name: string; total: number }[];
  monthlyGrowth: number;
};

function buildTitheStats(txs: Tx[], churches: { id: string; name: string }[]): TitheStats {
  const tithes = txs.filter((t) => t.type === "income" && (t.category === "Dízimo" || !!t.tither_name));
  const total = tithes.reduce((a, b) => a + b.amount, 0);
  const personMap = new Map<string, { name: string; total: number; count: number; lastDate: string; churchId: string }>();
  tithes.forEach((t) => {
    const name = (t.tither_name || "").trim();
    if (!name) return;
    const key = name.toLowerCase();
    const cur = personMap.get(key) ?? { name, total: 0, count: 0, lastDate: t.occurred_at, churchId: t.church_id };
    cur.total += t.amount;
    cur.count += 1;
    if (t.occurred_at > cur.lastDate) cur.lastDate = t.occurred_at;
    personMap.set(key, cur);
  });
  const byPerson = [...personMap.values()].sort((a, b) => b.total - a.total);

  const churchMap = new Map<string, number>();
  tithes.forEach((t) => churchMap.set(t.church_id, (churchMap.get(t.church_id) ?? 0) + t.amount));
  const byChurch = [...churchMap.entries()]
    .map(([id, total]) => ({ id, total, name: churches.find((c) => c.id === id)?.name ?? "Igreja" }))
    .sort((a, b) => b.total - a.total);

  // Monthly growth: this month vs previous month
  const now = new Date();
  const thisKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevKey = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
  let cur = 0, last = 0;
  tithes.forEach((t) => {
    const k = t.occurred_at.slice(0, 7);
    if (k === thisKey) cur += t.amount;
    else if (k === prevKey) last += t.amount;
  });
  const monthlyGrowth = last === 0 ? (cur > 0 ? 100 : 0) : ((cur - last) / last) * 100;

  return { total, uniqueCount: byPerson.length, byPerson, byChurch, monthlyGrowth };
}

type Church = { id: string; type: "matriz" | "filial"; name: string };

function monthLabel(y: number, m: number) {
  return new Date(y, m, 1).toLocaleString("pt-BR", { month: "long", year: "numeric" });
}

function TithersView({ churches, churchLabel }: { churches: Church[]; churchLabel: string }) {
  const { user } = useAuth();
  const { value: filter } = useActiveChurch();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [openName, setOpenName] = useState<string | null>(null);

  const monthStart = useMemo(() => new Date(year, month, 1).toISOString().slice(0, 10), [year, month]);
  const nextMonthStart = useMemo(() => new Date(year, month + 1, 1).toISOString().slice(0, 10), [year, month]);
  const prevMonthStart = useMemo(() => new Date(year, month - 1, 1).toISOString().slice(0, 10), [year, month]);

  const { data: monthTx = [], isLoading } = useQuery({
    queryKey: ["tithes", user?.id, filter, year, month],
    enabled: !!user,
    queryFn: async (): Promise<Tx[]> => {
      const ids = scopedChurchIds(churches, filter);
      let q = supabase.from("transactions").select("*")
        .eq("type", "income")
        .gte("occurred_at", prevMonthStart)
        .lt("occurred_at", nextMonthStart);
      if (ids) q = q.in("church_id", ids);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((d) => ({ ...d, amount: Number(d.amount) })) as Tx[];
    },
  });

  // Pull member roles for the names
  const titherNames = useMemo(
    () => Array.from(new Set(monthTx.filter(isTithe).map((t) => (t.tither_name || "").trim()).filter(Boolean))),
    [monthTx],
  );
  const { data: memberRoles = {} } = useQuery({
    queryKey: ["tither-roles", user?.id, titherNames.join("|")],
    enabled: !!user && titherNames.length > 0,
    queryFn: async (): Promise<Record<string, string>> => {
      const { data, error } = await supabase
        .from("members")
        .select("name, ministerial_role")
        .in("name", titherNames);
      if (error) throw error;
      const map: Record<string, string> = {};
      (data ?? []).forEach((m: any) => { if (m.name) map[m.name.toLowerCase()] = m.ministerial_role || "Membro"; });
      return map;
    },
  });

  // Split current vs previous month
  const curTithes = useMemo(() => monthTx.filter((t) => isTithe(t) && t.occurred_at >= monthStart && t.occurred_at < nextMonthStart), [monthTx, monthStart, nextMonthStart]);
  const prevTithes = useMemo(() => monthTx.filter((t) => isTithe(t) && t.occurred_at >= prevMonthStart && t.occurred_at < monthStart), [monthTx, prevMonthStart, monthStart]);

  const churchName = (id: string) => churches.find((c) => c.id === id)?.name ?? "—";
  const roleOf = (name: string) => memberRoles[name.toLowerCase()] || "Membro";

  // People list filtered by role
  const people = useMemo(() => {
    const m = new Map<string, { name: string; total: number; count: number; lastDate: string; churchId: string; role: string }>();
    curTithes.forEach((t) => {
      const name = (t.tither_name || "").trim();
      if (!name) return;
      const k = name.toLowerCase();
      const role = roleOf(name);
      const cur = m.get(k) ?? { name, total: 0, count: 0, lastDate: t.occurred_at, churchId: t.church_id, role };
      cur.total += t.amount;
      cur.count += 1;
      if (t.occurred_at > cur.lastDate) cur.lastDate = t.occurred_at;
      m.set(k, cur);
    });
    return [...m.values()]
      .filter((p) => roleFilter === "all" || p.role === roleFilter)
      .sort((a, b) => b.total - a.total);
  }, [curTithes, roleFilter, memberRoles]);

  const totalCur = curTithes.reduce((a, b) => a + b.amount, 0);
  const totalPrev = prevTithes.reduce((a, b) => a + b.amount, 0);
  const growth = totalPrev === 0 ? (totalCur > 0 ? 100 : 0) : ((totalCur - totalPrev) / totalPrev) * 100;

  // By church
  const byChurch = useMemo(() => {
    const m = new Map<string, number>();
    curTithes.forEach((t) => m.set(t.church_id, (m.get(t.church_id) ?? 0) + t.amount));
    return [...m.entries()]
      .map(([id, total]) => ({ id, total, name: churchName(id) }))
      .sort((a, b) => b.total - a.total);
  }, [curTithes, churches]);
  const topChurch = byChurch[0];

  // Daily chart series for current month
  const chart = useMemo(() => {
    const days = new Date(year, month + 1, 0).getDate();
    const arr = Array.from({ length: days }, (_, i) => ({ d: i + 1, valor: 0 }));
    curTithes.forEach((t) => {
      const d = new Date(t.occurred_at).getDate();
      arr[d - 1].valor += t.amount;
    });
    return arr;
  }, [curTithes, year, month]);

  const allRoles = useMemo(() => {
    const s = new Set<string>();
    people.forEach((p) => s.add(p.role));
    return Array.from(s);
  }, [people]);

  const navMonth = (delta: number) => {
    feedback("switch");
    let y = year, m = month + delta;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setYear(y); setMonth(m);
  };

  const shareWhatsapp = () => {
    feedback("success");
    const lines = [
      `📊 *Relatório de Dizimistas — ${monthLabel(year, month)}*`,
      ``,
      `👥 Dizimistas: ${people.length}`,
      `💰 Total arrecadado: ${fmt(totalCur)}`,
      ``,
      topChurch ? `⭐ Maior arrecadação: ${topChurch.name} — ${fmt(topChurch.total)}` : "",
      ``,
      `📈 Crescimento: ${growth >= 0 ? "+" : ""}${growth.toFixed(0)}% vs mês anterior`,
      ``,
      `🙏 Igreja Fácil`,
    ].filter(Boolean).join("\n");
    window.open(`https://wa.me/?text=${encodeURIComponent(lines)}`, "_blank");
  };

  const downloadPdf = async () => {
    feedback("success");
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      doc.setFontSize(20);
      doc.text("Relatório de Dizimistas", 14, 20);
      doc.setFontSize(11);
      doc.setTextColor(120);
      doc.text(`${churchLabel} — ${monthLabel(year, month)}`, 14, 28);

      doc.setTextColor(0);
      doc.setFontSize(13);
      doc.text(`Total arrecadado: ${fmt(totalCur)}`, 14, 44);
      doc.text(`Dizimistas: ${people.length}`, 14, 52);
      doc.text(`Crescimento: ${growth >= 0 ? "+" : ""}${growth.toFixed(0)}% vs mês anterior`, 14, 60);

      let y = 76;
      if (byChurch.length) {
        doc.setFontSize(12);
        doc.text("Por igreja", 14, y); y += 8;
        doc.setFontSize(10);
        byChurch.forEach((c) => {
          if (y > 280) { doc.addPage(); y = 20; }
          doc.text(`${c.name}: ${fmt(c.total)}`, 14, y); y += 6;
        });
        y += 4;
      }

      doc.setFontSize(12);
      doc.text("Dizimistas do mês", 14, y); y += 8;
      doc.setFontSize(10);
      people.forEach((p) => {
        if (y > 280) { doc.addPage(); y = 20; }
        const line = `${p.name.slice(0, 36).padEnd(36)} ${churchName(p.churchId).slice(0, 18).padEnd(18)} ${fmt(p.total)}`;
        doc.text(line, 14, y);
        y += 6;
      });

      doc.setFontSize(9); doc.setTextColor(140);
      doc.text("Relatório gerado pelo Igreja Fácil", 14, 290);
      doc.save(`dizimistas-${year}-${String(month + 1).padStart(2, "0")}.pdf`);
    } catch {
      toast.error("Não foi possível gerar o PDF.");
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Month picker */}
      <div className="neu-card mt-5 flex items-center justify-between p-3">
        <button onClick={() => navMonth(-1)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-surface-elevated active:scale-95 transition-transform">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Ciclo mensal</p>
          <p className="text-sm font-bold capitalize">{monthLabel(year, month)}</p>
        </div>
        <button onClick={() => navMonth(1)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-surface-elevated active:scale-95 transition-transform">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Summary cards */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <SummaryCard icon={UsersIcon} label="Dizimistas" value={String(people.length)} accent="primary" />
        <SummaryCard icon={Wallet} label="Total do mês" value={fmt(totalCur)} accent="success" />
        <SummaryCard
          icon={Sparkles}
          label="Maior arrecadação"
          value={topChurch ? topChurch.name : "—"}
          sub={topChurch ? fmt(topChurch.total) : ""}
          accent="primary"
        />
        <SummaryCard
          icon={growth >= 0 ? ArrowUpRight : ArrowDownRight}
          label="Crescimento"
          value={`${growth >= 0 ? "+" : ""}${growth.toFixed(0)}%`}
          sub="vs mês anterior"
          accent={growth >= 0 ? "success" : "destructive"}
        />
      </div>

      {/* Chart */}
      <div className="neu-card mt-4 p-4">
        <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Dízimos por dia</p>
        <div className="h-[180px]">
          {isLoading ? (
            <div className="grid h-full place-items-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} margin={{ top: 6, right: 8, left: -22, bottom: 0 }}>
                <CartesianGrid stroke="oklch(1 0 0 / 6%)" vertical={false} />
                <XAxis dataKey="d" stroke="oklch(0.68 0.018 260)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="oklch(0.68 0.018 260)" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: "var(--surface-elevated)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
                  labelFormatter={(l) => `Dia ${l}`}
                  formatter={(v: number) => fmt(v)}
                />
                <Bar dataKey="valor" name="Dízimos" radius={[6, 6, 0, 0]} fill="var(--primary)" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <button onClick={shareWhatsapp} className="neu-card flex items-center justify-center gap-2 p-3 text-sm font-medium active:scale-[0.98] transition-transform">
          <MessageCircle className="h-4 w-4 text-success" /> Compartilhar
        </button>
        <button onClick={downloadPdf} className="neu-card flex items-center justify-center gap-2 p-3 text-sm font-medium active:scale-[0.98] transition-transform">
          <FileDown className="h-4 w-4 text-primary" /> Baixar PDF
        </button>
      </div>

      {/* Role filter */}
      {allRoles.length > 0 && (
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => { setRoleFilter("all"); feedback("tap"); }}
            className={`whitespace-nowrap rounded-full border px-4 py-1.5 text-xs font-medium ${
              roleFilter === "all" ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface/60 text-muted-foreground"
            }`}
          >
            Todos
          </button>
          {allRoles.map((r) => {
            const t = roleTone(r);
            const active = roleFilter === r;
            return (
              <button
                key={r}
                onClick={() => { setRoleFilter(r); feedback("tap"); }}
                className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium ${
                  active ? `${t.badge}` : "border-border bg-surface/60 text-muted-foreground"
                }`}
              >
                {t.emoji} {r}
              </button>
            );
          })}
        </div>
      )}

      {/* List */}
      <h2 className="mt-6 mb-3 text-sm font-semibold text-muted-foreground">Dizimistas do mês</h2>
      <div className="space-y-2 pb-10">
        {people.length === 0 && (
          <div className="neu-card p-5 text-center text-sm text-muted-foreground">
            Nenhum dízimo registrado neste mês.
          </div>
        )}
        {people.map((p) => {
          const t = roleTone(p.role);
          return (
            <button
              key={p.name}
              onClick={() => { setOpenName(p.name); feedback("tap"); }}
              className="neu-card flex w-full items-center gap-3 p-4 text-left active:scale-[0.99] transition-transform"
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary text-base">
                {t.emoji}
              </span>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-semibold">{p.name}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${t.badge}`}>
                    {p.role}
                  </span>
                  <span>{churchName(p.churchId)}</span>
                  <span>· {p.count}× · última {new Date(p.lastDate).toLocaleDateString("pt-BR")}</span>
                </div>
              </div>
              <p className="text-sm font-semibold text-success">{fmt(p.total)}</p>
            </button>
          );
        })}
      </div>

      {openName && (() => {
        const p = people.find((x) => x.name === openName);
        if (!p) return null;
        const history = curTithes.filter((t) => (t.tither_name ?? "").toLowerCase() === openName.toLowerCase());
        return (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 animate-in fade-in" onClick={() => setOpenName(null)}>
            <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-3xl border border-border bg-surface p-5 animate-in zoom-in-95">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Dizimista</p>
              <h3 className="text-xl font-bold">{p.name}</h3>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <SummaryCard label="Total no mês" value={fmt(p.total)} accent="success" />
                <SummaryCard label="Contribuições" value={String(p.count)} accent="primary" />
              </div>
              <p className="mt-4 mb-2 text-xs uppercase tracking-wider text-muted-foreground">Histórico do mês</p>
              <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
                {history.map((h) => (
                  <div key={h.id} className="flex items-center justify-between rounded-xl bg-surface-elevated px-3 py-2 text-sm">
                    <span className="text-muted-foreground">{new Date(h.occurred_at).toLocaleDateString("pt-BR")}</span>
                    <span className="font-semibold text-success">{fmt(h.amount)}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => setOpenName(null)} className="mt-5 w-full rounded-full border border-border py-2.5 text-sm font-medium hover:bg-surface-elevated">
                Fechar
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function isTithe(t: Tx) {
  return t.type === "income" && (t.category === "Dízimo" || !!t.tither_name);
}

function isOffer(t: Tx) {
  return t.type === "income" && (t.category === "Oferta" || t.category === "Oferta Especial");
}

function OffersView({ churches, churchLabel }: { churches: Church[]; churchLabel: string }) {
  const { user } = useAuth();
  const { value: filter } = useActiveChurch();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [churchFilter, setChurchFilter] = useState<string>("all");

  const monthStart = useMemo(() => new Date(year, month, 1).toISOString().slice(0, 10), [year, month]);
  const nextMonthStart = useMemo(() => new Date(year, month + 1, 1).toISOString().slice(0, 10), [year, month]);
  const prevMonthStart = useMemo(() => new Date(year, month - 1, 1).toISOString().slice(0, 10), [year, month]);

  const { data: monthTx = [], isLoading } = useQuery({
    queryKey: ["offers", user?.id, filter, year, month],
    enabled: !!user,
    queryFn: async (): Promise<Tx[]> => {
      const ids = scopedChurchIds(churches, filter);
      let q = supabase.from("transactions").select("*")
        .eq("type", "income")
        .gte("occurred_at", prevMonthStart)
        .lt("occurred_at", nextMonthStart);
      if (ids) q = q.in("church_id", ids);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((d) => ({ ...d, amount: Number(d.amount) })) as Tx[];
    },
  });

  const curOffers = useMemo(() => monthTx.filter((t) => isOffer(t) && t.occurred_at >= monthStart && t.occurred_at < nextMonthStart), [monthTx, monthStart, nextMonthStart]);
  const prevOffers = useMemo(() => monthTx.filter((t) => isOffer(t) && t.occurred_at >= prevMonthStart && t.occurred_at < monthStart), [monthTx, prevMonthStart, monthStart]);

  const churchName = (id: string) => churches.find((c) => c.id === id)?.name ?? "—";

  const filteredOffers = useMemo(() => {
    if (churchFilter === "all") return curOffers;
    return curOffers.filter((t) => t.church_id === churchFilter);
  }, [curOffers, churchFilter]);

  const totalCur = curOffers.reduce((a, b) => a + b.amount, 0);
  const totalPrev = prevOffers.reduce((a, b) => a + b.amount, 0);
  const growth = totalPrev === 0 ? (totalCur > 0 ? 100 : 0) : ((totalCur - totalPrev) / totalPrev) * 100;

  const byChurch = useMemo(() => {
    const m = new Map<string, number>();
    curOffers.forEach((t) => m.set(t.church_id, (m.get(t.church_id) ?? 0) + t.amount));
    return [...m.entries()]
      .map(([id, total]) => ({ id, total, name: churchName(id) }))
      .sort((a, b) => b.total - a.total);
  }, [curOffers, churches]);
  const topChurch = byChurch[0];

  const chart = useMemo(() => {
    const days = new Date(year, month + 1, 0).getDate();
    const arr = Array.from({ length: days }, (_, i) => ({ d: i + 1, valor: 0 }));
    curOffers.forEach((t) => {
      const d = new Date(t.occurred_at).getDate();
      arr[d - 1].valor += t.amount;
    });
    return arr;
  }, [curOffers, year, month]);

  const navMonth = (delta: number) => {
    feedback("switch");
    let y = year, m = month + delta;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setYear(y); setMonth(m);
  };

  const shareWhatsapp = () => {
    feedback("success");
    const lines = [
      `📊 *Relatório de Ofertas — ${monthLabel(year, month)}*`,
      ``,
      `🎁 Ofertas registradas: ${curOffers.length}`,
      `💰 Total arrecadado: ${fmt(totalCur)}`,
      ``,
      topChurch ? `⭐ Maior arrecadação: ${topChurch.name} — ${fmt(topChurch.total)}` : "",
      ``,
      `📈 Crescimento: ${growth >= 0 ? "+" : ""}${growth.toFixed(0)}% vs mês anterior`,
      ``,
      `🙏 Igreja Fácil`,
    ].filter(Boolean).join("\n");
    window.open(`https://wa.me/?text=${encodeURIComponent(lines)}`, "_blank");
  };

  const downloadPdf = async () => {
    feedback("success");
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      doc.setFontSize(20);
      doc.text("Relatório de Ofertas", 14, 20);
      doc.setFontSize(11);
      doc.setTextColor(120);
      doc.text(`${churchLabel} — ${monthLabel(year, month)}`, 14, 28);

      doc.setTextColor(0);
      doc.setFontSize(13);
      doc.text(`Total arrecadado: ${fmt(totalCur)}`, 14, 44);
      doc.text(`Ofertas: ${curOffers.length}`, 14, 52);
      doc.text(`Crescimento: ${growth >= 0 ? "+" : ""}${growth.toFixed(0)}% vs mês anterior`, 14, 60);

      let y = 76;
      if (byChurch.length) {
        doc.setFontSize(12);
        doc.text("Por igreja", 14, y); y += 8;
        doc.setFontSize(10);
        byChurch.forEach((c) => {
          if (y > 280) { doc.addPage(); y = 20; }
          doc.text(`${c.name}: ${fmt(c.total)}`, 14, y); y += 6;
        });
        y += 4;
      }

      doc.setFontSize(12);
      doc.text("Ofertas do mês", 14, y); y += 8;
      doc.setFontSize(10);
      filteredOffers.forEach((t) => {
        if (y > 280) { doc.addPage(); y = 20; }
        const line = `${new Date(t.occurred_at).toLocaleDateString("pt-BR")}   ${churchName(t.church_id).slice(0, 18).padEnd(18)} ${fmt(t.amount)}   ${t.description ?? ""}`.slice(0, 95);
        doc.text(line, 14, y);
        y += 6;
      });

      doc.setFontSize(9); doc.setTextColor(140);
      doc.text("Relatório gerado pelo Igreja Fácil", 14, 290);
      doc.save(`ofertas-${year}-${String(month + 1).padStart(2, "0")}.pdf`);
    } catch {
      toast.error("Não foi possível gerar o PDF.");
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Month picker */}
      <div className="neu-card mt-5 flex items-center justify-between p-3">
        <button onClick={() => navMonth(-1)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-surface-elevated active:scale-95 transition-transform">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Ciclo mensal</p>
          <p className="text-sm font-bold capitalize">{monthLabel(year, month)}</p>
        </div>
        <button onClick={() => navMonth(1)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-surface-elevated active:scale-95 transition-transform">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Summary cards */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <SummaryCard icon={Wallet} label="Ofertas" value={String(curOffers.length)} accent="primary" />
        <SummaryCard icon={Wallet} label="Total do mês" value={fmt(totalCur)} accent="success" />
        <SummaryCard
          icon={Sparkles}
          label="Maior arrecadação"
          value={topChurch ? topChurch.name : "—"}
          sub={topChurch ? fmt(topChurch.total) : ""}
          accent="primary"
        />
        <SummaryCard
          icon={growth >= 0 ? ArrowUpRight : ArrowDownRight}
          label="Crescimento"
          value={`${growth >= 0 ? "+" : ""}${growth.toFixed(0)}%`}
          sub="vs mês anterior"
          accent={growth >= 0 ? "success" : "destructive"}
        />
      </div>

      {/* Chart */}
      <div className="neu-card mt-4 p-4">
        <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Ofertas por dia</p>
        <div className="h-[180px]">
          {isLoading ? (
            <div className="grid h-full place-items-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} margin={{ top: 6, right: 8, left: -22, bottom: 0 }}>
                <CartesianGrid stroke="oklch(1 0 0 / 6%)" vertical={false} />
                <XAxis dataKey="d" stroke="oklch(0.68 0.018 260)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="oklch(0.68 0.018 260)" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: "var(--surface-elevated)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
                  labelFormatter={(l) => `Dia ${l}`}
                  formatter={(v: number) => fmt(v)}
                />
                <Bar dataKey="valor" name="Ofertas" radius={[6, 6, 0, 0]} fill="var(--primary)" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <button onClick={shareWhatsapp} className="neu-card flex items-center justify-center gap-2 p-3 text-sm font-medium active:scale-[0.98] transition-transform">
          <MessageCircle className="h-4 w-4 text-success" /> Compartilhar
        </button>
        <button onClick={downloadPdf} className="neu-card flex items-center justify-center gap-2 p-3 text-sm font-medium active:scale-[0.98] transition-transform">
          <FileDown className="h-4 w-4 text-primary" /> Baixar PDF
        </button>
      </div>

      {/* Church filter */}
      {byChurch.length > 0 && (
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => { setChurchFilter("all"); feedback("tap"); }}
            className={`whitespace-nowrap rounded-full border px-4 py-1.5 text-xs font-medium ${
              churchFilter === "all" ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface/60 text-muted-foreground"
            }`}
          >
            Todas as igrejas
          </button>
          {byChurch.map((c) => {
            const active = churchFilter === c.id;
            return (
              <button
                key={c.id}
                onClick={() => { setChurchFilter(c.id); feedback("tap"); }}
                className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium ${
                  active ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface/60 text-muted-foreground"
                }`}
              >
                {c.name}
              </button>
            );
          })}
        </div>
      )}

      {/* List */}
      <h2 className="mt-6 mb-3 text-sm font-semibold text-muted-foreground">Ofertas do mês</h2>
      <div className="space-y-2 pb-10">
        {filteredOffers.length === 0 && (
          <div className="neu-card p-5 text-center text-sm text-muted-foreground">
            Nenhuma oferta registrada neste mês.
          </div>
        )}
        {filteredOffers.map((t) => (
          <div
            key={t.id}
            className="neu-card flex w-full items-center gap-3 p-3.5"
          >
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/15 text-primary">
              <Wallet className="h-4 w-4" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium">{t.category || "Oferta"}</p>
              <p className="truncate text-xs text-muted-foreground">
                {churchName(t.church_id)} · {new Date(t.occurred_at).toLocaleDateString("pt-BR")}
                {t.description && ` · ${t.description}`}
              </p>
            </div>
            <p className="text-sm font-semibold text-success">+{fmt(t.amount)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}


function SummaryCard({
  icon: Icon, label, value, sub, accent = "primary",
}: {
  icon?: typeof Wallet;
  label: string; value: string; sub?: string;
  accent?: "primary" | "success" | "destructive";
}) {
  const tone = accent === "success" ? "text-success" : accent === "destructive" ? "text-destructive" : "text-primary";
  return (
    <div className="neu-card p-4">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
        {Icon && <Icon className={`h-3.5 w-3.5 ${tone}`} />} {label}
      </div>
      <p className={`mt-1.5 truncate text-base font-bold ${tone}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function TxDetailModal({ tx, churches, onClose }: { tx: Tx; churches: Church[]; onClose: () => void }) {
  const invalidate = useInvalidateAll();
  const [editing, setEditing] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [busy, setBusy] = useState(false);

  const [amount, setAmount] = useState(String(tx.amount).replace(".", ","));
  const [category, setCategory] = useState(tx.category ?? "");
  const [description, setDescription] = useState(tx.description ?? "");
  const [churchId, setChurchId] = useState(tx.church_id);
  const [occurredAt, setOccurredAt] = useState(tx.occurred_at);
  const [titherName, setTitherName] = useState(tx.tither_name ?? "");

  const churchName = churches.find((c) => c.id === tx.church_id)?.name ?? "—";

  const save = async () => {
    setBusy(true);
    const { error } = await supabase
      .from("transactions")
      .update({
        amount: Number(amount.replace(",", ".")),
        category: category || null,
        description: description || null,
        church_id: churchId,
        occurred_at: occurredAt,
        tither_name: titherName.trim() || null,
      })
      .eq("id", tx.id);
    setBusy(false);
    if (error) { feedback("error"); return toast.error(error.message); }
    feedback("success");
    toast.success("Movimentação atualizada!");
    invalidate();
    onClose();
  };

  const remove = async () => {
    setBusy(true);
    const { error } = await supabase.from("transactions").delete().eq("id", tx.id);
    setBusy(false);
    if (error) { feedback("error"); return toast.error(error.message); }
    feedback("success");
    toast.success("Movimentação excluída.");
    invalidate();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl border border-border bg-surface p-5 shadow-[var(--shadow-soft)] animate-in zoom-in-95"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              {tx.type === "income" ? "Entrada" : "Saída"}
            </p>
            <h3 className={`text-2xl font-bold ${tx.type === "income" ? "text-success" : "text-destructive"}`}>
              {tx.type === "income" ? "+" : "-"}{fmt(Number(amount.replace(",", ".") || tx.amount))}
            </h3>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-surface-elevated">
            <X className="h-4 w-4" />
          </button>
        </div>

        {!editing && !confirmDel && (
          <>
            <dl className="space-y-2.5 rounded-2xl bg-surface-elevated/60 p-4 text-sm">
              <Row label="Categoria" value={tx.category || "—"} />
              <Row label="Data" value={new Date(tx.occurred_at).toLocaleDateString("pt-BR")} />
              <Row label="Igreja" value={churchName} />
              {tx.tither_name && <Row label="Dizimista" value={tx.tither_name} />}
              <Row label="Observação" value={tx.description || "—"} />
            </dl>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                onClick={() => { feedback("tap"); setEditing(true); }}
                className="flex items-center justify-center gap-2 rounded-full border border-border bg-surface-elevated py-2.5 text-sm font-medium hover:bg-surface"
              >
                <Pencil className="h-4 w-4" /> Editar
              </button>
              <button
                onClick={() => { feedback("warning"); setConfirmDel(true); }}
                className="flex items-center justify-center gap-2 rounded-full border border-destructive/40 bg-destructive/10 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/15"
              >
                <Trash2 className="h-4 w-4" /> Excluir
              </button>
            </div>
          </>
        )}

        {editing && (
          <form onSubmit={(e) => { e.preventDefault(); save(); }} className="space-y-3">
            <Field label="Valor (R$)">
              <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" required className="input" />
            </Field>
            <Field label="Categoria">
              <input value={category} onChange={(e) => setCategory(e.target.value)} className="input" />
            </Field>
            <Field label="Data">
              <input type="date" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} required className="input" />
            </Field>
            <Field label="Igreja">
              <select value={churchId} onChange={(e) => setChurchId(e.target.value)} className="input">
                {churches.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}{c.type === "matriz" ? " (Matriz)" : ""}</option>
                ))}
              </select>
            </Field>
            {tx.type === "income" && (
              <Field label="Dizimista (opcional)">
                <input value={titherName} onChange={(e) => setTitherName(e.target.value)} className="input" />
              </Field>
            )}
            <Field label="Observação">
              <input value={description} onChange={(e) => setDescription(e.target.value)} className="input" />
            </Field>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setEditing(false)} className="rounded-full border border-border py-2.5 text-sm font-medium hover:bg-surface-elevated">
                Cancelar
              </button>
              <button type="submit" disabled={busy} className="flex items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60" style={{ background: "var(--gradient-primary)" }}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
              </button>
            </div>
          </form>
        )}

        {confirmDel && (
          <div>
            <p className="rounded-2xl bg-destructive/10 p-4 text-sm text-foreground">
              Deseja realmente excluir esta movimentação? Esta ação não pode ser desfeita.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button onClick={() => setConfirmDel(false)} className="rounded-full border border-border py-2.5 text-sm font-medium hover:bg-surface-elevated">
                Cancelar
              </button>
              <button onClick={remove} disabled={busy} className="flex items-center justify-center gap-2 rounded-full bg-destructive py-2.5 text-sm font-semibold text-destructive-foreground disabled:opacity-60">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Excluir
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="max-w-[60%] text-right text-sm font-medium">{value}</dd>
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

