import { headers } from "next/headers";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { runRitesScribe } from "@/lib/agents/rites-scribe/run";
import { CEREMONY_TYPES } from "@/lib/agents/rites-scribe/schema";

const requestSchema = z.object({
  type: z.enum(CEREMONY_TYPES),
  occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sprintId: z.string().uuid().nullable().optional(),
  rawNotes: z.string().min(1).max(50000),
  additionalContext: z.string().max(5000).optional(),
  replaceCeremonyId: z.string().uuid().optional(),
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
      `[POST /api/agents/rites-scribe] type=${parsed.data.type} date=${parsed.data.occurredOn}`
    );
    const { job, result } = await runRitesScribe({
      type: parsed.data.type,
      occurredOn: parsed.data.occurredOn,
      sprintId: parsed.data.sprintId,
      rawNotes: parsed.data.rawNotes,
      additionalContext: parsed.data.additionalContext,
      replaceCeremonyId: parsed.data.replaceCeremonyId,
      userId: session.user.id,
    });
    console.log(
      `[POST /api/agents/rites-scribe] returning stream for job=${job.id}`
    );
    return result.toTextStreamResponse();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao executar agente";
    console.error("[POST /api/agents/rites-scribe] ERRO antes do stream:", err);
    return Response.json({ error: message }, { status: 400 });
  }
}
