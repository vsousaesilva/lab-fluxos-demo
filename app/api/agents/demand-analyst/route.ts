import { headers } from "next/headers";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { runDemandAnalyst } from "@/lib/agents/demand-analyst/run";

const requestSchema = z.object({
  demandId: z.string().uuid(),
  additionalContext: z.string().max(5000).optional(),
  replaceAnalysisId: z.string().uuid().optional(),
});

export async function POST(req: Request) {
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return new Response("Não autenticado", { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response("JSON inválido", { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Entrada inválida" },
      { status: 400 }
    );
  }

  try {
    console.log(
      `[POST /api/agents/demand-analyst] demandId=${parsed.data.demandId}`
    );
    const { job, result } = await runDemandAnalyst({
      demandId: parsed.data.demandId,
      additionalContext: parsed.data.additionalContext,
      replaceAnalysisId: parsed.data.replaceAnalysisId,
      userId: session.user.id,
    });
    console.log(
      `[POST /api/agents/demand-analyst] returning stream for job=${job.id}`
    );
    return result.toTextStreamResponse();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao executar agente";
    console.error("[POST /api/agents/demand-analyst] ERRO antes do stream:", err);
    return Response.json({ error: message }, { status: 400 });
  }
}
