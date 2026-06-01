import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

export type AppRole = "admin" | "treasurer" | "secretary" | "branch_leader";

export const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Administrador(a)",
  treasurer: "Tesoureiro(a)",
  secretary: "Secretário(a)",
  branch_leader: "Líder de Filial",
};

export const ROLE_EMOJI: Record<AppRole, string> = {
  admin: "🛡",
  treasurer: "💰",
  secretary: "👥",
  branch_leader: "⛪",
};

export const ROLE_DESCRIPTION: Record<AppRole, string> = {
  admin: "Acesso completo ao sistema.",
  treasurer: "Responsável pelas finanças e relatórios da igreja.",
  secretary: "Responsável pelos membros, visitantes e agenda.",
  branch_leader: "Administra apenas sua filial.",
};

// Permissões internas modulares (resolvidas client-side; RLS faz o backstop)
export const ROLE_PERMISSIONS: Record<AppRole, Set<string>> = {
  admin: new Set([
    "members.view", "members.manage",
    "financial.view", "financial.manage",
    "events.view", "events.manage",
    "team.view", "team.manage",
    "churches.manage",
  ]),
  treasurer: new Set([
    "financial.view", "financial.manage",
    "members.view",
    "events.view",
  ]),
  secretary: new Set([
    "members.view", "members.manage",
    "events.view", "events.manage",
  ]),
  branch_leader: new Set([
    "members.view", "members.manage",
    "financial.view", "financial.manage",
    "events.view", "events.manage",
  ]),
};

export function can(role: AppRole | null | undefined, permission: string): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role].has(permission);
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
