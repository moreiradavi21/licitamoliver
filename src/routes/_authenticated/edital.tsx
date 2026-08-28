import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { analyzeEdital } from "@/lib/edital.functions";
import { PageHeader } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { dateTimeBR } from "@/lib/domain";
import { FileSearch, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/edital")({
  head: () => ({
    meta: [
      { title: "Leitura de edital com IA · Licita360" },
      { name: "description", content: "Envie o PDF do aviso ou termo de referência e receba resumo, riscos e itens extraídos." },
      { property: "og:title", content: "Leitura de edital com IA · Licita360" },
      { property: "og:description", content: "Resumo, riscos e itens extraídos automaticamente do edital." },
    ],
  }),
  component: EditalPage,
});

type Analysis = {
  id: string;
  file_name: string;
  summary: string | null;
  favorable: unknown;
  attention: unknown;
  risks: unknown;
  extracted: unknown;
  created_at: string;
};

const toList = (v: unknown): string[] => (Array.isArray(v) ? v.map((x) => String(x)) : []);
const toRisks = (v: unknown): Array<{ risco: string; acao: string }> =>
  Array.isArray(v)
    ? v.map((x) => {
        const o = (x ?? {}) as Record<string, unknown>;
        return { risco: String(o["risco"] ?? x), acao: String(o["acao"] ?? "") };
      })
    : [];

function EditalPage() {
  const qc = useQueryClient();
  const run = useServerFn(analyzeEdital);
  const [file, setFile] = useState<File | null>(null);
  const [opportunityId, setOpportunityId] = useState("none");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Analysis | null>(null);

  const { data: opportunities = [] } = useQuery({
    queryKey: ["opportunities-min"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("opportunities")
        .select("id, number, agency")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: history = [] } = useQuery({
    queryKey: ["analyses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_analyses")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as Analysis[];
    },
  });

  const submit = async () => {
    if (!file) return toast.error("Selecione um arquivo PDF ou imagem");
    if (file.size > 12 * 1024 * 1024) return toast.error("Arquivo muito grande (máx. 12 MB)");
    setLoading(true);
    try {
      const buffer = await file.arrayBuffer();
      let binary = "";
      const bytes = new Uint8Array(buffer);
      for (let i = 0; i < bytes.length; i += 8192) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
      }
      const base64 = btoa(binary);
      const saved = await run({
        data: {
          fileName: file.name,
          mimeType: file.type || "application/pdf",
          fileData: base64,
          opportunityId: opportunityId === "none" ? null : opportunityId,
        },
      });
      setResult(saved as Analysis);
      toast.success("Análise concluída");
      qc.invalidateQueries({ queryKey: ["analyses"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao analisar");
    } finally {
      setLoading(false);
    }
  };

  const shown = result;
  const extracted = (shown?.extracted ?? {}) as Record<string, unknown>;
  const items = Array.isArray(extracted["itens"]) ? (extracted["itens"] as Record<string, unknown>[]) : [];

  return (
    <>
      <PageHeader
        title="Leitura de edital com IA"
        subtitle="Envie o aviso/termo de referência e receba resumo, itens, riscos e pontos de atenção."
      />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <section className="panel space-y-4 p-5">
          <div className="space-y-1.5">
            <Label>Documento (PDF ou imagem)</Label>
            <Input
              type="file"
              accept="application/pdf,image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Vincular à oportunidade</Label>
            <Select value={opportunityId} onValueChange={setOpportunityId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Não vincular</SelectItem>
                {opportunities.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.number} — {o.agency ?? "sem órgão"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full" disabled={loading} onClick={submit}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <FileSearch className="size-4" />}
            {loading ? "Analisando…" : "Analisar documento"}
          </Button>

          <div className="border-t border-border pt-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Histórico</h2>
            <ul className="mt-2 space-y-2 text-sm">
              {history.length === 0 && <li className="text-muted-foreground">Nenhuma análise ainda.</li>}
              {history.map((h) => (
                <li key={h.id}>
                  <button className="text-left hover:text-primary" onClick={() => setResult(h)}>
                    <span className="font-medium">{h.file_name}</span>
                    <span className="block text-xs text-muted-foreground">{dateTimeBR(h.created_at)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="space-y-4">
          {!shown && (
            <div className="panel p-8 text-center text-sm text-muted-foreground">
              A análise aparecerá aqui: resumo, dados extraídos, itens, pontos favoráveis, atenção e riscos.
            </div>
          )}
          {shown && (
            <>
              <div className="panel p-5">
                <h2 className="text-base font-semibold">Resumo</h2>
                <p className="mt-2 text-sm text-muted-foreground">{shown.summary || "—"}</p>
              </div>

              <div className="panel p-5">
                <h2 className="text-base font-semibold">Dados extraídos</h2>
                <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                  {Object.entries(extracted)
                    .filter(([k, v]) => k !== "itens" && typeof v !== "object")
                    .map(([k, v]) => (
                      <div key={k}>
                        <dt className="text-xs uppercase text-muted-foreground">{k.replace(/_/g, " ")}</dt>
                        <dd>{String(v) || "—"}</dd>
                      </div>
                    ))}
                </dl>
                {Array.isArray(extracted["documentacao_exigida"]) && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium">Documentação exigida</h3>
                    <ul className="mt-1 list-disc pl-5 text-sm text-muted-foreground">
                      {toList(extracted["documentacao_exigida"]).map((d, i) => <li key={i}>{d}</li>)}
                    </ul>
                  </div>
                )}
              </div>

              {items.length > 0 && (
                <div className="panel overflow-x-auto p-5">
                  <h2 className="text-base font-semibold">Itens identificados</h2>
                  <table className="mt-3 w-full text-sm">
                    <thead className="text-left text-xs uppercase text-muted-foreground">
                      <tr className="border-b border-border">
                        <th className="p-2">Descrição</th>
                        <th className="p-2">Qtd</th>
                        <th className="p-2">Unid.</th>
                        <th className="p-2">Valor unit. estimado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it, i) => (
                        <tr key={i} className="border-b border-border/60 last:border-0">
                          <td className="p-2">
                            {String(it["descricao"] ?? "—")}
                            <span className="block text-xs text-muted-foreground">{String(it["especificacoes"] ?? "")}</span>
                          </td>
                          <td className="p-2">{String(it["quantidade"] ?? "—")}</td>
                          <td className="p-2">{String(it["unidade"] ?? "—")}</td>
                          <td className="p-2">{String(it["valor_unitario_estimado"] ?? "—")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="panel p-5">
                  <h2 className="text-base font-semibold text-success">✅ Pontos favoráveis</h2>
                  <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
                    {toList(shown.favorable).map((f, i) => <li key={i}>{f}</li>)}
                  </ul>
                </div>
                <div className="panel p-5">
                  <h2 className="text-base font-semibold text-warning">⚠️ Pontos de atenção</h2>
                  <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
                    {toList(shown.attention).map((f, i) => <li key={i}>{f}</li>)}
                  </ul>
                </div>
              </div>

              <div className="panel p-5">
                <h2 className="text-base font-semibold text-destructive">🚨 Riscos e ações sugeridas</h2>
                <ul className="mt-2 space-y-2 text-sm">
                  {toRisks(shown.risks).map((r, i) => (
                    <li key={i}>
                      <strong>{r.risco}</strong>
                      {r.acao && <span className="block text-muted-foreground">→ {r.acao}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </section>
      </div>
    </>
  );
}
