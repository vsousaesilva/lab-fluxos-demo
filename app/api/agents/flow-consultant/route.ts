import { headers } from "next/headers";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { runFlowConsultant } from "@/lib/agents/flow-consultant/run";

const messageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().max(20000),
});

const requestSchema = z.object({
  messages: z.array(messageSchema).min(1),
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

  const messages = parsed.data.messages;
  const last = messages[messages.length - 1];
  if (last.role !== "user") {
    return Response.json(
      { error: "A última mensagem precisa ser do usuário." },
      { status: 400 }
    );
  }

  const history = messages.slice(0, -1).filter(
    (m): m is { role: "user" | "assistant"; content: string } =>
      m.role === "user" || m.role === "assistant"
  );

  try {
    const { job, result, citations } = await runFlowConsultant({
      question: last.content,
      history,
      userId: session.user.id,
    });
    console.log(
      `[POST /api/agents/flow-consultant] job=${job.id} citations=${citations.length}`
    );
    return result.toDataStreamResponse({
      headers: {
        "X-Citations": Buffer.from(JSON.stringify(citations)).toString("base64"),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro no consultor";
    console.error("[POST /api/agents/flow-consultant] ERRO antes do stream:", err);
    return Response.json({ error: message }, { status: 400 });
  }
}
