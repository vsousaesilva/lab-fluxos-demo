import { headers } from "next/headers";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { runBpmnDesigner } from "@/lib/agents/bpmn-designer/run";

const requestSchema = z.object({
  userStoryId: z.string().uuid(),
  additionalContext: z.string().max(5000).optional(),
  replaceDiagramId: z.string().uuid().optional(),
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
      `[POST /api/agents/bpmn-designer] userStoryId=${parsed.data.userStoryId}`
    );
    const { job, result } = await runBpmnDesigner({
      userStoryId: parsed.data.userStoryId,
      additionalContext: parsed.data.additionalContext,
      replaceDiagramId: parsed.data.replaceDiagramId,
      userId: session.user.id,
    });
    console.log(
      `[POST /api/agents/bpmn-designer] returning stream for job=${job.id}`
    );
    return result.toTextStreamResponse();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao executar agente";
    console.error("[POST /api/agents/bpmn-designer] ERRO antes do stream:", err);
    return Response.json({ error: message }, { status: 400 });
  }
}
