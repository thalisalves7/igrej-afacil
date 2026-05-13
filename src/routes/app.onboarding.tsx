import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Loader2, Building2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/onboarding")({
  component: Onboarding,
});

function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [pastor, setPastor] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const { data, error } = await supabase
      .from("churches")
      .insert({
        owner_id: user.id,
        type: "matriz",
        name,
        pastor: pastor || null,
        phone: phone || null,
        address: address || null,
      })
      .select()
      .single();
    if (error) {
      setBusy(false);
      return toast.error(error.message);
    }
    qc.setQueryData(["churches", user.id], [data]);
    await qc.invalidateQueries({ queryKey: ["churches", user.id] });
    toast.success("Igreja matriz criada!");
    navigate({ to: "/app" });
  };

  return (
    <div className="mx-auto max-w-md px-6 py-12">
      <div className="text-center">
        <span className="grid mx-auto h-14 w-14 place-items-center rounded-2xl text-primary-foreground"
          style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
        >
          <Building2 className="h-6 w-6" />
        </span>
        <h1 className="mt-5 text-3xl font-bold tracking-tight">Vamos começar</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Cadastre sua <span className="font-semibold text-foreground">igreja matriz</span>.
          Você poderá adicionar filiais depois.
        </p>
      </div>

      <form onSubmit={submit} className="neu-card mt-8 space-y-4 p-6">
        <Field label="Nome da igreja">
          <input value={name} onChange={(e) => setName(e.target.value)} required className="input" />
        </Field>
        <Field label="Pastor responsável">
          <input value={pastor} onChange={(e) => setPastor(e.target.value)} className="input" />
        </Field>
        <Field label="Telefone">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input" />
        </Field>
        <Field label="Endereço">
          <input value={address} onChange={(e) => setAddress(e.target.value)} className="input" />
        </Field>
        <button
          disabled={busy}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.01] disabled:opacity-60"
          style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Criar igreja matriz
        </button>
      </form>
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
