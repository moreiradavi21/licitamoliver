import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar · Licita360" },
      { name: "description", content: "Acesse seu painel de gestão de licitações e dispensas eletrônicas." },
      { property: "og:title", content: "Entrar · Licita360" },
      { property: "og:description", content: "Acesse seu painel de gestão de licitações." },
    ],
  }),
  component: AuthPage,
});

const schema = z.object({
  email: z.string().trim().email({ message: "E-mail inválido" }).max(255),
  password: z.string().min(6, { message: "Mínimo de 6 caracteres" }).max(72),
  fullName: z.string().trim().max(100).optional(),
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  const submit = async (mode: "signin" | "signup") => {
    const parsed = schema.safeParse({ email, password, fullName });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: parsed.data.fullName || null },
          },
        });
        if (error) throw error;
      }
      const { data } = await supabase.auth.getSession();
      if (data.session) navigate({ to: "/dashboard" });
      else toast.success("Conta criada. Verifique seu e-mail para confirmar o acesso.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível autenticar");
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setLoading(false);
      toast.error("Não foi possível entrar com Google");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-hero-gradient px-4 py-12">
      <div className="w-full max-w-md panel p-8 shadow-elev">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <ShieldCheck className="size-6 text-primary" />
          Licita<span className="text-primary">360</span>
        </div>
        <h1 className="mt-6 text-2xl font-semibold">Acesse seu painel</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gerencie dispensas, fornecedores e margens em um só lugar.
        </p>

        <Tabs defaultValue="signin" className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Entrar</TabsTrigger>
            <TabsTrigger value="signup">Criar conta</TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="space-y-4 pt-4">
            <Field label="E-mail" value={email} onChange={setEmail} type="email" />
            <Field label="Senha" value={password} onChange={setPassword} type="password" />
            <Button className="w-full" disabled={loading} onClick={() => submit("signin")}>
              Entrar
            </Button>
          </TabsContent>

          <TabsContent value="signup" className="space-y-4 pt-4">
            <Field label="Nome completo" value={fullName} onChange={setFullName} />
            <Field label="E-mail" value={email} onChange={setEmail} type="email" />
            <Field label="Senha" value={password} onChange={setPassword} type="password" />
            <Button className="w-full" disabled={loading} onClick={() => submit("signup")}>
              Criar conta
            </Button>
          </TabsContent>
        </Tabs>

        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
        </div>
        <Button variant="outline" className="w-full" disabled={loading} onClick={google}>
          Continuar com Google
        </Button>
      </div>
    </main>
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
