import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/use-auth";
import { useChurches, useInvalidateAll } from "@/lib/data";
import { THEMES, useTheme } from "@/lib/theme";
import { Building2, LogOut, Plus, Sparkles, Trash2, Loader2, Volume2, Vibrate } from "lucide-react";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { feedback, getPref, setPref } from "@/lib/feedback";

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
      <Section title="Tema do app">
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-7">
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`flex flex-col items-center gap-2 rounded-2xl border p-3 transition-colors ${
                theme === t.id ? "border-primary bg-primary/5" : "border-border bg-surface/60 hover:border-primary/40"
              }`}
            >
              <span
                className="h-7 w-7 rounded-full ring-2 ring-border"
                style={{ background: t.swatch }}
              />
              <span className="text-[10px] font-medium">{t.label}</span>
            </button>
          ))}
        </div>
      </Section>

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
