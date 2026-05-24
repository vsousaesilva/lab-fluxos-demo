import { eq } from "drizzle-orm";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { consumeInvite, validateInvite } from "@/lib/auth/invite";
import { getDb, schema } from "@/lib/db/client";

const requestSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(8).max(200),
  inviteCode: z.string().trim().min(1).max(50),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    );
  }
  const { name, email, password, inviteCode } = parsed.data;

  // 1) Valida invite ANTES de criar a conta
  const validation = await validateInvite(inviteCode, email);
  if (!validation.ok) {
    return Response.json({ error: validation.error }, { status: 400 });
  }

  // 2) Cria conta via better-auth (retorna Response com Set-Cookie)
  const auth = await getAuth();
  let signupResponse: Response;
  try {
    signupResponse = await auth.api.signUpEmail({
      body: { name, email, password },
      asResponse: true,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao criar conta";
    return Response.json({ error: message }, { status: 400 });
  }

  if (!signupResponse.ok) {
    // better-auth retornou erro (email já cadastrado, etc) — repassa
    return signupResponse;
  }

  // 3) Marca invite como usado (busca user pelo email pra pegar o ID novo)
  try {
    const db = await getDb();
    const newUser = await db.query.user.findFirst({
      where: eq(schema.user.email, email),
    });
    if (newUser) {
      await consumeInvite(validation.invite.id, newUser.id);
    }
  } catch (err) {
    // Invite não consumido — não falhamos o signup por causa disso
    console.error("[signup-invite] falha ao consumir invite", err);
  }

  return signupResponse;
}
