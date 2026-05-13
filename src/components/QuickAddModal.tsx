import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useState } from "react";
import { useChurches, useInvalidateAll } from "@/lib/data";
import { useAuth } from "@/lib/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Users, Wallet, Calendar, ArrowLeft, Loader2, TrendingUp, TrendingDown, UserPlus, UserCheck } from "lucide-react";

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
      <DialogContent className="max-w-md border-border bg-surface p-0 sm:rounded-3xl">
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
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("members").insert({
      owner_id: user.id,
      church_id: churchId,
      type: memberType,
      name,
      phone: phone || null,
    });
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
  const [busy, setBusy] = useState(false);

  const categories = txType === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!category) return toast.error("Escolha uma categoria");
    setBusy(true);
    const { error } = await supabase.from("transactions").insert({
      owner_id: user.id,
      church_id: churchId,
      type: txType,
      amount: Number(amount.replace(",", ".")),
      category,
      description: description || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(txType === "income" ? "Entrada registrada!" : "Saída registrada!");
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

  // Step 2: amount + optional note
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex items-center justify-between rounded-xl bg-surface-elevated px-3 py-2">
        <span className="text-xs text-muted-foreground">Categoria</span>
        <button
          type="button"
          onClick={() => setCategory("")}
          className="text-sm font-semibold text-primary hover:underline"
        >
          {category} ✎
        </button>
      </div>
      <FormField label="Valor (R$)">
        <input
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          autoFocus
          placeholder="0,00"
          className="input text-2xl font-semibold"
        />
      </FormField>
      <FormField label="Observação (opcional)">
        <input value={description} onChange={(e) => setDescription(e.target.value)} className="input" />
      </FormField>
      <ChurchSelect value={churchId} onChange={setChurchId} />
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
