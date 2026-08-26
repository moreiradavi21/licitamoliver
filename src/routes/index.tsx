import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Gavel,
  FileSearch,
  Boxes,
  Truck,
  Calculator,
  TrafficCone,
  ShieldCheck,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Licita360 — Gestão de Licitações e Dispensas Eletrônicas" },
      {
        name: "description",
        content:
          "Controle dispensas eletrônicas do aviso ao pagamento: oportunidades, catálogo de itens, fornecedores avaliados, calculadora de lucro e leitura de editais por IA.",
      },
      { property: "og:title", content: "Licita360 — Gestão de Licitações e Dispensas" },
      {
        property: "og:description",
        content:
          "Do aviso de contratação direta ao recebimento: semáforo de decisão, margem, fornecedores e riscos do edital em um só lugar.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: Gavel, title: "Oportunidades", desc: "Cada dispensa com dados, prazos, status e semáforo de decisão." },
  { icon: FileSearch, title: "Leitura de edital por IA", desc: "Upload do PDF e extração de itens, prazos, exigências e riscos." },
  { icon: Boxes, title: "Banco de itens", desc: "Histórico de custos, menor e maior preço, margem média e fornecedores." },
  { icon: Truck, title: "Fornecedores", desc: "Ficha completa, avaliação por estrelas e classificação de confiança." },
  { icon: Calculator, title: "Calculadora de lucro", desc: "Preço mínimo, preço recomendado, margem, lucro e ROI." },
  { icon: TrafficCone, title: "Semáforo", desc: "Verde, amarelo ou vermelho antes de entrar na disputa." },
];

function Landing() {
  const [logged, setLogged] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setLogged(!!data.session));
  }, []);

  return (
    <main className="min-h-screen bg-hero-gradient">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <ShieldCheck className="size-6 text-primary" />
          Licita<span className="text-primary">360</span>
        </div>
        <Button asChild variant="secondary">
          <Link to={logged ? "/dashboard" : "/auth"}>{logged ? "Abrir painel" : "Entrar"}</Link>
        </Button>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-16 pt-10 md:pt-20">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">
          Dispensas eletrônicas · Pregões · Contratação direta
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight md:text-6xl">
          Gestão completa das suas licitações, do aviso ao pagamento.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
          Não é uma planilha de oportunidades. É um sistema com indicadores, alertas de disputa,
          análise de edital por IA, catálogo de itens, fornecedores avaliados e uma calculadora que
          diz se vale a pena disputar.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to={logged ? "/dashboard" : "/auth"}>
              {logged ? "Ir para o dashboard" : "Começar agora"}
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/auth">Já tenho conta</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-6 pb-24 md:grid-cols-3">
        {features.map((f) => (
          <article key={f.title} className="panel p-5 shadow-elev">
            <f.icon className="size-6 text-primary" />
            <h2 className="mt-3 text-base font-semibold">{f.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
