import { headers } from "next/headers";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import {
  retryFailedCards,
  syncAnalysisToJira,
  syncSprintToJira,
} from "@/lib/jira/sync";

const requestSchema = z.discriminatedUnion("source", [
  z.object({
    source: z.literal("analysis"),
    id: z.string().uuid(),
  }),
  z.object({
    source: z.literal("sprint"),
    id: z.string().uuid(),
  }),
  z.object({
    source: z.literal("retry"),
    sourceType: z.enum(["DEMAND_ANALYSIS", "SPRINT"]),
    sourceId: z.string().uuid(),
  }),
]);

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
    console.log(`[POST /api/agents/jira-synchronizer]`, parsed.data);
    const input = parsed.data;
    let outcome;
    if (input.source === "analysis") {
      outcome = await syncAnalysisToJira({
        analysisId: input.id,
        userId: session.user.id,
      });
    } else if (input.source === "sprint") {
      outcome = await syncSprintToJira({
        sprintId: input.id,
        userId: session.user.id,
      });
    } else {
      outcome = await retryFailedCards({
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        userId: session.user.id,
      });
    }
    return Response.json({ ok: true, outcome });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao sincronizar";
    console.error("[POST /api/agents/jira-synchronizer]", err);
    return Response.json({ error: message }, { status: 400 });
  }
}
