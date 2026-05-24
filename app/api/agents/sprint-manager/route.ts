import { headers } from "next/headers";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { runSprintManager } from "@/lib/agents/sprint-manager/run";

const requestSchema = z.object({
  analysisIds: z.array(z.string().uuid()).min(1).max(10),
  weeks: z.number().int().min(1).max(8),
  capacityDescription: z.string().max(2000).optional(),
  goalHint: z.string().max(500).optional(),
  replaceSprintId: z.string().uuid().optional(),
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
      `[POST /api/agents/sprint-manager] analysisIds=${parsed.data.analysisIds.length} weeks=${parsed.data.weeks}`
    );
    const { job, result } = await runSprintManager({
      analysisIds: parsed.data.analysisIds,
      weeks: parsed.data.weeks,
      capacityDescription: parsed.data.capacityDescription,
      goalHint: parsed.data.goalHint,
      replaceSprintId: parsed.data.replaceSprintId,
      userId: session.user.id,
    });
    console.log(
      `[POST /api/agents/sprint-manager] returning stream for job=${job.id}`
    );
    return result.toTextStreamResponse();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao executar agente";
    console.error("[POST /api/agents/sprint-manager] ERRO antes do stream:", err);
    return Response.json({ error: message }, { status: 400 });
  }
}
