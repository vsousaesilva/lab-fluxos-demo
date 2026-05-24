"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db/client";
import { getAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/auth/admin";
import { generateInviteCode, normalizeCode } from "@/lib/auth/invite";
import type { Invite } from "@/lib/db/schema";

type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

async function requireAdmin(): Promise<{ id: string; email: string }> {
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Não autenticado");
  if (!(await isAdminEmail(session.user.email))) {
    throw new Error("Acesso restrito a administradores");
  }
  return { id: session.user.id, email: session.user.email };
}

export async function listInvites(): Promise<Invite[]> {
  await requireAdmin();
  const db = await getDb();
  return db
    .select()
    .from(schema.invite)
    .orderBy(desc(schema.invite.createdAt));
}

const createInviteSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200).optional().or(z.literal("")),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});

export async function createInviteAction(
  input: z.infer<typeof createInviteSchema>
): Promise<ActionResult<Invite>> {
  try {
    const admin = await requireAdmin();
    const parsed = createInviteSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
    }
    const db = await getDb();

    // Gera código único (tenta 5x)
    let code = generateInviteCode();
    for (let i = 0; i < 5; i++) {
      const exists = await db.query.invite.findFirst({
        where: eq(schema.invite.code, code),
      });
      if (!exists) break;
      code = generateInviteCode();
    }

    const [row] = await db
      .insert(schema.invite)
      .values({
        code,
        email: parsed.data.email || null,
        note: parsed.data.note || null,
        createdBy: admin.id,
      })
      .returning();

    revalidatePath("/admin/convites");
    return { ok: true, data: row };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao criar convite";
    console.error("[createInviteAction]", err);
    return { ok: false, error: message };
  }
}

const idSchema = z.object({ id: z.string().uuid() });

export async function revokeInviteAction(
  input: z.infer<typeof idSchema>
): Promise<ActionResult<Invite>> {
  try {
    await requireAdmin();
    const parsed = idSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "ID inválido" };
    const db = await getDb();
    const now = new Date();
    const [row] = await db
      .update(schema.invite)
      .set({ revokedAt: now, updatedAt: now })
      .where(eq(schema.invite.id, parsed.data.id))
      .returning();
    if (!row) return { ok: false, error: "Convite não encontrado" };
    revalidatePath("/admin/convites");
    return { ok: true, data: row };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao revogar";
    console.error("[revokeInviteAction]", err);
    return { ok: false, error: message };
  }
}

export async function deleteInviteAction(
  input: z.infer<typeof idSchema>
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdmin();
    const parsed = idSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "ID inválido" };
    const db = await getDb();
    await db.delete(schema.invite).where(eq(schema.invite.id, parsed.data.id));
    revalidatePath("/admin/convites");
    return { ok: true, data: { id: parsed.data.id } };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao excluir";
    console.error("[deleteInviteAction]", err);
    return { ok: false, error: message };
  }
}
