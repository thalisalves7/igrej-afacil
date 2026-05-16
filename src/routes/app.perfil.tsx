import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/use-auth";
import { useChurches, useInvalidateAll } from "@/lib/data";
import { THEMES, useTheme } from "@/lib/theme";
import { Building2, LogOut, Plus, Sparkles, Trash2, Loader2, Volume2, Vibrate, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { feedback, getPref, setPref } from "@/lib/feedback";
import { LogoIcon } from "@/components/Logo";
import { InstallAppCard } from "@/components/InstallAppCard";

export const Route = createFileRoute("/app/perfil")({
  component: Profile,
});

function Profile() {
  const { user, signOut } = useAuth();
  const { data: churches } = useChurches();
  const { theme, setTheme } = useTheme();
  const [openNew, setOpenNew] = useState(false);
  const navigate = useNavigate();
  const invalidate = useInvalidateAll();

  const removeChurch = async (id: string) => {
    if (!confirm("Remover esta filial?")) return;
    const { error } = await supabase.from("churches").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Filial removida.");
    invalidate();
  };

  return (
    <div className="mx-auto max-w-2xl px-5 pt-8 pb-10">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Conta</p>
        <h1 className="text-2xl font-bold">{user?.user_metadata?.full_name || user?.email?.split("@")[0]}</h1>
        <p className="text-xs text-muted-foreground">{user?.email}</p>
      </header>

      {/* Theme */}
      <Section title="Aparência">
        <p className="mb-3 text-xs text-muted-foreground">
          Personalize a cor do app, do ícone e da splash screen. A escolha é salva automaticamente.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {THEMES.map((t) => {
            const active = theme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => { setTheme(t.id); feedback("switch"); }}
                className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-300 ${
                  active ? "border-primary shadow-[var(--shadow-glow)]" : "border-border bg-surface/60 hover:border-primary/40"
                }`}
              >
                <div
                  aria-hidden
                  className="absolute inset-0 opacity-30"
                  style={{ background: `radial-gradient(circle at 30% 20%, ${t.hex.from}, transparent 60%)` }}
                />
                <div className="relative flex items-center gap-3">
                  <span
                    className="grid h-12 w-12 place-items-center rounded-xl text-primary-foreground"
                    style={{ background: `linear-gradient(135deg, ${t.hex.from}, ${t.hex.to})` }}
                  >
                    <span style={{ color: t.hex.bg }}><LogoIcon size={22} /></span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{t.label}</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {active ? "Ativo" : "Tocar para usar"}
                    </p>
                  </div>
                  {active && (
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </Section>

      <FeedbackSettings />

      <InstallAppCard />

      {/* Churches */}
      <Section
        title="Suas igrejas"
        action={
          <button onClick={() => setOpenNew(true)} className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1.5 text-xs font-semibold text-primary">
            <Plus className="h-3.5 w-3.5" /> Nova filial
          </button>
        }
      >
        <div className="space-y-2">
          {(churches ?? []).map((c) => (
            <div key={c.id} className="neu-card flex items-center gap-3 p-4">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
                {c.type === "matriz" ? <Sparkles className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
              </span>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-semibold">{c.name}</p>
                <p className="text-xs text-muted-foreground">
                  {c.type === "matriz" ? "Matriz" : "Filial"} {c.pastor && `• Pastor: ${c.pastor}`}
                </p>
              </div>
              {c.type === "filial" && (
                <button onClick={() => removeChurch(c.id)} className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </Section>

      <button
        onClick={async () => { await signOut(); navigate({ to: "/" }); }}
        className="neu-card mt-6 flex w-full items-center justify-center gap-2 p-4 text-sm font-semibold text-destructive"
      >
        <LogOut className="h-4 w-4" /> Sair da conta
      </button>

      <NewChurchDialog open={openNew} onClose={() => setOpenNew(false)} />
    </div>
  );
}

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function FeedbackSettings() {
  const [sound, setSound] = useState(true);
  const [haptic, setHaptic] = useState(true);
  useEffect(() => { setSound(getPref("sound")); setHaptic(getPref("haptic")); }, []);
  const toggle = (k: "sound" | "haptic", v: boolean) => {
    setPref(k, v);
    if (k === "sound") setSound(v); else setHaptic(v);
    if (v) feedback("switch");
  };
  return (
    <section className="mt-6">
      <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Sons & Vibração</h2>
      <div className="space-y-2">
        <Toggle icon={Volume2} label="Sons sutis" desc="Confirmações elegantes ao salvar." on={sound} onChange={(v) => toggle("sound", v)} />
        <Toggle icon={Vibrate} label="Vibração" desc="Micro toque tátil em ações." on={haptic} onChange={(v) => toggle("haptic", v)} />
      </div>
    </section>
  );
}

function Toggle({ icon: Icon, label, desc, on, onChange }: { icon: typeof Volume2; label: string; desc: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)} className="neu-card flex w-full items-center gap-3 p-4 text-left active:scale-[0.99] transition-transform">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary"><Icon className="h-4 w-4" /></span>
      <div className="flex-1">
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <span className={`relative h-6 w-11 rounded-full transition-colors ${on ? "bg-primary" : "bg-muted"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-background transition-transform ${on ? "translate-x-[22px]" : "translate-x-0.5"}`} />
      </span>
    </button>
  );
}

function NewChurchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const invalidate = useInvalidateAll();
  const [name, setName] = useState("");
  const [pastor, setPastor] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("churches").insert({
      owner_id: user.id, type: "filial", name, pastor: pastor || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Filial criada!");
    setName(""); setPastor("");
    invalidate();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md border-border bg-surface sm:rounded-3xl">
        <DialogHeader><DialogTitle>Nova filial</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Nome</span>
            <input value={name} onChange={(e) => setName(e.target.value)} required className="input" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Pastor</span>
            <input value={pastor} onChange={(e) => setPastor(e.target.value)} className="input" />
          </label>
          <button
            disabled={busy}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold text-primary-foreground"
            style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Criar filial
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
