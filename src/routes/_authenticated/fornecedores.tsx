import { createFileRoute } from "@tanstack/react-router";
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
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CLASSIFICATIONS, TRUST_LEVELS } from "@/lib/domain";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/fornecedores")({
  head: () => ({
    meta: [
      { title: "Fornecedores · Licita360" },
      { name: "description", content: "Cadastro e avaliação de fornecedores: preço, resposta, prazo, qualidade e pós-venda." },
      { property: "og:title", content: "Fornecedores · Licita360" },
      { property: "og:description", content: "Avalie e classifique seus fornecedores por confiabilidade." },
    ],
  }),
  component: SuppliersPage,
});

const empty = {
  legal_name: "",
  cnpj: "",
  contact_name: "",
  whatsapp: "",
  email: "",
  website: "",
  categories: "informatica",
  rating_price: "3",
  rating_response: "3",
  rating_deadline: "3",
  rating_quality: "3",
  rating_aftersales: "3",
  trust_level: "cautela",
  issues_invoice: true,
  real_stock: false,
  delivers_to_agency: false,
  avg_delivery_days: "",
  return_policy: "",
  had_problems: false,
  notes: "",
};

const RATINGS = ["rating_price", "rating_response", "rating_deadline", "rating_quality", "rating_aftersales"] as const;
const RATING_LABELS: Record<(typeof RATINGS)[number], string> = {
  rating_price: "Preço",
  rating_response: "Resposta",
  rating_deadline: "Prazo",
  rating_quality: "Qualidade",
  rating_aftersales: "Pós-venda",
};

function SuppliersPage() {
  const qc = useQueryClient();
  const userId = useUserId();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [search, setSearch] = useState("");

  const { data = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("suppliers").select("*").order("legal_name");
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Sessão expirada");
      if (!form.legal_name.trim()) throw new Error("Informe a razão social");
      const { error } = await supabase.from("suppliers").insert({
        user_id: userId,
        legal_name: form.legal_name.trim(),
        cnpj: form.cnpj || null,
        contact_name: form.contact_name || null,
        whatsapp: form.whatsapp || null,
        email: form.email || null,
        website: form.website || null,
        categories: [form.categories],
        rating_price: Number(form.rating_price),
        rating_response: Number(form.rating_response),
        rating_deadline: Number(form.rating_deadline),
        rating_quality: Number(form.rating_quality),
        rating_aftersales: Number(form.rating_aftersales),
        trust_level: form.trust_level,
        issues_invoice: form.issues_invoice,
        real_stock: form.real_stock,
        delivers_to_agency: form.delivers_to_agency,
        avg_delivery_days: form.avg_delivery_days ? Number(form.avg_delivery_days) : null,
        return_policy: form.return_policy || null,
        had_problems: form.had_problems,
        notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Fornecedor cadastrado");
      setForm(empty);
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["suppliers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, unknown> }) => {
      const { error } = await supabase.from("suppliers").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["suppliers"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("suppliers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["suppliers"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const set = (k: keyof typeof empty, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }) as typeof empty);

  const rows = data.filter((s) =>
    `${s.legal_name} ${s.cnpj ?? ""} ${s.contact_name ?? ""}`.toLowerCase().includes(search.toLowerCase()),
  );

  const score = (s: Record<string, unknown>) =>
    RATINGS.reduce((acc, k) => acc + Number(s[k] ?? 0), 0) / RATINGS.length;

  return (
    <>
      <PageHeader
        title="Fornecedores"
        subtitle="Quem entrega de verdade — avaliação por preço, resposta, prazo, qualidade e pós-venda."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="size-4" /> Novo fornecedor</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
              <DialogHeader><DialogTitle>Novo fornecedor</DialogTitle></DialogHeader>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Razão social *" value={form.legal_name} onChange={(v) => set("legal_name", v)} />
                <Field label="CNPJ" value={form.cnpj} onChange={(v) => set("cnpj", v)} />
                <Field label="Contato" value={form.contact_name} onChange={(v) => set("contact_name", v)} />
                <Field label="WhatsApp" value={form.whatsapp} onChange={(v) => set("whatsapp", v)} />
                <Field label="E-mail" value={form.email} onChange={(v) => set("email", v)} />
                <Field label="Site" value={form.website} onChange={(v) => set("website", v)} />
                <div className="space-y-1.5">
                  <Label>Categoria principal</Label>
                  <Select value={form.categories} onValueChange={(v) => set("categories", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CLASSIFICATIONS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Field label="Prazo médio de entrega (dias)" type="number" value={form.avg_delivery_days} onChange={(v) => set("avg_delivery_days", v)} />
                {RATINGS.map((r) => (
                  <div key={r} className="space-y-1.5">
                    <Label>{RATING_LABELS[r]} (0–5)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={5}
                      value={form[r]}
                      onChange={(e) => set(r, e.target.value)}
                    />
                  </div>
                ))}
                <div className="space-y-1.5">
                  <Label>Nível de confiança</Label>
                  <Select value={form.trust_level} onValueChange={(v) => set("trust_level", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TRUST_LEVELS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Toggle label="Emite nota fiscal" checked={form.issues_invoice} onChange={(v) => set("issues_invoice", v)} />
                <Toggle label="Estoque real" checked={form.real_stock} onChange={(v) => set("real_stock", v)} />
                <Toggle label="Entrega no órgão" checked={form.delivers_to_agency} onChange={(v) => set("delivers_to_agency", v)} />
                <Toggle label="Já teve problemas" checked={form.had_problems} onChange={(v) => set("had_problems", v)} />
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Política de troca/devolução</Label>
                  <Textarea value={form.return_policy} onChange={(e) => set("return_policy", e.target.value)} />
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

      <Input
        placeholder="Buscar fornecedor"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 max-w-xs"
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.length === 0 && <p className="text-sm text-muted-foreground">Nenhum fornecedor cadastrado.</p>}
        {rows.map((s) => (
          <article key={s.id} className="panel space-y-3 p-5">
            <header className="flex items-start justify-between gap-2">
              <div>
                <h2 className="font-semibold">{s.legal_name}</h2>
                <p className="text-xs text-muted-foreground">{s.cnpj ?? "CNPJ não informado"}</p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => remove.mutate(s.id)}>
                <Trash2 className="size-4" />
              </Button>
            </header>
            <p className="text-sm text-muted-foreground">
              {s.contact_name ?? "—"} · {s.whatsapp ?? "sem WhatsApp"}
            </p>
            <p className="text-sm">
              Nota média: <strong>{score(s as unknown as Record<string, unknown>).toFixed(1)}</strong> / 5 ·{" "}
              {s.avg_delivery_days ? `${s.avg_delivery_days} dias` : "prazo não informado"}
            </p>
            <ul className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
              {RATINGS.map((r) => (
                <li key={r}>{RATING_LABELS[r]}: {"★".repeat(Number(s[r] ?? 0))}{"☆".repeat(5 - Number(s[r] ?? 0))}</li>
              ))}
            </ul>
            <ul className="space-y-0.5 text-xs text-muted-foreground">
              <li>{s.issues_invoice ? "✅" : "⚠️"} Emite nota fiscal</li>
              <li>{s.real_stock ? "✅" : "⚠️"} Estoque real</li>
              <li>{s.delivers_to_agency ? "✅" : "⚠️"} Entrega no órgão</li>
              <li>{s.had_problems ? "🚨 Já teve problemas" : "✅ Sem problemas registrados"}</li>
            </ul>
            <Select value={s.trust_level} onValueChange={(v) => update.mutate({ id: s.id, patch: { trust_level: v } })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TRUST_LEVELS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </article>
        ))}
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

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2 pt-6">
      <Switch checked={checked} onCheckedChange={onChange} />
      <span className="text-sm">{label}</span>
    </div>
  );
}
