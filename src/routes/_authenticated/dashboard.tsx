import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppLayout";
import { brl, pct, STATUS, dateTimeBR, type StatusKey } from "@/lib/domain";
import { AlertTriangle, Clock, FileWarning, PackageX, TrendingDown } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard · Licita360" },
      { name: "description", content: "Indicadores de dispensas, disputas, margem e faturamento contratado." },
      { property: "og:title", content: "Dashboard · Licita360" },
      { property: "og:description", content: "Indicadores e alertas das suas licitações." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [opps, settings] = await Promise.all([
        supabase.from("opportunities").select("*").order("dispute_at", { ascending: true }),
        supabase.from("settings").select("*").maybeSingle(),
      ]);
      if (opps.error) throw opps.error;
      return { opportunities: opps.data ?? [], settings: settings.data };
    },
  });

  const opps = data?.opportunities ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const count = (fn: (o: (typeof opps)[number]) => boolean) => opps.filter(fn).length;

  const foundToday = count((o) => (o.created_at ?? "").slice(0, 10) === today);
  const analysing = count((o) => o.status === "analise");
  const quoting = count((o) => o.status === "cotando");
  const ready = count((o) => o.status === "aprovada");
  const disputesToday = count((o) => (o.dispute_at ?? "").slice(0, 10) === today);
  const inDispute = count((o) => o.status === "disputa");
  const won = count((o) => ["ganha", "execucao", "recebida"].includes(o.status));
  const lost = count((o) => o.status === "perdida");
  const winRate = won + lost > 0 ? (won / (won + lost)) * 100 : 0;
  const contracted = opps
    .filter((o) => ["ganha", "execucao", "recebida"].includes(o.status))
    .reduce((s, o) => s + Number(o.won_value ?? 0), 0);
  const estimatedProfit = opps
    .filter((o) => !["perdida", "nao_participar"].includes(o.status))
    .reduce((s, o) => s + Number(o.estimated_profit ?? 0), 0);
  const realizedProfit = opps.reduce((s, o) => s + Number(o.realized_profit ?? 0), 0);
  const inExecution = opps
    .filter((o) => o.status === "execucao")
    .reduce((s, o) => s + Number(o.won_value ?? 0), 0);

  const now = Date.now();
  const alerts = [
    ...opps
      .filter(
        (o) =>
          o.dispute_at &&
          new Date(o.dispute_at).getTime() > now &&
          new Date(o.dispute_at).getTime() - now < 1000 * 60 * 60 * 24,
      )
      .map((o) => ({
        icon: Clock,
        tone: "text-warning",
        text: `Disputa começa em breve — ${o.number} (${dateTimeBR(o.dispute_at)})`,
        id: o.id,
      })),
    ...opps
      .filter((o) => o.documents_pending)
      .map((o) => ({ icon: FileWarning, tone: "text-warning", text: `Documento pendente — ${o.number}`, id: o.id })),
    ...opps
      .filter((o) => !o.supplier_confirmed && ["cotando", "aprovada", "disputa"].includes(o.status))
      .map((o) => ({
        icon: PackageX,
        tone: "text-destructive",
        text: `Fornecedor ainda não confirmou estoque — ${o.number}`,
        id: o.id,
      })),
    ...opps
      .filter(
        (o) =>
          Number(o.estimated_value ?? 0) > 0 &&
          Number(o.estimated_profit ?? 0) / Number(o.estimated_value) < (Number(data?.settings?.min_margin ?? 8) / 100),
      )
      .map((o) => ({ icon: TrendingDown, tone: "text-destructive", text: `Margem abaixo do mínimo — ${o.number}`, id: o.id })),
    ...opps
      .filter((o) => (o.delivery_days ?? 99) <= 10)
      .map((o) => ({
        icon: AlertTriangle,
        tone: "text-warning",
        text: `Prazo de entrega muito curto (${o.delivery_days} dias) — ${o.number}`,
        id: o.id,
      })),
  ];

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Visão geral das dispensas, disputas e resultados." />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Dispensas encontradas hoje" value={foundToday} />
        <Kpi label="Em análise" value={analysing} />
        <Kpi label="Aguardando cotação" value={quoting} />
        <Kpi label="Aptas para disputa" value={ready} />
        <Kpi label="Disputas de hoje" value={disputesToday} />
        <Kpi label="Disputas em andamento" value={inDispute} />
        <Kpi label="Ganhas" value={won} tone="text-success" />
        <Kpi label="Perdidas" value={lost} tone="text-muted-foreground" />
        <Kpi label="Taxa de vitória" value={pct(winRate)} />
        <Kpi label="Faturamento contratado" value={brl(contracted)} />
        <Kpi label="Lucro estimado" value={brl(estimatedProfit)} />
        <Kpi label="Lucro realizado" value={brl(realizedProfit)} tone="text-success" />
        <Kpi label="Valor em execução" value={brl(inExecution)} />
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section className="panel p-5">
          <h2 className="text-base font-semibold">Próximas disputas</h2>
          <div className="mt-3 space-y-2">
            {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
            {!isLoading &&
              opps.filter((o) => o.dispute_at && new Date(o.dispute_at).getTime() > now).slice(0, 6).length ===
                0 && <p className="text-sm text-muted-foreground">Nenhuma disputa agendada.</p>}
            {opps
              .filter((o) => o.dispute_at && new Date(o.dispute_at).getTime() > now)
              .slice(0, 6)
              .map((o) => (
                <Link
                  key={o.id}
                  to="/oportunidades/$id"
                  params={{ id: o.id }}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm hover:bg-accent/40"
                >
                  <span>
                    {STATUS[o.status as StatusKey]?.emoji} {o.number} — {o.agency ?? "Órgão não informado"}
                  </span>
                  <span className="text-muted-foreground">{dateTimeBR(o.dispute_at)}</span>
                </Link>
              ))}
          </div>
        </section>

        <section className="panel p-5">
          <h2 className="text-base font-semibold">Alertas</h2>
          <div className="mt-3 space-y-2">
            {alerts.length === 0 && <p className="text-sm text-muted-foreground">Nenhum alerta no momento. 🎉</p>}
            {alerts.slice(0, 12).map((a, i) => (
              <Link
                key={`${a.id}-${i}`}
                to="/oportunidades/$id"
                params={{ id: a.id }}
                className="flex items-start gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent/40"
              >
                <a.icon className={`mt-0.5 size-4 shrink-0 ${a.tone}`} />
                <span>{a.text}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="panel p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${tone ?? ""}`}>{value}</p>
    </div>
  );
}
