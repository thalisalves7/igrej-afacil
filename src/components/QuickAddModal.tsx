import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useChurches, useInvalidateAll } from "@/lib/data";
import { useAuth } from "@/lib/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Users, Wallet, Calendar, ArrowLeft, Loader2, TrendingUp, TrendingDown, UserPlus, UserCheck } from "lucide-react";
import { MINISTERIAL_ROLES, roleTone } from "@/lib/ministerial-roles";
import { calcAge } from "@/lib/age";


type Step =
  | { kind: "root" }
  | { kind: "person" }
  | { kind: "finance" }
  | { kind: "event" }
  | { kind: "form-member"; memberType: "member" | "visitor" }
  | { kind: "form-tx"; txType: "income" | "expense" }
  | { kind: "form-event"; eventType: "culto" | "reuniao" | "campanha" };

export function QuickAddModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState<Step>({ kind: "root" });
  const close = () => {
    setStep({ kind: "root" });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto border-border bg-surface p-0 sm:rounded-3xl">
        <DialogHeader className="border-b border-border/60 p-5">
          <div className="flex items-center gap-3">
            {step.kind !== "root" && (
              <button
                onClick={() => setStep({ kind: "root" })}
                className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <div>
              <DialogTitle className="text-lg">{titleFor(step)}</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {subtitleFor(step)}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-5">
          {step.kind === "root" && <RootStep onPick={setStep} />}
          {step.kind === "person" && <PersonStep onPick={(t) => setStep({ kind: "form-member", memberType: t })} />}
          {step.kind === "finance" && <FinanceStep onPick={(t) => setStep({ kind: "form-tx", txType: t })} />}
          {step.kind === "event" && <EventStep onPick={(t) => setStep({ kind: "form-event", eventType: t })} />}
          {step.kind === "form-member" && <MemberForm memberType={step.memberType} onDone={close} />}
          {step.kind === "form-tx" && <TxForm txType={step.txType} onDone={close} />}
          {step.kind === "form-event" && <EventForm eventType={step.eventType} onDone={close} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function titleFor(s: Step) {
  if (s.kind === "root") return "O que deseja registrar?";
  if (s.kind === "person") return "Pessoa";
  if (s.kind === "finance") return "Financeiro";
  if (s.kind === "event") return "Evento";
  if (s.kind === "form-member") return s.memberType === "member" ? "Novo membro" : "Novo visitante";
  if (s.kind === "form-tx") return s.txType === "income" ? "Nova entrada" : "Nova saída";
  if (s.kind === "form-event") return "Novo evento";
  return "";
}
function subtitleFor(s: Step) {
  if (s.kind === "root") return "Escolha rapidamente o que quer adicionar.";
  if (s.kind === "person") return "Membro ou visitante.";
  if (s.kind === "finance") return "Entrada ou saída.";
  if (s.kind === "event") return "Culto, reunião ou campanha.";
  return "Preencha apenas o essencial.";
}

function BigCard({
  icon: Icon,
  label,
  desc,
  onClick,
  tone = "default",
}: {
  icon: typeof Users;
  label: string;
  desc: string;
  onClick: () => void;
  tone?: "default" | "income" | "expense";
}) {
  const toneClass =
    tone === "income"
      ? "text-success"
      : tone === "expense"
        ? "text-destructive"
        : "text-primary";
  return (
    <button
      onClick={onClick}
      className="neu-card group flex w-full items-center gap-4 p-4 text-left transition-transform hover:-translate-y-0.5"
    >
      <span className={`grid h-11 w-11 place-items-center rounded-xl bg-surface-elevated ${toneClass}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="flex-1">
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </button>
  );
}

function RootStep({ onPick }: { onPick: (s: Step) => void }) {
  return (
    <div className="space-y-3">
      <BigCard icon={Users} label="Pessoa" desc="Membro ou visitante" onClick={() => onPick({ kind: "person" })} />
      <BigCard icon={Wallet} label="Financeiro" desc="Entrada ou saída" onClick={() => onPick({ kind: "finance" })} />
      <BigCard icon={Calendar} label="Evento" desc="Culto, reunião, campanha" onClick={() => onPick({ kind: "event" })} />
    </div>
  );
}

function PersonStep({ onPick }: { onPick: (t: "member" | "visitor") => void }) {
  return (
    <div className="space-y-3">
      <BigCard icon={UserCheck} label="Membro" desc="Faz parte da igreja" onClick={() => onPick("member")} />
      <BigCard icon={UserPlus} label="Visitante" desc="Veio conhecer" onClick={() => onPick("visitor")} />
    </div>
  );
}

function FinanceStep({ onPick }: { onPick: (t: "income" | "expense") => void }) {
  return (
    <div className="space-y-3">
      <BigCard icon={TrendingUp} tone="income" label="Entrada" desc="Dízimos, ofertas, doações" onClick={() => onPick("income")} />
      <BigCard icon={TrendingDown} tone="expense" label="Saída" desc="Contas, materiais, eventos" onClick={() => onPick("expense")} />
    </div>
  );
}

function EventStep({ onPick }: { onPick: (t: "culto" | "reuniao" | "campanha") => void }) {
  return (
    <div className="space-y-3">
      <BigCard icon={Calendar} label="Culto" desc="Domingo, meio de semana…" onClick={() => onPick("culto")} />
      <BigCard icon={Calendar} label="Reunião" desc="Liderança, ministérios" onClick={() => onPick("reuniao")} />
      <BigCard icon={Calendar} label="Campanha" desc="Jejum, oração, missões" onClick={() => onPick("campanha")} />
    </div>
  );
}

function ChurchSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { data: churches } = useChurches();
  return (
    <FormField label="Igreja">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className="w-full rounded-xl border border-input bg-surface px-4 py-3 text-sm outline-none focus:border-primary"
      >
        <option value="">Selecione…</option>
        {(churches ?? []).map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} {c.type === "matriz" ? "(Matriz)" : ""}
          </option>
        ))}
      </select>
    </FormField>
  );
}

function MemberForm({ memberType, onDone }: { memberType: "member" | "visitor"; onDone: () => void }) {
  const { user } = useAuth();
  const { data: churches } = useChurches();
  const invalidate = useInvalidateAll();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [churchId, setChurchId] = useState(() => churches?.[0]?.id ?? "");
  const [role, setRole] = useState<string>(memberType === "visitor" ? "Visitante" : "");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (memberType === "member" && !role) return toast.error("Escolha o cargo ministerial");
    setBusy(true);
    const { error } = await supabase.from("members").insert({
      owner_id: user.id,
      church_id: churchId,
      type: memberType,
      name,
      phone: phone || null,
      ministerial_role: role || null,
    } as any);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(memberType === "member" ? "Membro adicionado!" : "Visitante registrado!");
    invalidate();
    onDone();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <FormField label="Nome">
        <input value={name} onChange={(e) => setName(e.target.value)} required className="input" />
      </FormField>
      <FormField label="Telefone (opcional)">
        <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input" />
      </FormField>
      <ChurchSelect value={churchId} onChange={setChurchId} />
      {memberType === "member" && (
        <FormField label="Cargo ministerial">
          <div className="grid grid-cols-2 gap-2">
            {MINISTERIAL_ROLES.filter((r) => r !== "Visitante").map((r) => {
              const t = roleTone(r);
              const active = role === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-all ${
                    active ? `${t.badge} ring-2 ring-offset-0` : "border-border bg-surface/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className="text-base leading-none">{t.emoji}</span>
                  <span className="truncate">{r}</span>
                </button>
              );
            })}
          </div>
        </FormField>
      )}
      <SubmitBtn busy={busy} label="Salvar" />
    </form>
  );
}

const INCOME_CATEGORIES = [
  "Dízimo",
  "Oferta",
  "Oferta Especial",
  "Campanha",
  "Doação",
  "Evento",
  "Projeto",
];
const EXPENSE_CATEGORIES = [
  "Água",
  "Energia",
  "Internet",
  "Aluguel",
  "Combustível",
  "Equipamentos",
  "Obras",
  "Evangelismo",
  "Eventos",
  "Ajuda de custo",
  "Gás",
  "Outros",
];

function TxForm({ txType, onDone }: { txType: "income" | "expense"; onDone: () => void }) {
  const { user } = useAuth();
  const { data: churches } = useChurches();
  const invalidate = useInvalidateAll();
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [churchId, setChurchId] = useState(() => churches?.[0]?.id ?? "");
  const [titherName, setTitherName] = useState("");
  const [titherMemberId, setTitherMemberId] = useState<string | null>(null);
  const [showSuggest, setShowSuggest] = useState(false);
  const [busy, setBusy] = useState(false);

  const isTithe = category === "Dízimo";

  // Lookup members for autocomplete (only when needed)
  const { data: memberOptions = [] } = useQuery<{ id: string; name: string; church_id: string }[]>({
    queryKey: ["members-lookup", user?.id, churchId],
    enabled: !!user && isTithe,
    queryFn: async () => {
      let q = supabase.from("members").select("id, name, church_id").order("name");
      if (churchId) q = q.eq("church_id", churchId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as { id: string; name: string; church_id: string }[];
    },
  });

  const suggestions = titherName.length >= 1
    ? memberOptions.filter((m) => m.name.toLowerCase().includes(titherName.toLowerCase())).slice(0, 5)
    : [];

  const categories = txType === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!category) return toast.error("Escolha uma categoria");
    if (isTithe && !titherName.trim()) return toast.error("Informe o nome do dizimista");
    setBusy(true);
    const { error } = await supabase.from("transactions").insert({
      owner_id: user.id,
      church_id: churchId,
      type: txType,
      amount: Number(amount.replace(",", ".")),
      category,
      description: description || null,
      tither_name: isTithe ? titherName.trim() : null,
      tither_member_id: isTithe ? titherMemberId : null,
    } as any);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(isTithe ? "Dízimo registrado!" : txType === "income" ? "Entrada registrada!" : "Saída registrada!");
    invalidate();
    onDone();
  };

  // Step 1: pick category
  if (!category) {
    return (
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          {txType === "income" ? "Qual tipo de entrada?" : "Qual tipo de despesa?"}
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`neu-card flex min-h-[60px] items-center justify-center break-words p-3 text-center text-sm font-medium transition-transform hover:-translate-y-0.5 ${
                txType === "income" ? "hover:text-success" : "hover:text-destructive"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Step 2: form
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex items-center justify-between rounded-xl bg-surface-elevated px-3 py-2">
        <span className="text-xs text-muted-foreground">Categoria</span>
        <button
          type="button"
          onClick={() => { setCategory(""); setTitherName(""); setTitherMemberId(null); }}
          className="text-sm font-semibold text-primary hover:underline"
        >
          {category} ✎
        </button>
      </div>

      <ChurchSelect value={churchId} onChange={(v) => { setChurchId(v); setTitherMemberId(null); }} />

      {isTithe && (
        <FormField label="Dizimista">
          <div className="relative">
            <input
              value={titherName}
              onChange={(e) => { setTitherName(e.target.value); setTitherMemberId(null); setShowSuggest(true); }}
              onFocus={() => setShowSuggest(true)}
              onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
              required
              placeholder="Digite o nome…"
              className="input"
              autoComplete="off"
            />
            {showSuggest && suggestions.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-border bg-surface-elevated shadow-lg">
                {suggestions.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { setTitherName(m.name); setTitherMemberId(m.id); setShowSuggest(false); }}
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-primary/10"
                    >
                      {m.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-1 text-[11px] text-muted-foreground">
              {titherMemberId ? "✓ Membro vinculado" : "Pode digitar um nome novo (visitante)."}
            </p>
          </div>
        </FormField>
      )}

      <FormField label="Valor (R$)">
        <input
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          autoFocus={!isTithe}
          placeholder="0,00"
          className="input text-2xl font-semibold"
        />
      </FormField>
      <FormField label="Observação (opcional)">
        <input value={description} onChange={(e) => setDescription(e.target.value)} className="input" />
      </FormField>
      <SubmitBtn busy={busy} label="Salvar" />
    </form>
  );
}

function EventForm({ eventType, onDone }: { eventType: "culto" | "reuniao" | "campanha"; onDone: () => void }) {
  const { user } = useAuth();
  const { data: churches } = useChurches();
  const invalidate = useInvalidateAll();
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState("");
  const [churchId, setChurchId] = useState(() => churches?.[0]?.id ?? "");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("events").insert({
      owner_id: user.id,
      church_id: churchId,
      type: eventType,
      title,
      starts_at: new Date(when).toISOString(),
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Evento criado!");
    invalidate();
    onDone();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <FormField label="Título">
        <input value={title} onChange={(e) => setTitle(e.target.value)} required className="input" />
      </FormField>
      <FormField label="Quando">
        <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} required className="input" />
      </FormField>
      <ChurchSelect value={churchId} onChange={setChurchId} />
      <SubmitBtn busy={busy} label="Salvar" />
    </form>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function SubmitBtn({ busy, label }: { busy: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.01] disabled:opacity-60"
      style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
    >
      {busy && <Loader2 className="h-4 w-4 animate-spin" />}
      {label}
    </button>
  );
}
