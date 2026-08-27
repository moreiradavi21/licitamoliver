import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useUserId } from "@/hooks/use-user";
import { PageHeader } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { brl, CLASSIFICATIONS, dateTimeBR, STATUS, STATUS_ORDER, TRAFFIC, type StatusKey, type TrafficKey } from "@/lib/domain";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/oportunidades/")({
  head: () => ({
    meta: [
      { title: "Oportunidades · Licita360" },
      { name: "description", content: "Todas as dispensas cadastradas, com status, prazos e semáforo de decisão." },
      { property: "og:title", content: "Oportunidades · Licita360" },
      { property: "og:description", content: "Gerencie suas dispensas eletrônicas." },
    ],
  }),
  component: Opportunities,
});

const emptyForm = {
  number: "",
  agency: "",
  uasg: "",
  platform: "",
  process_url: "",
  published_at: "",
  dispute_at: "",
  delivery_place: "",
  delivery_days: "",
  payment_days: "",
  classification: "informatica",
  status: "nova",
  estimated_value: "",
  notes: "",
};

function Opportunities() {
  const qc = useQueryClient();
  const userId = useUserId();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [filter, setFilter] = useState<string>("todos");
  const [search, setSearch] = useState("");

  const { data = [], isLoading } = useQuery({
    queryKey: ["opportunities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("opportunities")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Sessão expirada");
      if (!form.number.trim()) throw new Error("Informe o número da dispensa");
      const { error } = await supabase.from("opportunities").insert({
        user_id: userId,
        number: form.number.trim(),
        agency: form.agency || null,
        uasg: form.uasg || null,
        platform: form.platform || null,
        process_url: form.process_url || null,
        published_at: form.published_at || null,
        dispute_at: form.dispute_at ? new Date(form.dispute_at).toISOString() : null,
        delivery_place: form.delivery_place || null,
        delivery_days: form.delivery_days ? Number(form.delivery_days) : null,
        payment_days: form.payment_days ? Number(form.payment_days) : null,
        classification: form.classification,
        status: form.status,
        estimated_value: form.estimated_value ? Number(form.estimated_value) : null,
        notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Oportunidade cadastrada");
      setForm(emptyForm);
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["opportunities"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = data.filter(
    (o) =>
      (filter === "todos" || o.status === filter) &&
      (search.trim() === "" ||
        `${o.number} ${o.agency ?? ""} ${o.platform ?? ""}`.toLowerCase().includes(search.toLowerCase())),
  );

  const set = (k: keyof typeof emptyForm, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <>
      <PageHeader
        title="Oportunidades"
        subtitle="Cada dispensa do aviso ao pagamento."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4" /> Nova oportunidade
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Nova oportunidade</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 sm:grid-cols-2">
                <F label="Número da dispensa *" value={form.number} onChange={(v) => set("number", v)} />
                <F label="Órgão" value={form.agency} onChange={(v) => set("agency", v)} />
                <F label="UASG" value={form.uasg} onChange={(v) => set("uasg", v)} />
                <F label="Plataforma" value={form.platform} onChange={(v) => set("platform", v)} />
                <F label="Link do processo" value={form.process_url} onChange={(v) => set("process_url", v)} />
                <F label="Data de publicação" type="date" value={form.published_at} onChange={(v) => set("published_at", v)} />
                <F label="Data/hora da disputa" type="datetime-local" value={form.dispute_at} onChange={(v) => set("dispute_at", v)} />
                <F label="Local de entrega" value={form.delivery_place} onChange={(v) => set("delivery_place", v)} />
                <F label="Prazo de entrega (dias)" type="number" value={form.delivery_days} onChange={(v) => set("delivery_days", v)} />
                <F label="Prazo de pagamento (dias)" type="number" value={form.payment_days} onChange={(v) => set("payment_days", v)} />
                <F label="Valor estimado (R$)" type="number" value={form.estimated_value} onChange={(v) => set("estimated_value", v)} />
                <div className="space-y-1.5">
                  <Label>Classificação</Label>
                  <Select value={form.classification} onValueChange={(v) => set("classification", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CLASSIFICATIONS.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => set("status", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_ORDER.map((s) => (
                        <SelectItem key={s} value={s}>{STATUS[s].emoji} {STATUS[s].label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Observações</Label>
                  <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button disabled={create.isPending} onClick={() => create.mutate()}>Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Input
          placeholder="Buscar por número, órgão ou plataforma"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {STATUS_ORDER.map((s) => (
              <SelectItem key={s} value={s}>{STATUS[s].emoji} {STATUS[s].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-muted-foreground">
            <tr className="border-b border-border">
              <th className="p-3">Dispensa</th>
              <th className="p-3">Órgão</th>
              <th className="p-3">Disputa</th>
              <th className="p-3">Valor estimado</th>
              <th className="p-3">Semáforo</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td className="p-4 text-muted-foreground" colSpan={6}>Carregando…</td></tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr><td className="p-4 text-muted-foreground" colSpan={6}>Nenhuma oportunidade encontrada.</td></tr>
            )}
            {rows.map((o) => (
              <tr key={o.id} className="border-b border-border/60 last:border-0 hover:bg-accent/30">
                <td className="p-3">
                  <Link to="/oportunidades/$id" params={{ id: o.id }} className="font-medium text-primary hover:underline">
                    {o.number}
                  </Link>
                  <div className="text-xs text-muted-foreground">{o.platform ?? "—"}</div>
                </td>
                <td className="p-3">{o.agency ?? "—"}</td>
                <td className="p-3">{dateTimeBR(o.dispute_at)}</td>
                <td className="p-3">{brl(o.estimated_value)}</td>
                <td className={`p-3 ${TRAFFIC[(o.traffic_light as TrafficKey) ?? "amarelo"]?.className}`}>
                  {TRAFFIC[(o.traffic_light as TrafficKey) ?? "amarelo"]?.emoji}{" "}
                  {TRAFFIC[(o.traffic_light as TrafficKey) ?? "amarelo"]?.label}
                </td>
                <td className="p-3">
                  {STATUS[o.status as StatusKey]?.emoji} {STATUS[o.status as StatusKey]?.label}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function F({
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
