import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSettings, useUserId } from "@/hooks/use-user";
import { PageHeader } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  brl,
  CLASSIFICATIONS,
  computeCost,
  dateBR,
  dateTimeBR,
  marginVerdict,
  pct,
  STATUS,
  STATUS_ORDER,
  TRAFFIC,
  type StatusKey,
  type TrafficKey,
} from "@/lib/domain";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/oportunidades/$id")({
  head: () => ({
    meta: [
      { title: "Detalhe da oportunidade · Licita360" },
      { name: "description", content: "Itens, custos, margem, fornecedores e semáforo da dispensa." },
      { property: "og:title", content: "Detalhe da oportunidade · Licita360" },
      { property: "og:description", content: "Itens, custos e margem da dispensa." },
    ],
  }),
  component: OpportunityDetail,
});

const emptyItem = {
  description: "",
  quantity: "1",
  unit_cost: "0",
  freight: "0",
  taxes: "0",
  other_costs: "0",
  risk_reserve: "0",
  proposed_price: "0",
  supplier_id: "none",
  stock_confirmed: false,
};

function OpportunityDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const userId = useUserId();
  const { minMargin, goodMargin } = useSettings();
  const [itemForm, setItemForm] = useState(emptyItem);

  const { data, isLoading } = useQuery({
    queryKey: ["opportunity", id],
    queryFn: async () => {
      const [opp, items, suppliers, analyses] = await Promise.all([
        supabase.from("opportunities").select("*").eq("id", id).maybeSingle(),
        supabase.from("opportunity_items").select("*").eq("opportunity_id", id).order("created_at"),
        supabase.from("suppliers").select("id, legal_name, trust_level").order("legal_name"),
        supabase.from("document_analyses").select("*").eq("opportunity_id", id).order("created_at", { ascending: false }),
      ]);
      if (opp.error) throw opp.error;
      return {
        opp: opp.data,
        items: items.data ?? [],
        suppliers: suppliers.data ?? [],
        analyses: analyses.data ?? [],
      };
    },
  });

  const update = useMutation({
    mutationFn: async (patch: Record<string, unknown>) => {
      const { error } = await supabase.from("opportunities").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["opportunity", id] });
      qc.invalidateQueries({ queryKey: ["opportunities"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addItem = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Sessão expirada");
      if (!itemForm.description.trim()) throw new Error("Descreva o item");
      const { error } = await supabase.from("opportunity_items").insert({
        user_id: userId,
        opportunity_id: id,
        description: itemForm.description.trim(),
        quantity: Number(itemForm.quantity) || 1,
        unit_cost: Number(itemForm.unit_cost) || 0,
        freight: Number(itemForm.freight) || 0,
        taxes: Number(itemForm.taxes) || 0,
        other_costs: Number(itemForm.other_costs) || 0,
        risk_reserve: Number(itemForm.risk_reserve) || 0,
        proposed_price: Number(itemForm.proposed_price) || 0,
        supplier_id: itemForm.supplier_id === "none" ? null : itemForm.supplier_id,
        stock_confirmed: itemForm.stock_confirmed,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setItemForm(emptyItem);
      toast.success("Item adicionado");
      qc.invalidateQueries({ queryKey: ["opportunity", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeItem = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.from("opportunity_items").delete().eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["opportunity", id] }),
  });

  if (isLoading) return <p className="text-muted-foreground">Carregando…</p>;
  const opp = data?.opp;
  if (!opp) return <p className="text-muted-foreground">Oportunidade não encontrada.</p>;

  const items = data?.items ?? [];
  const totals = items.reduce(
    (acc, it) => {
      const r = computeCost(
        {
          unitCost: Number(it.unit_cost),
          quantity: Number(it.quantity),
          freight: Number(it.freight),
          taxes: Number(it.taxes),
          otherCosts: Number(it.other_costs),
          riskReserve: Number(it.risk_reserve),
          price: Number(it.proposed_price),
        },
        minMargin,
        goodMargin,
      );
      acc.cost += r.totalCost;
      acc.revenue += r.revenue;
      acc.profit += r.netProfit;
      return acc;
    },
    { cost: 0, revenue: 0, profit: 0 },
  );
  const totalMargin = totals.revenue > 0 ? (totals.profit / totals.revenue) * 100 : 0;
  const verdict = marginVerdict(totalMargin, minMargin, goodMargin);
  const allStock = items.length > 0 && items.every((i) => i.stock_confirmed);

  const set = (k: keyof typeof emptyItem, v: string | boolean) =>
    setItemForm((f) => ({ ...f, [k]: v }) as typeof emptyItem);

  return (
    <>
      <Link to="/oportunidades" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Voltar
      </Link>
      <PageHeader title={`Dispensa ${opp.number}`} subtitle={opp.agency ?? "Órgão não informado"} />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <section className="panel p-5">
            <h2 className="text-base font-semibold">Dados do processo</h2>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
              <Info label="UASG" value={opp.uasg ?? "—"} />
              <Info label="Plataforma" value={opp.platform ?? "—"} />
              <Info label="Publicação" value={dateBR(opp.published_at)} />
              <Info label="Disputa" value={dateTimeBR(opp.dispute_at)} />
              <Info label="Local de entrega" value={opp.delivery_place ?? "—"} />
              <Info label="Prazo de entrega" value={opp.delivery_days ? `${opp.delivery_days} dias` : "—"} />
              <Info label="Prazo de pagamento" value={opp.payment_days ? `${opp.payment_days} dias` : "—"} />
              <Info label="Valor estimado" value={brl(opp.estimated_value)} />
              <Info
                label="Link"
                value={
                  opp.process_url ? (
                    <a className="text-primary hover:underline" href={opp.process_url} target="_blank" rel="noreferrer noopener">
                      abrir processo
                    </a>
                  ) : (
                    "—"
                  )
                }
              />
            </dl>
            {opp.notes && <p className="mt-4 whitespace-pre-wrap text-sm text-muted-foreground">{opp.notes}</p>}
          </section>

          <section className="panel p-5">
            <h2 className="text-base font-semibold">Itens e custos</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="p-2">Item</th>
                    <th className="p-2">Qtd</th>
                    <th className="p-2">Custo total</th>
                    <th className="p-2">Preço</th>
                    <th className="p-2">Margem</th>
                    <th className="p-2">Estoque</th>
                    <th className="p-2" />
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 && (
                    <tr><td className="p-3 text-muted-foreground" colSpan={7}>Nenhum item cadastrado.</td></tr>
                  )}
                  {items.map((it) => {
                    const r = computeCost(
                      {
                        unitCost: Number(it.unit_cost),
                        quantity: Number(it.quantity),
                        freight: Number(it.freight),
                        taxes: Number(it.taxes),
                        otherCosts: Number(it.other_costs),
                        riskReserve: Number(it.risk_reserve),
                        price: Number(it.proposed_price),
                      },
                      minMargin,
                      goodMargin,
                    );
                    const v = marginVerdict(r.margin, minMargin, goodMargin);
                    return (
                      <tr key={it.id} className="border-b border-border/60 last:border-0">
                        <td className="p-2">{it.description}</td>
                        <td className="p-2">{Number(it.quantity)}</td>
                        <td className="p-2">{brl(r.totalCost)}</td>
                        <td className="p-2">{brl(Number(it.proposed_price))}</td>
                        <td className={`p-2 ${TRAFFIC[v.key].className}`}>{pct(r.margin)}</td>
                        <td className="p-2">{it.stock_confirmed ? "✅" : "⚠️"}</td>
                        <td className="p-2">
                          <Button size="icon" variant="ghost" onClick={() => removeItem.mutate(it.id)}>
                            <Trash2 className="size-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-5 grid gap-3 border-t border-border pt-4 sm:grid-cols-3">
              <FieldText label="Descrição do item" value={itemForm.description} onChange={(v) => set("description", v)} className="sm:col-span-3" />
              <FieldText label="Quantidade" type="number" value={itemForm.quantity} onChange={(v) => set("quantity", v)} />
              <FieldText label="Custo unitário" type="number" value={itemForm.unit_cost} onChange={(v) => set("unit_cost", v)} />
              <FieldText label="Frete" type="number" value={itemForm.freight} onChange={(v) => set("freight", v)} />
              <FieldText label="Impostos" type="number" value={itemForm.taxes} onChange={(v) => set("taxes", v)} />
              <FieldText label="Outros custos" type="number" value={itemForm.other_costs} onChange={(v) => set("other_costs", v)} />
              <FieldText label="Reserva de risco" type="number" value={itemForm.risk_reserve} onChange={(v) => set("risk_reserve", v)} />
              <FieldText label="Preço proposto (unit.)" type="number" value={itemForm.proposed_price} onChange={(v) => set("proposed_price", v)} />
              <div className="space-y-1.5">
                <Label>Fornecedor</Label>
                <Select value={itemForm.supplier_id} onValueChange={(v) => set("supplier_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem fornecedor</SelectItem>
                    {(data?.suppliers ?? []).map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.legal_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2">
                <Switch checked={itemForm.stock_confirmed} onCheckedChange={(v) => set("stock_confirmed", v)} />
                <span className="text-sm">Estoque confirmado</span>
              </div>
              <div className="sm:col-span-3">
                <Button disabled={addItem.isPending} onClick={() => addItem.mutate()}>Adicionar item</Button>
              </div>
            </div>
          </section>

          {(data?.analyses ?? []).length > 0 && (
            <section className="panel p-5">
              <h2 className="text-base font-semibold">Análises de edital vinculadas</h2>
              {(data?.analyses ?? []).map((a) => (
                <div key={a.id} className="mt-3 rounded-md border border-border p-3 text-sm">
                  <p className="font-medium">{a.file_name}</p>
                  <p className="mt-1 text-muted-foreground">{a.summary}</p>
                </div>
              ))}
            </section>
          )}
        </div>

        <aside className="space-y-4">
          <section className="panel p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Semáforo</h2>
            <p className={`mt-2 text-xl font-semibold ${TRAFFIC[(opp.traffic_light as TrafficKey) ?? "amarelo"].className}`}>
              {TRAFFIC[(opp.traffic_light as TrafficKey) ?? "amarelo"].emoji}{" "}
              {TRAFFIC[(opp.traffic_light as TrafficKey) ?? "amarelo"].label}
            </p>
            <Select value={opp.traffic_light} onValueChange={(v) => update.mutate({ traffic_light: v })}>
              <SelectTrigger className="mt-3"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="verde">🟢 Oportunidade boa</SelectItem>
                <SelectItem value="amarelo">🟡 Atenção</SelectItem>
                <SelectItem value="vermelho">🔴 Não participar</SelectItem>
              </SelectContent>
            </Select>
            <div className="mt-4 space-y-1 text-xs text-muted-foreground">
              <p>Margem calculada: <span className={TRAFFIC[verdict.key].className}>{pct(totalMargin)}</span></p>
              <p>{allStock ? "✅ Estoque confirmado em todos os itens" : "⚠️ Há itens sem estoque confirmado"}</p>
              <p>{(opp.delivery_days ?? 99) <= 10 ? "⚠️ Prazo de entrega curto" : "✅ Prazo de entrega viável"}</p>
              <p>{verdict.label}</p>
            </div>
          </section>

          <section className="panel p-5 space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Status</h2>
            <Select value={opp.status} onValueChange={(v) => update.mutate({ status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_ORDER.map((s) => (
                  <SelectItem key={s} value={s}>{STATUS[s].emoji} {STATUS[s].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Atual: {STATUS[opp.status as StatusKey]?.label}
            </p>
            <div className="flex items-center justify-between text-sm">
              <span>Documento pendente</span>
              <Switch checked={opp.documents_pending} onCheckedChange={(v) => update.mutate({ documents_pending: v })} />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Fornecedor confirmou</span>
              <Switch checked={opp.supplier_confirmed} onCheckedChange={(v) => update.mutate({ supplier_confirmed: v })} />
            </div>
          </section>

          <section className="panel p-5 space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Resultado</h2>
            <p className="text-sm">Custo total: <strong>{brl(totals.cost)}</strong></p>
            <p className="text-sm">Receita proposta: <strong>{brl(totals.revenue)}</strong></p>
            <p className="text-sm">Lucro estimado: <strong className="text-success">{brl(totals.profit)}</strong></p>
            <Button variant="outline" className="w-full" onClick={() => update.mutate({ estimated_profit: totals.profit, estimated_value: opp.estimated_value ?? totals.revenue })}>
              Salvar lucro estimado
            </Button>
            <div className="space-y-1.5">
              <Label>Valor ganho (R$)</Label>
              <Input
                type="number"
                defaultValue={opp.won_value ?? ""}
                onBlur={(e) => update.mutate({ won_value: e.target.value ? Number(e.target.value) : null })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Lucro realizado (R$)</Label>
              <Input
                type="number"
                defaultValue={opp.realized_profit ?? ""}
                onBlur={(e) => update.mutate({ realized_profit: e.target.value ? Number(e.target.value) : null })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea defaultValue={opp.notes ?? ""} onBlur={(e) => update.mutate({ notes: e.target.value || null })} />
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase text-muted-foreground">{label}</dt>
      <dd className="mt-0.5">{value}</dd>
    </div>
  );
}

function FieldText({
  label,
  value,
  onChange,
  type = "text",
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
