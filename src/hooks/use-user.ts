import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useUserId() {
  const { data } = useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => (await supabase.auth.getUser()).data.user?.id ?? null,
    staleTime: 5 * 60 * 1000,
  });
  return data ?? null;
}

export function useSettings() {
  const { data } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("settings").select("*").maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  return {
    minMargin: Number(data?.min_margin ?? 8),
    goodMargin: Number(data?.good_margin ?? 15),
    defaultTaxPercent: Number(data?.default_tax_percent ?? 0),
    defaultRiskPercent: Number(data?.default_risk_percent ?? 3),
  };
}
