import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { useChurches, useActiveChurch } from "@/lib/data";
import { ChurchFilter } from "@/components/ChurchFilter";
import { fmt, scopedChurchIds } from "./app.index";
import { useMemo, useState } from "react";
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, BarChart,
} from "recharts";
import { Wallet, TrendingUp, TrendingDown, MessageCircle, FileDown, ArrowUpRight, ArrowDownRight, Loader2, ChevronLeft, ChevronRight, Sparkles, Users as UsersIcon } from "lucide-react";
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

type SubTab = "overview" | "income" | "expense" | "tithers";

function Finance() {
  const { user } = useAuth();
  const { data: churches } = useChurches();
  const { value: filter } = useActiveChurch();
  const [range, setRange] = useState<(typeof RANGES)[number]["id"]>("30");
  const days = RANGES.find((r) => r.id === range)!.days;
  const [tab, setTab] = useState<SubTab>("overview");

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
                <div key={t.id} className="neu-card flex items-center gap-3 p-3.5">
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
                </div>
              ));
            })()}
          </div>
        </>
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

function TithersView({ txs, stats, isLoading }: { txs: Tx[]; stats: TitheStats; isLoading: boolean }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const top = stats.byChurch[0];

  if (isLoading) {
    return <div className="mt-8 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  }

  return (
    <>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Insight label="Total de dízimos" value={fmt(stats.total)} />
        <Insight label="Dizimistas" value={String(stats.uniqueCount)} />
        <Insight label="Maior arrecadação" value={top ? `${top.name}` : "—"} />
        <Insight label="Crescimento (mês)" value={`${stats.monthlyGrowth >= 0 ? "+" : ""}${stats.monthlyGrowth.toFixed(0)}%`} />
      </div>

      <h2 className="mt-8 mb-3 text-sm font-semibold text-muted-foreground">Dizimistas</h2>
      <div className="space-y-2 pb-10">
        {stats.byPerson.length === 0 && (
          <div className="neu-card p-5 text-center text-sm text-muted-foreground">
            Nenhum dízimo registrado no período. Use o botão ➕ → Financeiro → Entrada → Dízimo.
          </div>
        )}
        {stats.byPerson.map((p) => (
          <button
            key={p.name}
            onClick={() => setOpenId(openId === p.name ? null : p.name)}
            className="neu-card flex w-full items-center gap-3 p-4 text-left"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary text-sm font-semibold">
              {p.name.slice(0, 1).toUpperCase()}
            </span>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-semibold">{p.name}</p>
              <p className="text-xs text-muted-foreground">
                {p.count}× · última {new Date(p.lastDate).toLocaleDateString("pt-BR")}
              </p>
            </div>
            <p className="text-sm font-semibold text-success">{fmt(p.total)}</p>
          </button>
        ))}
      </div>

      {openId && (() => {
        const p = stats.byPerson.find((x) => x.name === openId);
        if (!p) return null;
        const history = txs.filter((t) => (t.tither_name ?? "").toLowerCase() === openId.toLowerCase());
        return (
          <div
            className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
            onClick={() => setOpenId(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-3xl border border-border bg-surface p-5"
            >
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Dizimista</p>
              <h3 className="text-xl font-bold">{p.name}</h3>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Insight label="Total contribuído" value={fmt(p.total)} />
                <Insight label="Contribuições" value={String(p.count)} />
              </div>
              <p className="mt-4 mb-2 text-xs uppercase tracking-wider text-muted-foreground">Histórico</p>
              <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
                {history.map((h) => (
                  <div key={h.id} className="flex items-center justify-between rounded-xl bg-surface-elevated px-3 py-2 text-sm">
                    <span className="text-muted-foreground">{new Date(h.occurred_at).toLocaleDateString("pt-BR")}</span>
                    <span className="font-semibold text-success">{fmt(h.amount)}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setOpenId(null)}
                className="mt-5 w-full rounded-full border border-border py-2.5 text-sm font-medium hover:bg-surface-elevated"
              >
                Fechar
              </button>
            </div>
          </div>
        );
      })()}
    </>
  );
}
