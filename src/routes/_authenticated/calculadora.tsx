import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSettings } from "@/hooks/use-user";
import { brl, marginVerdict, pct, TRAFFIC } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/calculadora")({
  head: () => ({
    meta: [
      { title: "Calculadora de lance · Licita360" },
      { name: "description", content: "Simule custo, preço mínimo e margem antes de ofertar." },
      { property: "og:title", content: "Calculadora de lance · Licita360" },
      { property: "og:description", content: "Custo, preço mínimo e margem antes de ofertar." },
    ],
  }),
  component: CalculatorPage,
});

interface CalcInput {
  unitCost: number;
  quantity: number;
  freight: number;
  taxPct: number;
  riskPct: number;
  otherCosts: number;
  targetMargin: number;
}

function computeBid(i: CalcInput) {
  const qty = Math.max(i.quantity || 0, 0);
  const base = (i.unitCost || 0) * qty;
  const totalCost = base + (i.freight || 0) + (i.otherCosts || 0);
  const realUnitCost = qty > 0 ? totalCost / qty : 0;
  const taxValue = (realUnitCost * (i.taxPct || 0)) / 100;
  const riskValue = (realUnitCost * (i.riskPct || 0)) / 100;
  const adjustedUnitCost = realUnitCost + taxValue + riskValue;
  const minPrice = adjustedUnitCost;
  // Margem-alvo sobre o preço de venda: preço = custo / (1 - margem)
  // Assim, lucro / preço = margem exata informada (ex.: 30%).
  const marginRate = Math.min(Math.max((i.targetMargin || 0) / 100, 0), 0.99);
  const recommendedPrice = adjustedUnitCost / (1 - marginRate);
  const grossProfitUnit = recommendedPrice - adjustedUnitCost;
  const totalProfit = grossProfitUnit * qty;
  const adjustedTotal = adjustedUnitCost * qty;
  const roi = adjustedTotal > 0 ? (totalProfit / adjustedTotal) * 100 : 0;
  const margin = recommendedPrice > 0 ? (grossProfitUnit / recommendedPrice) * 100 : 0;
  return {
    totalCost,
    realUnitCost,
    taxValue,
    riskValue,
    adjustedUnitCost,
    minPrice,
    recommendedPrice,
    grossProfitUnit,
    totalProfit,
    roi,
    margin,
  };
}

const initialForm = {
  unitCost: "20,50",
  quantity: "1000",
  freight: "150",
  taxPct: "3",
  riskPct: "5",
  otherCosts: "0",
  targetMargin: "30",
};

function CalculatorPage() {
  const { minMargin, goodMargin } = useSettings();
  const [v, setV] = useState(initialForm);
  const [calc, setCalc] = useState<CalcInput | null>(null);

  const parse = (s: string) => Number(s.replace(",", ".")) || 0;
  const set = (k: keyof typeof v, value: string) => setV((s) => ({ ...s, [k]: value }));

  const r = calc
    ? computeBid(calc)
    : null;
  const verdict = r ? marginVerdict(r.margin, minMargin, goodMargin) : null;

  const handleCalc = () =>
    setCalc({
      unitCost: parse(v.unitCost),
      quantity: parse(v.quantity),
      freight: parse(v.freight),
      taxPct: parse(v.taxPct),
      riskPct: parse(v.riskPct),
      otherCosts: parse(v.otherCosts),
      targetMargin: parse(v.targetMargin),
    });

  return (
    <>
      <PageHeader title="Calculadora de lance" subtitle="Simule custo, preço mínimo e margem antes de ofertar." />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="panel flex flex-col gap-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <F label="Custo do produto (unit)" value={v.unitCost} onChange={(x) => set("unitCost", x)} />
            <F label="Quantidade" value={v.quantity} onChange={(x) => set("quantity", x)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <F label="Frete total" value={v.freight} onChange={(x) => set("freight", x)} />
            <F label="Impostos (%)" value={v.taxPct} onChange={(x) => set("taxPct", x)} />
            <F label="Reserva de risco (%)" value={v.riskPct} onChange={(x) => set("riskPct", x)} />
          </div>
          <F label="Outros custos (total)" value={v.otherCosts} onChange={(x) => set("otherCosts", x)} />
          <F label="Margem-alvo desejada (%)" value={v.targetMargin} onChange={(x) => set("targetMargin", x)} />
          <Button size="lg" className="mt-auto w-full" onClick={handleCalc}>
            Calcular
          </Button>
        </section>

        <section className="panel p-5">
          {r && verdict ? (
            <>
              <div className="rounded-lg border border-border bg-muted/40 px-4 py-3">
                <p className={`text-sm font-semibold ${TRAFFIC[verdict.key].className}`}>
                  {TRAFFIC[verdict.key].emoji} {verdict.label}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">Margem calculada: {pct(r.margin)}</p>
              </div>
              <dl className="mt-4 divide-y divide-border text-sm">
                <Out label="Custo total (compra + frete + outros)" value={brl(r.totalCost)} />
                <Out label="Custo unitário real" value={brl(r.realUnitCost)} />
                <Out label={`+ Impostos (${v.taxPct}%)`} value={brl(r.taxValue)} />
                <Out label={`+ Reserva de risco (${v.riskPct}%)`} value={brl(r.riskValue)} />
                <Out label="Custo unitário ajustado" value={brl(r.adjustedUnitCost)} strong />
                <Out label="Preço mínimo (sem lucro)" value={brl(r.minPrice)} />
                <Out
                  label={`Preço recomendado (margem-alvo ${v.targetMargin}%)`}
                  value={brl(r.recommendedPrice)}
                  className="text-warning"
                  strong
                />
                <Out label="Lucro bruto por unidade" value={brl(r.grossProfitUnit)} />
                <Out
                  label={`Lucro total (${calc!.quantity} un.)`}
                  value={brl(r.totalProfit)}
                  className="text-success"
                  strong
                />
                <Out label="ROI" value={pct(r.roi)} />
              </dl>
            </>
          ) : (
            <div className="flex h-full min-h-48 items-center justify-center text-center text-sm text-muted-foreground">
              Preencha os campos e clique em <span className="mx-1 font-medium text-foreground">Calcular</span>
              para ver o resultado.
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function F({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Out({
  label,
  value,
  strong,
  className,
}: {
  label: string;
  value: string;
  strong?: boolean;
  className?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`${strong ? "text-base font-semibold" : "font-medium"} ${className ?? ""}`}>{value}</dd>
    </div>
  );
}
