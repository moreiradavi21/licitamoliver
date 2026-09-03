import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";

const inputSchema = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(3).max(120),
  fileData: z.string().min(20).max(20_000_000),
  opportunityId: z.string().uuid().nullable().optional(),
});

const SYSTEM_PROMPT = `Você é um analista sênior de licitações públicas brasileiras (Lei 14.133/2021).
Leia o documento (aviso de contratação direta, termo de referência ou edital) e responda SOMENTE com um JSON válido, sem markdown, no formato:
{
  "resumo": "string curta",
  "extraido": {
    "numero_dispensa": "", "orgao": "", "uasg": "", "plataforma": "",
    "data_disputa": "", "valor_estimado": "", "local_entrega": "",
    "prazo_entrega": "", "prazo_pagamento": "", "garantia": "",
    "criterio_julgamento": "", "documentacao_exigida": ["..."],
    "penalidades": ["..."],
    "itens": [{"descricao":"","quantidade":"","unidade":"","especificacoes":"","marca_modelo":"","valor_unitario_estimado":""}]
  },
  "favoraveis": ["..."],
  "atencao": ["..."],
  "riscos": [{"risco":"...","acao":"..."}]
}
Use "" ou [] quando a informação não constar. Escreva em português do Brasil.`;

export const analyzeEdital = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("Serviço de IA não configurado.");

    const content: Array<Record<string, unknown>> = [
      {
        type: "text",
        text: "Analise este documento de licitação/dispensa e devolva o JSON solicitado.",
      },
    ];
    if (data.mimeType.startsWith("image/")) {
      content.push({
        type: "image_url",
        image_url: { url: `data:${data.mimeType};base64,${data.fileData}` },
      });
    } else {
      content.push({
        type: "file",
        file: {
          filename: data.fileName,
          file_data: `data:${data.mimeType};base64,${data.fileData}`,
        },
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3.7-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`AI gateway error [${response.status}]: ${body}`);
      if (response.status === 429) throw new Error("Muitas requisições. Tente novamente em instantes.");
      if (response.status === 402)
        throw new Error("Créditos de IA insuficientes no espaço de trabalho.");
      throw new Error(`Falha ao analisar o documento (${response.status}).`);
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = payload.choices?.[0]?.message?.content ?? "";
    const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(cleaned) as Record<string, unknown>;
    } catch {
      const start = cleaned.indexOf("{");
      const end = cleaned.lastIndexOf("}");
      if (start === -1 || end === -1) throw new Error("A IA não retornou uma análise estruturada.");
      parsed = JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
    }

    const record = {
      user_id: context.userId,
      opportunity_id: data.opportunityId ?? null,
      file_name: data.fileName,
      summary: String(parsed["resumo"] ?? ""),
      favorable: (parsed["favoraveis"] ?? []) as Json,
      attention: (parsed["atencao"] ?? []) as Json,
      risks: (parsed["riscos"] ?? []) as Json,
      extracted: (parsed["extraido"] ?? {}) as Json,
    };

    const { data: saved, error } = await context.supabase
      .from("document_analyses")
      .insert(record)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return saved;
  });
