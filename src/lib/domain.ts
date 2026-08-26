export type StatusKey =
  | "nova"
  | "analise"
  | "cotando"
  | "aprovada"
  | "nao_participar"
  | "disputa"
  | "ganha"
  | "perdida"
  | "execucao"
  | "recebida";

export const STATUS: Record<StatusKey, { label: string; dot: string; emoji: string }> = {
  nova: { label: "Nova oportunidade", dot: "bg-warning", emoji: "🟡" },
  analise: { label: "Em análise", dot: "bg-info", emoji: "🔵" },
  cotando: { label: "Cotando fornecedores", dot: "bg-warning", emoji: "🟠" },
  aprovada: { label: "Aprovada para disputar", dot: "bg-chart-5", emoji: "🟣" },
  nao_participar: { label: "Não participar", dot: "bg-destructive", emoji: "🔴" },
  disputa: { label: "Em disputa", dot: "bg-info", emoji: "⚔️" },
  ganha: { label: "Ganha", dot: "bg-success", emoji: "🟢" },
  perdida: { label: "Perdida", dot: "bg-muted-foreground", emoji: "⚫" },
  execucao: { label: "Em execução", dot: "bg-chart-2", emoji: "📦" },
  recebida: { label: "Recebida/paga", dot: "bg-success", emoji: "💰" },
};

export const STATUS_ORDER = Object.keys(STATUS) as StatusKey[];

export const CLASSIFICATIONS = [
  { value: "informatica", label: "Informática" },
  { value: "eletronicos", label: "Eletrônicos" },
  { value: "expediente", label: "Expediente" },
  { value: "outros", label: "Outros" },
] as const;

export const TRUST_LEVELS = [
  { value: "confiavel", label: "🟢 Confiável" },
  { value: "cautela", label: "🟡 Testar com cautela" },
  { value: "evitar", label: "🔴 Evitar" },
] as const;

export const SUPPLIER_ROLES = [
  { value: "principal", label: "Principal" },
  { value: "alternativo", label: "Alternativa" },
  { value: "emergencia", label: "Emergência" },
] as const;

export const TRAFFIC = {
  verde: { label: "Oportunidade boa", className: "text-success", emoji: "🟢" },
  amarelo: { label: "Atenção", className: "text-warning", emoji: "🟡" },
  vermelho: { label: "Não participar", className: "text-destructive", emoji: "🔴" },
} as const;

export type TrafficKey = keyof typeof TRAFFIC;

export const brl = (value: number | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number.isFinite(Number(value)) ? Number(value) : 0,
  );

export const pct = (value: number | null | undefined) =>
  `${(Number(value) || 0).toFixed(1).replace(".", ",")}%`;

export const dateTimeBR = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";

export const dateBR = (value: string | null | undefined) =>
  value ? new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR") : "—";

export interface CostInput {
  unitCost: number;
  quantity: number;
  freight: number;
  taxes: number;
  otherCosts: number;
  riskReserve: number;
  price: number;
}

export interface CostResult {
  realUnitCost: number;
  totalCost: number;
  revenue: number;
  grossProfit: number;
  netProfit: number;
  margin: number;
  roi: number;
  minPrice: number;
  recommendedPrice: number;
}

export function computeCost(input: CostInput, minMargin = 8, goodMargin = 15): CostResult {
  const qty = Math.max(input.quantity || 0, 0);
  const base = (input.unitCost || 0) * qty;
  const totalCost =
    base + (input.freight || 0) + (input.taxes || 0) + (input.otherCosts || 0) + (input.riskReserve || 0);
  const realUnitCost = qty > 0 ? totalCost / qty : 0;
  const revenue = (input.price || 0) * qty;
  const grossProfit = revenue - base;
  const netProfit = revenue - totalCost;
  const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
  const roi = totalCost > 0 ? (netProfit / totalCost) * 100 : 0;
  const minPrice = realUnitCost / (1 - minMargin / 100 || 1);
  const recommendedPrice = realUnitCost / (1 - goodMargin / 100 || 1);
  return { realUnitCost, totalCost, revenue, grossProfit, netProfit, margin, roi, minPrice, recommendedPrice };
}

export function marginVerdict(margin: number, minMargin = 8, goodMargin = 15) {
  if (margin < minMargin)
    return {
      key: "vermelho" as TrafficKey,
      label: `NÃO RECOMENDADO — margem abaixo de ${minMargin}%`,
    };
  if (margin < goodMargin)
    return {
      key: "amarelo" as TrafficKey,
      label: `ATENÇÃO — margem entre ${minMargin}% e ${goodMargin}%`,
    };
  return { key: "verde" as TrafficKey, label: `BOM — margem acima de ${goodMargin}%` };
}
