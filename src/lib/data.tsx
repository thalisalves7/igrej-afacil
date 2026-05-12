import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Church = {
  id: string;
  owner_id: string;
  type: "matriz" | "filial";
  name: string;
  logo_url: string | null;
  address: string | null;
  pastor: string | null;
  phone: string | null;
};

export function useChurches() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["churches", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Church[]> => {
      const { data, error } = await supabase
        .from("churches")
        .select("*")
        .order("type", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Church[];
    },
  });
}

// Active church filter (UI state). 'all' | 'matriz' | 'filiais' | <church_id>
type ActiveFilter = string;
const ActiveCtx = createContext<{ value: ActiveFilter; setValue: (v: ActiveFilter) => void }>({
  value: "all",
  setValue: () => {},
});

export function ActiveChurchProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState<ActiveFilter>("all");
  useEffect(() => {
    const v = typeof window !== "undefined" ? window.localStorage.getItem("ig-active") : null;
    if (v) setValue(v);
  }, []);
  const set = (v: ActiveFilter) => {
    setValue(v);
    if (typeof window !== "undefined") window.localStorage.setItem("ig-active", v);
  };
  return <ActiveCtx.Provider value={{ value, setValue: set }}>{children}</ActiveCtx.Provider>;
}
export const useActiveChurch = () => useContext(ActiveCtx);

export function useInvalidateAll() {
  const qc = useQueryClient();
  return () =>
    qc.invalidateQueries({
      predicate: (q) =>
        ["churches", "members", "transactions", "events", "dashboard"].includes(q.queryKey[0] as string),
    });
}
