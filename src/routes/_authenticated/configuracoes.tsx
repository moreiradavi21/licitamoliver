import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useUserId } from "@/hooks/use-user";
import { PageHeader } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações · Licita360" },
      { name: "description", content: "Defina margens mínima e ideal, impostos padrão e reserva de risco." },
      { property: "og:title", content: "Configurações · Licita360" },
      { property: "og:description", content: "Parâmetros de margem, impostos e risco do seu negócio." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const userId = useUserId();
  const [form, setForm] = useState({
    min_margin: "8",
    good_margin: "15",
    default_tax_percent: "0",
    default_risk_percent: "3",
  });
  const [profile, setProfile] = useState({ full_name: "", company: "" });

  const { data } = useQuery({
    queryKey: ["settings-page"],
    queryFn: async () => {
      const [s, p] = await Promise.all([
        supabase.from("settings").select("*").maybeSingle(),
        supabase.from("profiles").select("*").maybeSingle(),
      ]);
      if (s.error) throw s.error;
      return { settings: s.data, profile: p.data };
    },
  });

  useEffect(() => {
    if (data?.settings) {
      setForm({
        min_margin: String(data.settings.min_margin),
        good_margin: String(data.settings.good_margin),
        default_tax_percent: String(data.settings.default_tax_percent),
        default_risk_percent: String(data.settings.default_risk_percent),
      });
    }
    if (data?.profile) {
      setProfile({ full_name: data.profile.full_name ?? "", company: data.profile.company ?? "" });
    }
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Sessão expirada");
      const { error } = await supabase.from("settings").upsert(
        {
          user_id: userId,
          min_margin: Number(form.min_margin) || 0,
          good_margin: Number(form.good_margin) || 0,
          default_tax_percent: Number(form.default_tax_percent) || 0,
          default_risk_percent: Number(form.default_risk_percent) || 0,
        },
        { onConflict: "user_id" },
      );
      if (error) throw error;
      const { error: pErr } = await supabase.from("profiles").upsert(
        { id: userId, full_name: profile.full_name || null, company: profile.company || null },
        { onConflict: "id" },
      );
      if (pErr) throw pErr;
    },
    onSuccess: () => {
      toast.success("Configurações salvas");
      qc.invalidateQueries({ queryKey: ["settings"] });
      qc.invalidateQueries({ queryKey: ["settings-page"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader title="Configurações" subtitle="Parâmetros usados no semáforo e na calculadora." />

      <div className="grid max-w-3xl gap-6">
        <section className="panel grid gap-4 p-5 sm:grid-cols-2">
          <h2 className="text-base font-semibold sm:col-span-2">Perfil</h2>
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input value={profile.full_name} onChange={(e) => setProfile((p) => ({ ...p, full_name: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Empresa</Label>
            <Input value={profile.company} onChange={(e) => setProfile((p) => ({ ...p, company: e.target.value }))} />
          </div>
        </section>

        <section className="panel grid gap-4 p-5 sm:grid-cols-2">
          <h2 className="text-base font-semibold sm:col-span-2">Margens e custos padrão</h2>
          <Field label="Margem mínima aceitável (%)" value={form.min_margin} onChange={(v) => setForm((f) => ({ ...f, min_margin: v }))} />
          <Field label="Margem considerada boa (%)" value={form.good_margin} onChange={(v) => setForm((f) => ({ ...f, good_margin: v }))} />
          <Field label="Impostos padrão (%)" value={form.default_tax_percent} onChange={(v) => setForm((f) => ({ ...f, default_tax_percent: v }))} />
          <Field label="Reserva de risco padrão (%)" value={form.default_risk_percent} onChange={(v) => setForm((f) => ({ ...f, default_risk_percent: v }))} />
          <p className="text-xs text-muted-foreground sm:col-span-2">
            Abaixo da margem mínima o semáforo fica 🔴; entre a mínima e a boa fica 🟡; acima da boa fica 🟢.
          </p>
        </section>

        <div>
          <Button disabled={save.isPending} onClick={() => save.mutate()}>Salvar configurações</Button>
        </div>
      </div>
    </>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type="number" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
