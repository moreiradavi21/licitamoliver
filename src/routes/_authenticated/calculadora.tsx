import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSettings } from "@/hooks/use-user";
import { brl, computeCost, marginVerdict, pct, TRAFFIC } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/calculadora")({
  head: () => ({
    meta: [
      { title: "Calculadora de lucro · Licita360" },
      { name: "description", content: "Simule custo real, margem, ROI e preço mínimo antes de dar o lance." },
      { property: "og:title", content: "Calculadora de lucro · Licita360" },
      { property: "og:description", content: "Custo real, margem, ROI e preço mínimo em tempo real." },
    ],
  }),
  component: CalculatorPage,
});

function CalculatorPage() {
  const { minMargin, goodMargin } = useSettings();
  const [v, setV] = useState({
    unitCost: "0",
    quantity: "1",
    freight: "0",
    taxes: "0",
    otherCosts: "0",
    riskReserve: "0",
    price: "0",
  });

  const n = (k: keyof typeof v) => Number(v[k]) || 0;
  const r = computeCost(
    {
      unitCost: n("unitCost"),
      quantity: n("quantity"),
      freight: n("freight"),
      taxes: n("taxes"),
      otherCosts: n("otherCosts"),
      riskReserve: n("riskReserve"),
      price: n("price"),
    },
    minMargin,
    goodMargin,
  );
  const verdict = marginVerdict(r.margin, minMargin, goodMargin);

  const set = (k: keyof typeof v, value: string) => setV((s) => ({ ...s, [k]: value }));

  return (
    <>
      <PageHeader
        title="Calculadora de lucro"
        subtitle="Descubra o custo real e se vale a pena disputar antes de dar o lance."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="panel grid gap-4 p-5 sm:grid-cols-2">
          <F label="Custo unitário do fornecedor (R$)" value={v.unitCost} onChange={(x) => set("unitCost", x)} />
          <F label="Quantidade" value={v.quantity} onChange={(x) => set("quantity", x)} />
          <F label="Frete total (R$)" value={v.freight} onChange={(x) => set("freight", x)} />
          <F label="Impostos (R$)" value={v.taxes} onChange={(x) => set("taxes", x)} />
          <F label="Outros custos (R$)" value={v.otherCosts} onChange={(x) => set("otherCosts", x)} />
          <F label="Reserva de risco (R$)" value={v.riskReserve} onChange={(x) => set("riskReserve", x)} />
          <F label="Preço unitário proposto (R$)" value={v.price} onChange={(x) => set("price", x)} />
        </section>

        <section className="space-y-4">
          <div className="panel p-5">
            <h2 className="text-base font-semibold">Resultado</h2>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <Out label="Custo real unitário" value={brl(r.realUnitCost)} />
              <Out label="Custo total" value={brl(r.totalCost)} />
              <Out label="Receita" value={brl(r.revenue)} />
              <Out label="Lucro bruto" value={brl(r.grossProfit)} />
              <Out label="Lucro líquido" value={brl(r.netProfit)} />
              <Out label="ROI" value={pct(r.roi)} />
              <Out label="Preço mínimo aceitável" value={brl(r.minPrice)} />
              <Out label="Preço recomendado" value={brl(r.recommendedPrice)} />
            </dl>
          </div>

          <div className="panel p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Margem</h2>
            <p className={`mt-2 text-3xl font-semibold ${TRAFFIC[verdict.key].className}`}>{pct(r.margin)}</p>
            <p className={`mt-1 text-sm ${TRAFFIC[verdict.key].className}`}>
              {TRAFFIC[verdict.key].emoji} {verdict.label}
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              Parâmetros atuais: margem mínima {pct(minMargin)} · margem boa {pct(goodMargin)} (ajustáveis em
              Configurações).
            </p>
          </div>
        </section>
      </div>
    </>
  );
}

function F({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type="number" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Out({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase text-muted-foreground">{label}</dt>
      <dd className="text-base font-medium">{value}</dd>
    </div>
  );
}
