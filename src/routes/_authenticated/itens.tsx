import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useUserId } from "@/hooks/use-user";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { brl, CLASSIFICATIONS, pct, SUPPLIER_ROLES } from "@/lib/domain";
import { Badge } from "@/components/ui/badge";
import {
  groupQuotes,
  normalizeItemName,
  useLinkedQuotes,
  type LinkedGroup,
} from "@/lib/linked-items";
import { ExternalLink, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/itens")({
  head: () => ({
    meta: [
      { title: "Itens e produtos · Licita360" },
      {
        name: "description",
        content: "Catálogo de itens com custo histórico, faixa de preço e fornecedores cotados.",
      },
      { property: "og:title", content: "Itens e produtos · Licita360" },
      {
        property: "og:description",
        content: "Catálogo com custos históricos e cotações por fornecedor.",
      },
    ],
  }),
  component: ItemsPage,
});

const emptyItem = {
  name: "",
  category: "informatica",
  brand: "",
  model: "",
  manufacturer_code: "",
  specs: "",
  ncm: "",
  gtin: "",
  historic_cost: "",
  min_price: "",
  max_price: "",
  avg_margin: "",
  won_before: false,
  notes: "",
};

const emptyPrice = {
  supplier_id: "",
  price: "0",
  freight: "0",
  delivery_days: "",
  role: "principal",
  stock_confirmed: false,
  notes: "",
};

function ItemsPage() {
  const qc = useQueryClient();
  const userId = useUserId();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyItem);
  const [selected, setSelected] = useState<string | null>(null);
  const [priceForm, setPriceForm] = useState(emptyPrice);
  const [search, setSearch] = useState("");

  const { data = [] } = useQuery({
    queryKey: ["items"],
    queryFn: async () => {
      const { data, error } = await supabase.from("items").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers-min"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("id, legal_name")
        .order("legal_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: linkedQuotes = [] } = useLinkedQuotes();

  // Vincula itens de oportunidades (com fornecedor) aos itens cadastrados:
  // pelo item_id ou pela descrição normalizada; o restante vira item automático.
  const { groupByItem, autoGroups } = useMemo(() => {
    const byId = new Set(data.map((i) => i.id));
    const byName = new Map(data.map((i) => [normalizeItemName(i.name), i.id] as const));
    const groups = groupQuotes(linkedQuotes, (q) => {
      if (q.itemId && byId.has(q.itemId)) return `item:${q.itemId}`;
      const manual = byName.get(q.key);
      return manual ? `item:${manual}` : q.key;
    });
    const groupByItem = new Map<string, LinkedGroup>();
    const autoGroups: LinkedGroup[] = [];
    for (const g of groups) {
      if (g.key.startsWith("item:")) groupByItem.set(g.key.slice(5), g);
      else autoGroups.push(g);
    }
    return { groupByItem, autoGroups };
  }, [data, linkedQuotes]);

  const selectedManual = selected && !selected.startsWith("auto:") ? selected : null;
  const selectedGroup = selected
    ? selected.startsWith("auto:")
      ? (autoGroups.find((g) => `auto:${g.key}` === selected) ?? null)
      : (groupByItem.get(selected) ?? null)
    : null;

  const { data: prices = [] } = useQuery({
    queryKey: ["item-prices", selectedManual],
    enabled: !!selectedManual,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("item_supplier_prices")
        .select("*, suppliers(legal_name)")
        .eq("item_id", selectedManual!)
        .order("price");
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Sessão expirada");
      if (!form.name.trim()) throw new Error("Informe o nome do item");
      const { error } = await supabase.from("items").insert({
        user_id: userId,
        name: form.name.trim(),
        category: form.category,
        brand: form.brand || null,
        model: form.model || null,
        manufacturer_code: form.manufacturer_code || null,
        specs: form.specs || null,
        ncm: form.ncm || null,
        gtin: form.gtin || null,
        historic_cost: form.historic_cost ? Number(form.historic_cost) : null,
        min_price: form.min_price ? Number(form.min_price) : null,
        max_price: form.max_price ? Number(form.max_price) : null,
        avg_margin: form.avg_margin ? Number(form.avg_margin) : null,
        won_before: form.won_before,
        notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Item cadastrado");
      setForm(emptyItem);
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["items"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addPrice = useMutation({
    mutationFn: async () => {
      if (!userId || !selectedManual) throw new Error("Selecione um item cadastrado");
      if (!priceForm.supplier_id) throw new Error("Selecione o fornecedor");
      const { error } = await supabase.from("item_supplier_prices").insert({
        user_id: userId,
        item_id: selectedManual,
        supplier_id: priceForm.supplier_id,
        price: Number(priceForm.price) || 0,
        freight: Number(priceForm.freight) || 0,
        delivery_days: priceForm.delivery_days ? Number(priceForm.delivery_days) : null,
        role: priceForm.role,
        stock_confirmed: priceForm.stock_confirmed,
        notes: priceForm.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setPriceForm(emptyPrice);
      toast.success("Cotação registrada");
      qc.invalidateQueries({ queryKey: ["item-prices", selected] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      setSelected(null);
      qc.invalidateQueries({ queryKey: ["items"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = (k: keyof typeof emptyItem, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }) as typeof emptyItem);
  const setP = (k: keyof typeof emptyPrice, v: string | boolean) =>
    setPriceForm((f) => ({ ...f, [k]: v }) as typeof emptyPrice);

  const term = normalizeItemName(search);
  const manualRows = data.filter((i) =>
    normalizeItemName(`${i.name} ${i.brand ?? ""} ${i.model ?? ""}`).includes(term),
  );
  const autoRows = autoGroups.filter((g) => g.key.includes(term));
  const isEmpty = manualRows.length === 0 && autoRows.length === 0;

  return (
    <>
      <PageHeader
        title="Itens e produtos"
        subtitle="Histórico de custos, faixas de preço e cotações por fornecedor."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4" /> Novo item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Novo item</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nome *" value={form.name} onChange={(v) => set("name", v)} />
                <div className="space-y-1.5">
                  <Label>Categoria</Label>
                  <Select value={form.category} onValueChange={(v) => set("category", v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CLASSIFICATIONS.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Field label="Marca" value={form.brand} onChange={(v) => set("brand", v)} />
                <Field label="Modelo" value={form.model} onChange={(v) => set("model", v)} />
                <Field
                  label="Código do fabricante"
                  value={form.manufacturer_code}
                  onChange={(v) => set("manufacturer_code", v)}
                />
                <Field label="NCM" value={form.ncm} onChange={(v) => set("ncm", v)} />
                <Field label="GTIN/EAN" value={form.gtin} onChange={(v) => set("gtin", v)} />
                <Field
                  label="Custo histórico (R$)"
                  type="number"
                  value={form.historic_cost}
                  onChange={(v) => set("historic_cost", v)}
                />
                <Field
                  label="Preço mínimo praticado"
                  type="number"
                  value={form.min_price}
                  onChange={(v) => set("min_price", v)}
                />
                <Field
                  label="Preço máximo praticado"
                  type="number"
                  value={form.max_price}
                  onChange={(v) => set("max_price", v)}
                />
                <Field
                  label="Margem média (%)"
                  type="number"
                  value={form.avg_margin}
                  onChange={(v) => set("avg_margin", v)}
                />
                <div className="flex items-end gap-2">
                  <Switch checked={form.won_before} onCheckedChange={(v) => set("won_before", v)} />
                  <span className="text-sm">Já ganhei com este item</span>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Especificações técnicas</Label>
                  <Textarea value={form.specs} onChange={(e) => set("specs", e.target.value)} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Observações</Label>
                  <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button disabled={create.isPending} onClick={() => create.mutate()}>
                  Salvar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <Input
        placeholder="Buscar item"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 max-w-xs"
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr className="border-b border-border">
                <th className="p-3">Item</th>
                <th className="p-3">Custo histórico</th>
                <th className="p-3">Faixa praticada</th>
                <th className="p-3">Margem média</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {isEmpty && (
                <tr>
                  <td className="p-4 text-muted-foreground" colSpan={5}>
                    Nenhum item cadastrado ou vinculado a fornecedor nas oportunidades.
                  </td>
                </tr>
              )}
              {manualRows.map((i) => {
                const g = groupByItem.get(i.id);
                const cost = i.historic_cost ?? g?.avgCost ?? null;
                const min = i.min_price ?? g?.minPrice ?? null;
                const max = i.max_price ?? g?.maxPrice ?? null;
                const margin = i.avg_margin ?? g?.avgMargin ?? null;
                return (
                  <tr
                    key={i.id}
                    onClick={() => setSelected(i.id)}
                    className={`cursor-pointer border-b border-border/60 last:border-0 hover:bg-accent/30 ${selected === i.id ? "bg-accent/40" : ""}`}
                  >
                    <td className="p-3">
                      <span className="font-medium">{i.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {[i.brand, i.model].filter(Boolean).join(" · ") || "—"}{" "}
                        {i.won_before ? "· 🏆 já ganhou" : ""}
                        {g ? ` · ${g.quotes.length} cotação(ões) em oportunidades` : ""}
                      </span>
                    </td>
                    <td className="p-3">
                      {cost != null ? brl(Number(cost)) : "—"}
                      {g?.lastCost != null && (
                        <span className="block text-xs text-muted-foreground">
                          último {brl(g.lastCost)}
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      {min != null || max != null ? `${brl(min)} – ${brl(max)}` : "—"}
                    </td>
                    <td className="p-3">{margin != null ? pct(Number(margin)) : "—"}</td>
                    <td className="p-3">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeItem.mutate(i.id);
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {autoRows.map((g) => {
                const rowKey = `auto:${g.key}`;
                return (
                  <tr
                    key={rowKey}
                    onClick={() => setSelected(rowKey)}
                    className={`cursor-pointer border-b border-border/60 last:border-0 hover:bg-accent/30 ${selected === rowKey ? "bg-accent/40" : ""}`}
                  >
                    <td className="p-3">
                      <span className="font-medium">{g.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        <Badge variant="outline" className="mr-1 px-1.5 py-0 text-[10px]">
                          das oportunidades
                        </Badge>
                        {g.quotes.length} cotação(ões) ·{" "}
                        {new Set(g.quotes.map((q) => q.supplierId)).size} fornecedor(es)
                      </span>
                    </td>
                    <td className="p-3">
                      {g.avgCost != null ? brl(g.avgCost) : "—"}
                      {g.lastCost != null && (
                        <span className="block text-xs text-muted-foreground">
                          último {brl(g.lastCost)}
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      {g.minPrice != null ? `${brl(g.minPrice)} – ${brl(g.maxPrice)}` : "—"}
                    </td>
                    <td className="p-3">{g.avgMargin != null ? pct(g.avgMargin) : "—"}</td>
                    <td className="p-3" />
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <aside className="panel space-y-3 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Cotações por fornecedor
          </h2>
          {!selected && (
            <p className="text-sm text-muted-foreground">Selecione um item na tabela.</p>
          )}
          {selected && (
            <>
              <ul className="space-y-2 text-sm">
                {prices.length === 0 && !selectedGroup && (
                  <li className="text-muted-foreground">Nenhuma cotação registrada.</li>
                )}
                {selectedGroup?.quotes.map((q) => (
                  <li key={q.id} className="rounded-md border border-border p-2">
                    <div className="flex justify-between gap-2">
                      <Link
                        to="/fornecedores/$id"
                        params={{ id: q.supplierId }}
                        className="font-medium hover:underline"
                      >
                        {q.supplierName}
                      </Link>
                      <span>{brl(q.unitCost)}</span>
                    </div>
                    <span className="block text-xs text-muted-foreground">
                      preço proposto {brl(q.proposedPrice)} ·{" "}
                      {new Date(q.date).toLocaleDateString("pt-BR")} ·{" "}
                      {q.stockConfirmed ? "estoque ✅" : "estoque ⚠️"}
                    </span>
                    <Link
                      to="/oportunidades/$id"
                      params={{ id: q.opportunityId }}
                      className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      Dispensa {q.opportunityNumber} <ExternalLink className="size-3" />
                    </Link>
                  </li>
                ))}
                {prices.map((p) => (
                  <li key={p.id} className="rounded-md border border-border p-2">
                    <div className="flex justify-between">
                      <span className="font-medium">
                        {(p as { suppliers?: { legal_name?: string } }).suppliers?.legal_name ??
                          "Fornecedor"}
                      </span>
                      <span>{brl(Number(p.price))}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {p.role} · frete {brl(Number(p.freight))} · {p.delivery_days ?? "?"} dias ·{" "}
                      {p.stock_confirmed ? "estoque ✅" : "estoque ⚠️"} · cotação manual
                    </span>
                  </li>
                ))}
              </ul>

              {!selectedManual && (
                <p className="border-t border-border pt-3 text-xs text-muted-foreground">
                  Item gerado automaticamente a partir das oportunidades. Para registrar cotações
                  manuais, cadastre-o em "Novo item" com o mesmo nome.
                </p>
              )}
              {selectedManual && (
                <div className="space-y-3 border-t border-border pt-3">
                  <div className="space-y-1.5">
                    <Label>Fornecedor</Label>
                    <Select
                      value={priceForm.supplier_id}
                      onValueChange={(v) => setP("supplier_id", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.legal_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field
                      label="Preço"
                      type="number"
                      value={priceForm.price}
                      onChange={(v) => setP("price", v)}
                    />
                    <Field
                      label="Frete"
                      type="number"
                      value={priceForm.freight}
                      onChange={(v) => setP("freight", v)}
                    />
                    <Field
                      label="Prazo (dias)"
                      type="number"
                      value={priceForm.delivery_days}
                      onChange={(v) => setP("delivery_days", v)}
                    />
                    <div className="space-y-1.5">
                      <Label>Papel</Label>
                      <Select value={priceForm.role} onValueChange={(v) => setP("role", v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SUPPLIER_ROLES.map((r) => (
                            <SelectItem key={r.value} value={r.value}>
                              {r.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={priceForm.stock_confirmed}
                      onCheckedChange={(v) => setP("stock_confirmed", v)}
                    />
                    <span className="text-sm">Estoque confirmado</span>
                  </div>
                  <Button
                    className="w-full"
                    disabled={addPrice.isPending}
                    onClick={() => addPrice.mutate()}
                  >
                    Registrar cotação
                  </Button>
                </div>
              )}
            </>
          )}
        </aside>
      </div>
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
