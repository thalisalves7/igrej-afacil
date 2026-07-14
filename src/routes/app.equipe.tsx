import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { useOrgContext, ROLE_LABEL, ROLE_EMOJI, ROLE_DESCRIPTION, type AppRole } from "@/lib/org";
import { useChurches } from "@/lib/data";
import { useState } from "react";
import { Users, UserPlus, Shield, Loader2, Mail, MessageCircle, Copy, X, Clock, Check, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { feedback } from "@/lib/feedback";
import { z } from "zod";

export const Route = createFileRoute("/app/equipe")({
  component: EquipePage,
});

const ROLES: AppRole[] = ["admin_filial", "secretario", "tesoureiro", "lider_louvor", "diacono"];

const inviteSchema = z.object({
  full_name: z.string().trim().min(2, "Informe o nome").max(100),
  email: z.string().trim().email("Email inválido").max(255),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  role: z.enum(["dono", "admin_filial", "secretario", "tesoureiro", "lider_louvor", "diacono"]),
  branch_church_id: z.string().uuid().nullable(),
});

type Member = {
  id: string;
  user_id: string;
  role: AppRole;
  branch_church_id: string | null;
  created_at: string;
  profile?: { display_name: string | null; avatar_url: string | null } | null;
};

type Invitation = {
  id: string;
  full_name: string | null;
  email: string;
  role: AppRole;
  branch_church_id: string | null;
  status: string;
  created_at: string;
  expires_at: string;
};

function EquipePage() {
  const { user } = useAuth();
  const { data: ctx, isLoading: ctxLoading } = useOrgContext();
  const { data: churches = [] } = useChurches();
  const [openInvite, setOpenInvite] = useState(false);
  const [shareInvitation, setShareInvitation] = useState<Invitation | null>(null);

  const canManage = ctx?.role === "dono" || ctx?.role === "admin_filial";

  const { data: members = [], isLoading: mLoading, refetch: refetchMembers } = useQuery({
    queryKey: ["team-members", ctx?.organization_id],
    enabled: !!ctx?.organization_id,
    queryFn: async (): Promise<Member[]> => {
      const { data, error } = await supabase
        .from("org_members")
        .select("id, user_id, role, branch_church_id, created_at")
        .eq("organization_id", ctx!.organization_id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      const userIds = (data ?? []).map((m) => m.user_id);
      if (userIds.length === 0) return [];
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);
      const byId = new Map((profs ?? []).map((p) => [p.user_id, p]));
      return (data ?? []).map((m) => ({
        ...m,
        role: m.role as AppRole,
        profile: byId.get(m.user_id) ?? null,
      }));
    },
  });

  const { data: invitations = [], refetch: refetchInvites } = useQuery({
    queryKey: ["team-invitations", ctx?.organization_id],
    enabled: !!ctx?.organization_id && canManage,
    queryFn: async (): Promise<Invitation[]> => {
      const { data, error } = await supabase
        .from("invitations")
        .select("id, full_name, email, role, branch_church_id, status, created_at, expires_at")
        .eq("organization_id", ctx!.organization_id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((i) => ({ ...i, role: i.role as AppRole }));
    },
  });

  if (ctxLoading || !ctx) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!canManage && ctx.role !== "dono" && ctx.role !== "admin_filial") {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <Shield className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Acesso restrito</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Apenas administradores podem gerenciar a equipe.
        </p>
      </div>
    );
  }

  const filiais = churches.filter((c) => c.type === "filial");

  return (
    <div className="mx-auto max-w-2xl px-4 pb-8 pt-6">
      <header className="mb-6 animate-in fade-in slide-in-from-top-2 duration-500">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <Users className="h-6 w-6 text-primary" />
              Equipe Ministerial
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Gerencie acessos e responsabilidades da sua igreja.
            </p>
          </div>
        </div>
      </header>

      <button
        onClick={() => {
          feedback("tap");
          setOpenInvite(true);
        }}
        className="group mb-6 flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98]"
        style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
      >
        <UserPlus className="h-4 w-4" />
        Adicionar Pessoa
      </button>

      <section className="mb-8">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Equipe ativa
        </h2>
        {mLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ul className="space-y-2">
            {members.map((m) => (
              <li key={m.id} className="neu-card flex items-center gap-3 rounded-2xl p-3">
                <div
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-base"
                  style={{ background: "var(--gradient-card)" }}
                >
                  {ROLE_EMOJI[m.role]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">
                      {m.profile?.display_name ?? "Membro da equipe"}
                      {m.user_id === user?.id && (
                        <span className="ml-2 text-xs text-muted-foreground">(você)</span>
                      )}
                    </p>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{ROLE_LABEL[m.role]}</p>
                </div>
                {canManage && m.user_id !== user?.id && !ctx.is_owner && (
                  <RemoveButton id={m.id} onDone={refetchMembers} />
                )}
                {canManage && ctx.is_owner && m.user_id !== user?.id && (
                  <RemoveButton id={m.id} onDone={refetchMembers} />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {canManage && invitations.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Convites
          </h2>
          <ul className="space-y-2">
            {invitations.map((inv) => (
              <li key={inv.id} className="neu-card flex items-center gap-3 rounded-2xl p-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-muted/40">
                  {inv.status === "pending" ? (
                    <Clock className="h-4 w-4 text-warning" />
                  ) : inv.status === "accepted" ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <X className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{inv.full_name ?? inv.email}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {inv.email} · {ROLE_LABEL[inv.role]} ·{" "}
                    {inv.status === "pending" ? "Aguardando" : inv.status === "accepted" ? "Ativo" : inv.status}
                  </p>
                </div>
                {inv.status === "pending" && (
                  <>
                    <button
                      onClick={() => setShareInvitation(inv)}
                      className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      aria-label="Compartilhar"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </button>
                    <RevokeButton id={inv.id} onDone={refetchInvites} />
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <InviteModal
        open={openInvite}
        onClose={() => setOpenInvite(false)}
        organizationId={ctx.organization_id}
        invitedBy={user!.id}
        filiais={filiais}
        onCreated={(inv) => {
          setOpenInvite(false);
          refetchInvites();
          setShareInvitation(inv);
        }}
      />

      <ShareModal
        invitation={shareInvitation}
        onClose={() => setShareInvitation(null)}
      />
    </div>
  );
}

function RemoveButton({ id, onDone }: { id: string; onDone: () => void }) {
  const [loading, setLoading] = useState(false);
  return (
    <button
      onClick={async () => {
        if (!confirm("Remover esta pessoa da equipe?")) return;
        setLoading(true);
        const { error } = await supabase.from("org_members").delete().eq("id", id);
        setLoading(false);
        if (error) toast.error("Não foi possível remover");
        else {
          feedback("success");
          toast.success("Removido da equipe");
          onDone();
        }
      }}
      disabled={loading}
      className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
      aria-label="Remover"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
    </button>
  );
}

function RevokeButton({ id, onDone }: { id: string; onDone: () => void }) {
  return (
    <button
      onClick={async () => {
        const { error } = await supabase
          .from("invitations")
          .update({ status: "revoked" })
          .eq("id", id);
        if (error) toast.error("Erro ao revogar");
        else {
          feedback("tap");
          toast.success("Convite revogado");
          onDone();
        }
      }}
      className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
      aria-label="Revogar"
    >
      <X className="h-4 w-4" />
    </button>
  );
}

function InviteModal({
  open,
  onClose,
  organizationId,
  invitedBy,
  filiais,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  invitedBy: string;
  filiais: { id: string; name: string }[];
  onCreated: (inv: Invitation) => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<AppRole | null>(null);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setStep(1);
    setFullName("");
    setEmail("");
    setPhone("");
    setRole(null);
    setBranchId(null);
  };

  const close = () => {
    onClose();
    setTimeout(reset, 300);
  };

  const submit = async () => {
    const parsed = inviteSchema.safeParse({
      full_name: fullName,
      email,
      phone,
      role,
      branch_church_id: role === "admin_filial" ? branchId : null,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    if (role === "admin_filial" && !branchId) {
      toast.error("Selecione a filial");
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from("invitations")
      .insert({
        organization_id: organizationId,
        invited_by_user_id: invitedBy,
        full_name: parsed.data.full_name,
        email: parsed.data.email.toLowerCase(),
        phone: parsed.data.phone || null,
        role: parsed.data.role,
        branch_church_id: parsed.data.branch_church_id,
      })
      .select("id, full_name, email, role, branch_church_id, status, created_at, expires_at")
      .single();
    setSaving(false);
    if (error) {
      toast.error("Erro ao criar convite");
      return;
    }
    feedback("success");
    toast.success("Convite criado");
    onCreated({ ...data, role: data.role as AppRole });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 1 ? "Quem terá acesso ao sistema?" : "Escolha a função"}
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? "Preencha os dados da pessoa que você quer convidar."
              : "Cada função tem responsabilidades específicas."}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-3">
            <Field label="Nome completo" required>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input"
                placeholder="Maria da Silva"
                maxLength={100}
              />
            </Field>
            <Field label="Email (Google)" required>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="maria@gmail.com"
                maxLength={255}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                A pessoa entrará com este email no Google.
              </p>
            </Field>
            <Field label="Telefone (opcional)">
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input"
                placeholder="(11) 99999-9999"
                maxLength={30}
              />
            </Field>
            <button
              onClick={() => {
                if (!fullName.trim() || !email.trim()) {
                  toast.error("Preencha nome e email");
                  return;
                }
                setStep(2);
              }}
              className="mt-2 w-full rounded-xl py-3 text-sm font-semibold text-primary-foreground"
              style={{ background: "var(--gradient-primary)" }}
            >
              Continuar
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-2">
              {ROLES.map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    setRole(r);
                    feedback("tap");
                  }}
                  className={`flex items-start gap-3 rounded-2xl border p-3 text-left transition-all ${
                    role === r
                      ? "border-primary bg-primary/5 shadow-[var(--shadow-glow)]"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <span className="text-xl">{ROLE_EMOJI[r]}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{ROLE_LABEL[r]}</span>
                    <span className="block text-xs text-muted-foreground">
                      {ROLE_DESCRIPTION[r]}
                    </span>
                  </span>
                </button>
              ))}
            </div>

            {role === "admin_filial" && (
              <Field label="Qual filial ele(a) irá administrar?" required>
                {filiais.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Cadastre uma filial antes de atribuir um líder.
                  </p>
                ) : (
                  <select
                    value={branchId ?? ""}
                    onChange={(e) => setBranchId(e.target.value || null)}
                    className="input"
                  >
                    <option value="">Selecione...</option>
                    {filiais.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setStep(1)}
                className="flex-1 rounded-xl border border-border py-3 text-sm font-medium"
              >
                Voltar
              </button>
              <button
                onClick={submit}
                disabled={saving || !role}
                className="flex-[2] rounded-xl py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                style={{ background: "var(--gradient-primary)" }}
              >
                {saving ? "Enviando..." : "Criar convite"}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ShareModal({ invitation, onClose }: { invitation: Invitation | null; onClose: () => void }) {
  if (!invitation) return null;
  const link = `${window.location.origin}/auth?invite=${invitation.id}`;
  const text = `Olá ${invitation.full_name ?? ""}!\n\nVocê foi convidado(a) para participar do Igreja Fácil como ${ROLE_LABEL[invitation.role]}.\n\nAcesse com seu Google (${invitation.email}):\n${link}`;

  return (
    <Dialog open={!!invitation} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Compartilhar convite</DialogTitle>
          <DialogDescription>
            A pessoa entra com o Google usando o email <strong>{invitation.email}</strong> e o acesso é liberado automaticamente.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(text)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => feedback("tap")}
            className="flex items-center justify-center gap-2 rounded-xl bg-success py-3 text-sm font-semibold text-success-foreground"
          >
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </a>
          <a
            href={`mailto:${invitation.email}?subject=${encodeURIComponent("Convite Igreja Fácil")}&body=${encodeURIComponent(text)}`}
            onClick={() => feedback("tap")}
            className="flex items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm font-semibold"
          >
            <Mail className="h-4 w-4" /> Email
          </a>
          <button
            onClick={async () => {
              await navigator.clipboard.writeText(link);
              feedback("success");
              toast.success("Link copiado");
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm font-semibold"
          >
            <Copy className="h-4 w-4" /> Copiar link
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-foreground">
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </span>
      {children}
    </label>
  );
}
