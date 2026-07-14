import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

// Papéis com login no app
export type AppRole =
  | "dono"
  | "admin_filial"
  | "secretario"
  | "tesoureiro"
  | "lider_louvor"
  | "diacono";

// Cargos exibidos (inclui os sem acesso ao app)
export type CargoId = AppRole | "membro" | "visitante";

export const ROLE_LABEL: Record<AppRole, string> = {
  dono: "Pastor Presidente / Dono",
  admin_filial: "Admin / Líder de Filial",
  secretario: "Secretário(a)",
  tesoureiro: "Tesoureiro(a)",
  lider_louvor: "Líder de Louvor",
  diacono: "Diácono(isa)",
};

export const ROLE_EMOJI: Record<AppRole, string> = {
  dono: "👑",
  admin_filial: "🔑",
  secretario: "📋",
  tesoureiro: "💰",
  lider_louvor: "🎵",
  diacono: "🙋",
};

export const ROLE_DESCRIPTION: Record<AppRole, string> = {
  dono: "Acesso total a todas as igrejas e configurações",
  admin_filial: "Acesso total à própria filial",
  secretario: "Cadastra membros e eventos",
  tesoureiro: "Acesso ao financeiro da filial",
  lider_louvor: "Visualiza membros e cria agenda",
  diacono: "Visualiza membros da filial",
};

export type Cargo = {
  id: CargoId;
  label: string;
  icon: string;
  nivel: number;
  acessoApp: boolean;
  descricao: string;
};

export const CARGOS: Cargo[] = [
  { id: "dono", label: "Pastor Presidente / Dono", icon: "👑", nivel: 10, acessoApp: true, descricao: "Acesso total a todas as igrejas e configurações" },
  { id: "admin_filial", label: "Admin / Líder de Filial", icon: "🔑", nivel: 8, acessoApp: true, descricao: "Acesso total à própria filial" },
  { id: "secretario", label: "Secretário(a)", icon: "📋", nivel: 6, acessoApp: true, descricao: "Cadastra membros e eventos" },
  { id: "tesoureiro", label: "Tesoureiro(a)", icon: "💰", nivel: 6, acessoApp: true, descricao: "Acesso ao financeiro da filial" },
  { id: "lider_louvor", label: "Líder de Louvor", icon: "🎵", nivel: 4, acessoApp: true, descricao: "Visualiza membros e cria agenda" },
  { id: "diacono", label: "Diácono / Diaconisa", icon: "🙋", nivel: 3, acessoApp: true, descricao: "Visualiza membros da filial" },
  { id: "membro", label: "Membro", icon: "⛪", nivel: 1, acessoApp: false, descricao: "Cadastrado no sistema, sem acesso ao app" },
  { id: "visitante", label: "Visitante", icon: "👋", nivel: 0, acessoApp: false, descricao: "Cadastrado como visitante, sem acesso ao app" },
];

export const CARGOS_BY_ID: Record<CargoId, Cargo> = Object.fromEntries(
  CARGOS.map((c) => [c.id, c]),
) as Record<CargoId, Cargo>;

// Nível de cada papel (para comparação hierárquica)
export const ROLE_LEVEL: Record<AppRole, number> = {
  dono: 10, admin_filial: 8, secretario: 6, tesoureiro: 6, lider_louvor: 4, diacono: 3,
};

// Permissões modulares
export const ROLE_PERMISSIONS: Record<AppRole, Set<string>> = {
  dono: new Set([
    "members.view", "members.manage",
    "financial.view", "financial.manage",
    "events.view", "events.manage",
    "team.view", "team.manage",
    "churches.manage",
  ]),
  admin_filial: new Set([
    "members.view", "members.manage",
    "financial.view", "financial.manage",
    "events.view", "events.manage",
    "team.view", "team.manage",
  ]),
  secretario: new Set([
    "members.view", "members.manage",
    "events.view", "events.manage",
  ]),
  tesoureiro: new Set([
    "financial.view", "financial.manage",
    "members.view", "events.view",
  ]),
  lider_louvor: new Set([
    "members.view", "events.view", "events.manage",
  ]),
  diacono: new Set(["members.view", "events.view"]),
};

export function can(role: AppRole | null | undefined, permission: string): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role].has(permission);
}

// Pode promover algum membro?
export function canPromote(callerRole: AppRole | null | undefined): boolean {
  return callerRole === "dono" || callerRole === "admin_filial";
}

// Lista de cargos que este papel pode atribuir
export function assignableCargos(callerRole: AppRole | null | undefined): Cargo[] {
  if (callerRole === "dono") return CARGOS;
  if (callerRole === "admin_filial") return CARGOS.filter((c) => c.nivel < 8);
  return [];
}

export type OrgContext = {
  organization_id: string;
  role: AppRole;
  branch_church_id: string | null;
  is_owner: boolean;
};

export function useOrgContext() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["org-context", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<OrgContext | null> => {
      const { data: members, error } = await supabase
        .from("org_members")
        .select("organization_id, role, branch_church_id")
        .limit(1);
      if (error) throw error;
      const m = members?.[0];
      if (!m) return null;
      const { data: org } = await supabase
        .from("organizations")
        .select("owner_user_id")
        .eq("id", m.organization_id)
        .single();
      return {
        organization_id: m.organization_id,
        role: m.role as AppRole,
        branch_church_id: m.branch_church_id,
        is_owner: org?.owner_user_id === user?.id,
      };
    },
  });
}
