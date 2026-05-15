import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Detecta sessão de recovery vinda do link do email
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("A senha precisa ter ao menos 6 caracteres.");
    if (password !== confirm) return toast.error("As senhas não coincidem.");
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Senha redefinida com sucesso.");
      navigate({ to: "/app" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível redefinir a senha.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
      </div>
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-10">
        <Link to="/auth" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>

        <div className="mt-12 flex flex-col items-center text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl text-primary-foreground"
            style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}>
            <Sparkles className="h-5 w-5" />
          </span>
          <h1 className="mt-5 text-3xl font-bold tracking-tight">Nova senha</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {ready ? "Defina uma nova senha para sua conta." : "Validando seu link de recuperação..."}
          </p>
        </div>

        {ready && (
          <form onSubmit={submit} className="neu-card mt-6 space-y-4 p-6">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Nova senha</span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
                className="w-full rounded-xl border border-input bg-surface px-4 py-3 text-sm outline-none focus:border-primary"
                placeholder="••••••••" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Confirmar senha</span>
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={6}
                className="w-full rounded-xl border border-input bg-surface px-4 py-3 text-sm outline-none focus:border-primary"
                placeholder="••••••••" />
            </label>
            <button type="submit" disabled={busy}
              className="mt-2 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.01] disabled:opacity-60"
              style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar nova senha
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
