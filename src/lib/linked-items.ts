import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { computeCost } from "@/lib/domain";

/** Chave de cache compartilhada: invalide após criar/editar/excluir itens de oportunidade. */
export const LINKED_ITEMS_KEY = ["linked-opportunity-items"] as const;

/** Normaliza descrições: minúsculas, sem acentos, sem espaços extras. */
export function normalizeItemName(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export interface LinkedQuote {
  id: string;
  description: string;
  key: string;
  itemId: string | null;
  supplierId: string;
  supplierName: string;
  opportunityId: string;
  opportunityNumber: string;
  agency: string | null;
  unitCost: number;
  proposedPrice: number;
  quantity: number;
  freight: number;
  margin: number | null;
  stockConfirmed: boolean;
  date: string;
}

export interface LinkedGroup {
  key: string;
  name: string;
  itemIds: string[];
  quotes: LinkedQuote[];
  avgCost: number | null;
  lastCost: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  avgMargin: number | null;
  lastDate: string | null;
}

type Row = {
  id: string;
  description: string;
  item_id: string | null;
  supplier_id: string | null;
  unit_cost: number;
  proposed_price: number;
  quantity: number;
  freight: number;
  taxes: number;
  other_costs: number;
  risk_reserve: number;
  stock_confirmed: boolean;
  created_at: string;
  updated_at: string;
  opportunities: { id: string; number: string; agency: string | null } | null;
  suppliers: { id: string; legal_name: string } | null;
};

function toQuote(r: Row): LinkedQuote {
  const price = Number(r.proposed_price) || 0;
  const margin =
    price > 0
      ? computeCost({
          unitCost: Number(r.unit_cost) || 0,
          quantity: Number(r.quantity) || 1,
          freight: Number(r.freight) || 0,
          taxes: Number(r.taxes) || 0,
          otherCosts: Number(r.other_costs) || 0,
          riskReserve: Number(r.risk_reserve) || 0,
          price,
        }).margin
      : null;
  return {
    id: r.id,
    description: r.description,
    key: normalizeItemName(r.description),
    itemId: r.item_id,
    supplierId: r.supplier_id as string,
    supplierName: r.suppliers?.legal_name ?? "Fornecedor",
    opportunityId: r.opportunities?.id ?? "",
    opportunityNumber: r.opportunities?.number ?? "—",
    agency: r.opportunities?.agency ?? null,
    unitCost: Number(r.unit_cost) || 0,
    proposedPrice: price,
    quantity: Number(r.quantity) || 1,
    freight: Number(r.freight) || 0,
    margin,
    stockConfirmed: r.stock_confirmed,
    date: r.updated_at || r.created_at,
  };
}

/** Todos os itens de oportunidades que têm fornecedor vinculado (mais recentes primeiro). */
export function useLinkedQuotes() {
  return useQuery({
    queryKey: LINKED_ITEMS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("opportunity_items")
        .select(
          "id, description, item_id, supplier_id, unit_cost, proposed_price, quantity, freight, taxes, other_costs, risk_reserve, stock_confirmed, created_at, updated_at, opportunities(id, number, agency), suppliers(id, legal_name)",
        )
        .not("supplier_id", "is", null)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as unknown as Row[])
        .filter((r) => r.supplier_id && r.opportunities)
        .map(toQuote);
    },
  });
}

const avg = (values: number[]) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;

/** Agrupa cotações pela descrição normalizada, calculando custo/faixa/margem. */
export function groupQuotes(
  quotes: LinkedQuote[],
  keyOf: (q: LinkedQuote) => string = (q) => q.key,
): LinkedGroup[] {
  const map = new Map<string, LinkedQuote[]>();
  for (const q of quotes) {
    const k = keyOf(q);
    if (!k) continue;
    const list = map.get(k) ?? [];
    list.push(q);
    map.set(k, list);
  }
  return [...map.entries()]
    .map(([key, list]): LinkedGroup => {
      const sorted = [...list].sort((a, b) => b.date.localeCompare(a.date));
      const costs = sorted.map((q) => q.unitCost).filter((v) => v > 0);
      const prices = sorted.map((q) => q.proposedPrice).filter((v) => v > 0);
      const margins = sorted.flatMap((q) => (q.margin != null ? [q.margin] : []));
      return {
        key,
        name: sorted[0]?.description ?? key,
        itemIds: [...new Set(sorted.flatMap((q) => (q.itemId ? [q.itemId] : [])))],
        quotes: sorted,
        avgCost: avg(costs),
        lastCost: costs[0] ?? null,
        minPrice: prices.length ? Math.min(...prices) : null,
        maxPrice: prices.length ? Math.max(...prices) : null,
        avgMargin: avg(margins),
        lastDate: sorted[0]?.date ?? null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}
