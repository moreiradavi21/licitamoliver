import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { useUserId } from "@/hooks/use-user";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type NicheSelection = { nicho_id: string; subnicho_id: string; micro_nicho_id: string };
export type MultiNicheSelection = { nichos: string[]; subnichos: string[]; micros: string[] };

export function useNicheCatalog() {
  return useQuery({
    queryKey: ["niche-catalog"],
    queryFn: async () => {
      const [niches, subniches, micros] = await Promise.all([
        supabase.from("nichos").select("*").order("nome"),
        supabase.from("subnichos").select("*").order("nome"),
        supabase.from("micro_nichos").select("*").order("nome"),
      ]);
      if (niches.error) throw niches.error;
      if (subniches.error) throw subniches.error;
      if (micros.error) throw micros.error;
      return { niches: niches.data ?? [], subniches: subniches.data ?? [], micros: micros.data ?? [] };
    },
  });
}

function CreateRow({ label, onCreate }: { label: string; onCreate: (name: string) => Promise<void> }) {
  const [value, setValue] = React.useState("");
  return (
    <div className="flex gap-2">
      <Input value={value} onChange={(event) => setValue(event.target.value)} placeholder={`Novo ${label.toLowerCase()}`} />
      <Button type="button" variant="outline" size="icon" title={`Criar ${label}`} onClick={async () => {
        if (!value.trim()) return;
        await onCreate(value.trim());
        setValue("");
      }}><Plus className="size-4" /></Button>
    </div>
  );
}

export function NicheFields({ value, onChange }: { value: NicheSelection; onChange: (value: NicheSelection) => void }) {
  const userId = useUserId();
  const qc = useQueryClient();
  const { data } = useNicheCatalog();
  const create = useMutation({
    mutationFn: async ({ level, name }: { level: "niche" | "sub" | "micro"; name: string }) => {
      if (!userId) throw new Error("Sessão expirada");
      if (level === "niche") {
        const { data: row, error } = await supabase.from("nichos").insert({ user_id: userId, nome: name }).select("id").single();
        if (error) throw error;
        onChange({ nicho_id: row.id, subnicho_id: "", micro_nicho_id: "" });
      } else if (level === "sub") {
        if (!value.nicho_id) throw new Error("Selecione um nicho primeiro");
        const { data: row, error } = await supabase.from("subnichos").insert({ user_id: userId, nicho_id: value.nicho_id, nome: name }).select("id").single();
        if (error) throw error;
        onChange({ ...value, subnicho_id: row.id, micro_nicho_id: "" });
      } else {
        if (!value.subnicho_id) throw new Error("Selecione um subnicho primeiro");
        const { data: row, error } = await supabase.from("micro_nichos").insert({ user_id: userId, subnicho_id: value.subnicho_id, nome: name }).select("id").single();
        if (error) throw error;
        onChange({ ...value, micro_nicho_id: row.id });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["niche-catalog"] }),
    onError: (error: Error) => toast.error(error.message),
  });
  const subs = (data?.subniches ?? []).filter((row) => row.nicho_id === value.nicho_id);
  const micros = (data?.micros ?? []).filter((row) => row.subnicho_id === value.subnicho_id);
  return (
    <div className="grid gap-4 sm:grid-cols-3 sm:col-span-2">
      <div className="space-y-1.5"><Label>Nicho</Label><Select value={value.nicho_id || "none"} onValueChange={(id) => onChange({ nicho_id: id === "none" ? "" : id, subnicho_id: "", micro_nicho_id: "" })}><SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger><SelectContent><SelectItem value="none">Não classificado</SelectItem>{data?.niches.map((row) => <SelectItem key={row.id} value={row.id}>{row.nome}</SelectItem>)}</SelectContent></Select><CreateRow label="Nicho" onCreate={(name) => create.mutateAsync({ level: "niche", name })} /></div>
      <div className="space-y-1.5"><Label>Subnicho</Label><Select disabled={!value.nicho_id} value={value.subnicho_id || "none"} onValueChange={(id) => onChange({ ...value, subnicho_id: id === "none" ? "" : id, micro_nicho_id: "" })}><SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger><SelectContent><SelectItem value="none">Sem subnicho</SelectItem>{subs.map((row) => <SelectItem key={row.id} value={row.id}>{row.nome}</SelectItem>)}</SelectContent></Select>{value.nicho_id && <CreateRow label="Subnicho" onCreate={(name) => create.mutateAsync({ level: "sub", name })} />}</div>
      <div className="space-y-1.5"><Label>Micro-nicho</Label><Select disabled={!value.subnicho_id} value={value.micro_nicho_id || "none"} onValueChange={(id) => onChange({ ...value, micro_nicho_id: id === "none" ? "" : id })}><SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger><SelectContent><SelectItem value="none">Sem micro-nicho</SelectItem>{micros.map((row) => <SelectItem key={row.id} value={row.id}>{row.nome}</SelectItem>)}</SelectContent></Select>{value.subnicho_id && <CreateRow label="Micro-nicho" onCreate={(name) => create.mutateAsync({ level: "micro", name })} />}</div>
    </div>
  );
}

export function MultiNicheFields({ value, onChange }: { value: MultiNicheSelection; onChange: (value: MultiNicheSelection) => void }) {
  const { data } = useNicheCatalog();
  const [newPath, setNewPath] = React.useState<NicheSelection>({ nicho_id: "", subnicho_id: "", micro_nicho_id: "" });
  const toggle = (key: keyof MultiNicheSelection, id: string, checked: boolean) => {
    const next = checked ? [...value[key], id] : value[key].filter((item) => item !== id);
    if (key === "nichos" && !checked) {
      const subIds = (data?.subniches ?? []).filter((s) => s.nicho_id === id).map((s) => s.id);
      onChange({ nichos: next, subnichos: value.subnichos.filter((s) => !subIds.includes(s)), micros: value.micros.filter((m) => !(data?.micros ?? []).some((row) => row.id === m && subIds.includes(row.subnicho_id))) });
      return;
    }
    if (key === "subnichos" && !checked) {
      onChange({ ...value, subnichos: next, micros: value.micros.filter((m) => !(data?.micros ?? []).some((row) => row.id === m && row.subnicho_id === id)) });
      return;
    }
    onChange({ ...value, [key]: next });
  };
  return (
    <div className="space-y-4 sm:col-span-2">
      <div><Label>Nichos atendidos *</Label><div className="mt-2 grid gap-2 rounded-md border p-3 sm:grid-cols-2">{data?.niches.length ? data.niches.map((n) => <label key={n.id} className="flex items-center gap-2 text-sm"><Checkbox checked={value.nichos.includes(n.id)} onCheckedChange={(v) => toggle("nichos", n.id, v === true)} />{n.nome}</label>) : <p className="text-sm text-muted-foreground">Nenhum nicho cadastrado. Crie o primeiro no seletor de uma oportunidade.</p>}</div></div>
      {value.nichos.length > 0 && <div><Label>Subnichos atendidos</Label><div className="mt-2 grid gap-2 rounded-md border p-3 sm:grid-cols-2">{(data?.subniches ?? []).filter((s) => value.nichos.includes(s.nicho_id)).map((s) => <label key={s.id} className="flex items-center gap-2 text-sm"><Checkbox checked={value.subnichos.includes(s.id)} onCheckedChange={(v) => toggle("subnichos", s.id, v === true)} />{s.nome}</label>)}</div></div>}
      {value.subnichos.length > 0 && <div><Label>Micro-nichos atendidos (opcional)</Label><div className="mt-2 grid gap-2 rounded-md border p-3 sm:grid-cols-2">{(data?.micros ?? []).filter((m) => value.subnichos.includes(m.subnicho_id)).map((m) => <label key={m.id} className="flex items-center gap-2 text-sm"><Checkbox checked={value.micros.includes(m.id)} onCheckedChange={(v) => toggle("micros", m.id, v === true)} />{m.nome}</label>)}</div></div>}
      <details className="rounded-md border p-3">
        <summary className="cursor-pointer text-sm font-medium">Criar novo nicho, subnicho ou micro-nicho</summary>
        <div className="mt-3">
          <NicheFields value={newPath} onChange={(next) => {
            setNewPath(next);
            onChange({
              nichos: next.nicho_id ? [...new Set([...value.nichos, next.nicho_id])] : value.nichos,
              subnichos: next.subnicho_id ? [...new Set([...value.subnichos, next.subnicho_id])] : value.subnichos,
              micros: next.micro_nicho_id ? [...new Set([...value.micros, next.micro_nicho_id])] : value.micros,
            });
          }} />
        </div>
      </details>
    </div>
  );
}