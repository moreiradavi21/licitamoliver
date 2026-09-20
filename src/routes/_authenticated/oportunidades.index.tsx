import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useUserId } from "@/hooks/use-user";
import { analyzeEdital } from "@/lib/edital.functions";
import { PageHeader } from "@/components/AppLayout";
import { NicheFields } from "@/components/NicheFields";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
import { brl, dateTimeBR, STATUS, STATUS_ORDER, TRAFFIC, type StatusKey, type TrafficKey } from "@/lib/domain";
import { Archive, ArchiveRestore, FileSearch, Loader2, Plus, Trash2 } from "lucide-react";

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
  nicho_id: "",
  subnicho_id: "",
  micro_nicho_id: "",
  status: "nova",
  estimated_value: "",
  notes: "",
};

type PendingAnalysis = {
  id: string;
  extracted: unknown;
};

const textValue = (value: unknown) => String(value ?? "").trim();

function numberValue(value: unknown) {
  const raw = textValue(value).replace(/R\$\s?/gi, "").replace(/\s/g, "");
  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  const match = normalized.match(/-?\d+(?:\.\d+)?/);
  return match ? match[0] : "";
}

function dateValue(value: unknown, withTime = false) {
  const raw = textValue(value);
  if (!raw) return "";
  const br = raw.match(/(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
  if (br) {
    const date = `${br[3]}-${br[2]}-${br[1]}`;
    return withTime ? `${date}T${br[4] ?? "00"}:${br[5] ?? "00"}` : date;
  }
  const iso = raw.match(/\d{4}-\d{2}-\d{2}(?:[T\s]\d{2}:\d{2})?/);
  if (!iso) return "";
  return withTime ? iso[0].replace(" ", "T").slice(0, 16) : iso[0].slice(0, 10);
}

function Opportunities() {
  const qc = useQueryClient();
  const userId = useUserId();
  const runAnalysis = useServerFn(analyzeEdital);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editalFile, setEditalFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [pendingAnalysis, setPendingAnalysis] = useState<PendingAnalysis | null>(null);
  const [filter, setFilter] = useState<string>("todos");
  const [archiveFilter, setArchiveFilter] = useState<"ativas" | "arquivadas">("ativas");
  const [search, setSearch] = useState("");

  const { data = [], isLoading } = useQuery({
    queryKey: ["opportunities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("opportunities")
        .select("*, nichos(nome), subnichos(nome), micro_nichos(nome)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Sessão expirada");
      if (!form.number.trim()) throw new Error("Informe o número da dispensa");
      const { data: opportunity, error } = await supabase.from("opportunities").insert({
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
        classification: "outros",
        nicho_id: form.nicho_id || null,
        subnicho_id: form.subnicho_id || null,
        micro_nicho_id: form.micro_nicho_id || null,
        status: form.status,
        estimated_value: form.estimated_value ? Number(form.estimated_value) : null,
        notes: form.notes || null,
      }).select("id").single();
      if (error) throw error;
      if (!opportunity) throw new Error("Não foi possível criar a oportunidade");

      if (pendingAnalysis) {
        const { error: linkError } = await supabase
          .from("document_analyses")
          .update({ opportunity_id: opportunity.id })
          .eq("id", pendingAnalysis.id);
        if (linkError) throw linkError;

        const extracted = (pendingAnalysis.extracted ?? {}) as Record<string, unknown>;
        const items = Array.isArray(extracted["itens"])
          ? (extracted["itens"] as Record<string, unknown>[])
          : [];
        if (items.length > 0) {
          const { error: itemsError } = await supabase.from("opportunity_items").insert(
            items.map((item) => ({
              user_id: userId,
              opportunity_id: opportunity.id,
              description: textValue(item["descricao"]) || "Item do edital",
              quantity: Number(numberValue(item["quantidade"]) || 1),
              unit_cost: 0,
              proposed_price: Number(numberValue(item["valor_unitario_estimado"]) || 0),
            })),
          );
          if (itemsError) throw itemsError;
        }
      }
    },
    onSuccess: () => {
      toast.success("Oportunidade cadastrada");
      setForm(emptyForm);
      setEditalFile(null);
      setPendingAnalysis(null);
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["opportunities"] });
      qc.invalidateQueries({ queryKey: ["analyses"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = data.filter(
    (o) =>
      (archiveFilter === "arquivadas" ? Boolean(o.archived_at) : !o.archived_at) &&
      (filter === "todos" || o.status === filter) &&
      (search.trim() === "" ||
        `${o.number} ${o.agency ?? ""} ${o.platform ?? ""}`.toLowerCase().includes(search.toLowerCase())),
  );

  const set = (k: keyof typeof emptyForm, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const analyzeAndFill = async () => {
    if (!editalFile) {
      toast.error("Selecione o edital em PDF ou imagem");
      return;
    }
    if (editalFile.size > 12 * 1024 * 1024) {
      toast.error("Arquivo muito grande (máx. 12 MB)");
      return;
    }
    setAnalyzing(true);
    try {
      const bytes = new Uint8Array(await editalFile.arrayBuffer());
      let binary = "";
      for (let i = 0; i < bytes.length; i += 8192) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
      }
      const analysis = (await runAnalysis({
        data: {
          fileName: editalFile.name,
          mimeType: editalFile.type || "application/pdf",
          fileData: btoa(binary),
          opportunityId: null,
        },
      })) as PendingAnalysis;
      const extracted = (analysis.extracted ?? {}) as Record<string, unknown>;
      setForm((current) => ({
        ...current,
        number: textValue(extracted["numero_dispensa"]) || current.number,
        agency: textValue(extracted["orgao"]) || current.agency,
        uasg: textValue(extracted["uasg"]) || current.uasg,
        platform: textValue(extracted["plataforma"]) || current.platform,
        process_url: textValue(extracted["link_processo"]) || current.process_url,
        published_at: dateValue(extracted["data_publicacao"]) || current.published_at,
        dispute_at: dateValue(extracted["data_disputa"], true) || current.dispute_at,
        delivery_place: textValue(extracted["local_entrega"]) || current.delivery_place,
        delivery_days: numberValue(extracted["prazo_entrega"]) || current.delivery_days,
        payment_days: numberValue(extracted["prazo_pagamento"]) || current.payment_days,
        estimated_value: numberValue(extracted["valor_estimado"]) || current.estimated_value,
      }));
      setPendingAnalysis(analysis);
      toast.success("Edital lido e informações preenchidas");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao analisar o edital");
    } finally {
      setAnalyzing(false);
    }
  };

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
              <div className="space-y-3 rounded-md border border-border bg-muted/30 p-4">
                <div>
                  <Label htmlFor="new-opportunity-edital">Preencher pelo edital</Label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Selecione o PDF ou imagem para preencher os dados e itens automaticamente.
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    id="new-opportunity-edital"
                    type="file"
                    accept="application/pdf,image/*"
                    disabled={analyzing}
                    onChange={(event) => {
                      setEditalFile(event.target.files?.[0] ?? null);
                      setPendingAnalysis(null);
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={analyzing || !editalFile}
                    onClick={analyzeAndFill}
                  >
                    {analyzing ? <Loader2 className="size-4 animate-spin" /> : <FileSearch className="size-4" />}
                    {analyzing ? "Lendo…" : "Ler e preencher"}
                  </Button>
                </div>
                {pendingAnalysis && (
                  <p className="text-xs font-medium text-success">
                    Edital lido. Revise os dados abaixo antes de salvar.
                  </p>
                )}
              </div>
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
                <NicheFields
                  value={{ nicho_id: form.nicho_id, subnicho_id: form.subnicho_id, micro_nicho_id: form.micro_nicho_id }}
                  onChange={(value) => setForm((current) => ({ ...current, ...value }))}
                />
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
        <Select value={archiveFilter} onValueChange={(value) => setArchiveFilter(value as "ativas" | "arquivadas")}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ativas">Ativas</SelectItem>
            <SelectItem value="arquivadas">Arquivadas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-muted-foreground">
            <tr className="border-b border-border">
              <th className="p-3">Dispensa</th>
              <th className="p-3">Órgão</th>
              <th className="p-3">Nicho</th>
              <th className="p-3">Disputa</th>
              <th className="p-3">Valor estimado</th>
              <th className="p-3">Semáforo</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td className="p-4 text-muted-foreground" colSpan={8}>Carregando…</td></tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr><td className="p-4 text-muted-foreground" colSpan={8}>Nenhuma oportunidade encontrada.</td></tr>
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
                <td className="p-3"><span className="font-medium">{o.nichos?.nome ?? "Não classificada"}</span>{o.subnichos?.nome && <span className="block text-xs text-muted-foreground">{o.subnichos.nome}{o.micro_nichos?.nome ? ` · ${o.micro_nichos.nome}` : ""}</span>}</td>
                <td className="p-3">{dateTimeBR(o.dispute_at)}</td>
                <td className="p-3">{brl(o.estimated_value)}</td>
                <td className={`p-3 ${TRAFFIC[(o.traffic_light as TrafficKey) ?? "amarelo"]?.className}`}>
                  {TRAFFIC[(o.traffic_light as TrafficKey) ?? "amarelo"]?.emoji}{" "}
                  {TRAFFIC[(o.traffic_light as TrafficKey) ?? "amarelo"]?.label}
                </td>
                <td className="p-3">
                  {STATUS[o.status as StatusKey]?.emoji} {STATUS[o.status as StatusKey]?.label}
                </td>
                <td className="p-3">
                  <OpportunityActions id={o.id} number={o.number} archived={Boolean(o.archived_at)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function OpportunityActions({ id, number, archived }: { id: string; number: string; archived: boolean }) {
  const qc = useQueryClient();
  const archive = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("opportunities")
        .update({ archived_at: archived ? null : new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(archived ? "Oportunidade desarquivada" : "Oportunidade arquivada");
      qc.invalidateQueries({ queryKey: ["opportunities"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("opportunities").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Oportunidade excluída");
      qc.invalidateQueries({ queryKey: ["opportunities"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="flex justify-end gap-1">
      <Button
        size="icon"
        variant="ghost"
        aria-label={archived ? "Desarquivar oportunidade" : "Arquivar oportunidade"}
        title={archived ? "Desarquivar" : "Arquivar"}
        disabled={archive.isPending}
        onClick={() => archive.mutate()}
      >
        {archived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button size="icon" variant="ghost" aria-label="Excluir oportunidade" title="Excluir">
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir a oportunidade {number}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é definitiva. Os itens serão excluídos e as análises de edital serão desvinculadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={remove.isPending} onClick={() => remove.mutate()}>
              Excluir definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
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
