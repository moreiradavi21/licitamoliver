import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, Package } from "lucide-react";
import { PageHeader } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { brl, dateBR } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/fornecedores/$id")({
  head: () => ({ meta: [
    { title: "Ficha do fornecedor · Licita360" },
    { name: "description", content: "Dados comerciais, nichos e produtos vinculados ao fornecedor." },
    { property: "og:title", content: "Ficha do fornecedor · Licita360" },
    { property: "og:description", content: "Dados comerciais, nichos e produtos vinculados ao fornecedor." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }), component: SupplierDetail,
});

function SupplierDetail() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery({ queryKey: ["supplier-detail", id], queryFn: async () => {
    const [supplier, links, prices, niches, subs, micros] = await Promise.all([
      supabase.from("suppliers").select("*").eq("id", id).maybeSingle(),
      supabase.from("fornecedores_nichos").select("*").eq("fornecedor_id", id),
      supabase.from("item_supplier_prices").select("*, items(id, name, brand, model)").eq("supplier_id", id).order("quoted_at", { ascending: false }),
      supabase.from("nichos").select("id, nome"), supabase.from("subnichos").select("id, nicho_id, nome"), supabase.from("micro_nichos").select("id, subnicho_id, nome"),
    ]);
    if (supplier.error) throw supplier.error; if (links.error) throw links.error; if (prices.error) throw prices.error;
    return { supplier: supplier.data, links: links.data ?? [], prices: prices.data ?? [], niches: niches.data ?? [], subs: subs.data ?? [], micros: micros.data ?? [] };
  }});
  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  const supplier = data?.supplier; if (!supplier) return <p className="text-sm text-muted-foreground">Fornecedor não encontrado.</p>;
  const demand = supplier.vende_sob_demanda === "sim" ? "SIM" : supplier.vende_sob_demanda === "parcialmente" ? "PARCIALMENTE" : "NÃO";
  return <><Link to="/fornecedores" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Voltar</Link><PageHeader title={supplier.legal_name} subtitle={[supplier.cnpj, supplier.cidade, supplier.uf].filter(Boolean).join(" · ") || "Dados comerciais do fornecedor"} />
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]"><div className="space-y-6"><section className="panel p-5"><h2 className="font-semibold">Nichos atendidos</h2><div className="mt-4 space-y-4">{data?.niches.filter((n) => data.links.some((l) => l.nicho_id === n.id)).map((n) => <div key={n.id}><Badge>{n.nome}</Badge><div className="mt-2 space-y-2 border-l pl-4">{data.subs.filter((s) => s.nicho_id === n.id && data.links.some((l) => l.subnicho_id === s.id)).map((s) => <div key={s.id}><p className="text-sm font-medium">{s.nome}</p><div className="mt-1 flex flex-wrap gap-1">{data.micros.filter((m) => m.subnicho_id === s.id && data.links.some((l) => l.micro_nicho_id === m.id)).map((m) => <Badge key={m.id} variant="outline">{m.nome}</Badge>)}</div></div>)}</div></div>)}{!data?.links.length && <p className="text-sm text-muted-foreground">Nenhum nicho vinculado.</p>}</div></section>
      <section className="panel p-5"><h2 className="flex items-center gap-2 font-semibold"><Package className="size-4" /> Produtos vinculados</h2><div className="mt-3 overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-xs uppercase text-muted-foreground"><tr className="border-b"><th className="p-2">Produto</th><th className="p-2">Preço</th><th className="p-2">Frete</th><th className="p-2">Cotação</th></tr></thead><tbody>{data?.prices.map((p) => <tr key={p.id} className="border-b last:border-0"><td className="p-2">{p.items?.name ?? "Produto removido"}<span className="block text-xs text-muted-foreground">{[p.items?.brand, p.items?.model].filter(Boolean).join(" · ")}</span></td><td className="p-2">{brl(p.price)}</td><td className="p-2">{brl(p.freight)}</td><td className="p-2">{dateBR(p.quoted_at)}</td></tr>)}{!data?.prices.length && <tr><td colSpan={4} className="p-3 text-muted-foreground">Nenhum produto vinculado por cotação.</td></tr>}</tbody></table></div></section></div>
      <aside className="space-y-4"><section className="panel space-y-3 p-5"><div className="flex items-center justify-between"><h2 className="font-semibold">Dados comerciais</h2><Badge variant={supplier.vende_sob_demanda === "sim" ? "default" : "outline"} className={supplier.vende_sob_demanda === "sim" ? "bg-success text-success-foreground" : ""}>{demand}</Badge></div><Info label="Vendedor" value={supplier.vendedor || supplier.contact_name} /><Info label="Telefone" value={supplier.telefone || supplier.whatsapp} /><Info label="E-mail" value={supplier.email} /><Info label="Prazo de envio" value={supplier.avg_delivery_days ? `${supplier.avg_delivery_days} dias` : null} /><Info label="Quantidade mínima" value={supplier.quantidade_minima != null ? String(supplier.quantidade_minima) : null} /><Info label="Frete até Belo Horizonte" value={supplier.frete_bh} /><Info label="Condições de pagamento" value={supplier.condicoes_pagamento} /><Info label="Garantia" value={supplier.garantia} /><Info label="Última cotação" value={dateBR(supplier.ultima_cotacao)} />{supplier.website && <a href={supplier.website} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">Abrir site <ExternalLink className="size-3" /></a>}</section>{supplier.notes && <section className="panel p-5"><h2 className="font-semibold">Observações</h2><p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{supplier.notes}</p></section>}</aside></div></>;
}
function Info({ label, value }: { label: string; value: string | null }) { return <div><p className="text-xs uppercase text-muted-foreground">{label}</p><p className="text-sm">{value || "—"}</p></div>; }