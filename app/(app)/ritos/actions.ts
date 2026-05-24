"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db/client";
import { getAuth } from "@/lib/auth";
import type { CeremonyRecord, Sprint } from "@/lib/db/schema";
import {
  CEREMONY_TYPES,
  ritesScribeOutputSchema,
} from "@/lib/agents/rites-scribe/schema";

const CEREMONY_STATUSES = ["DRAFT", "APPROVED", "REJECTED"] as const;

const setStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(CEREMONY_STATUSES),
});

type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

async function requireUserId(): Promise<string> {
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Não autenticado");
  return session.user.id;
}

export async function listCeremonies(): Promise<CeremonyRecord[]> {
  const db = await getDb();
  return db
    .select()
    .from(schema.ceremonyRecord)
    .orderBy(desc(schema.ceremonyRecord.createdAt));
}

export async function listApprovedSprints(): Promise<Sprint[]> {
  const db = await getDb();
  return db
    .select()
    .from(schema.sprint)
    .where(eq(schema.sprint.status, "APPROVED"))
    .orderBy(desc(schema.sprint.createdAt));
}

const updateCeremonySchema = ritesScribeOutputSchema.extend({
  id: z.string().uuid(),
  ceremonyType: z.enum(CEREMONY_TYPES),
  occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sprintId: z.string().uuid().nullable().optional(),
  rawNotes: z.string().max(50000).optional(),
  additionalContext: z.string().max(5000).nullable().optional(),
});

export async function updateCeremonyAction(
  input: z.infer<typeof updateCeremonySchema>
): Promise<ActionResult<CeremonyRecord>> {
  try {
    const userId = await requireUserId();
    const parsed = updateCeremonySchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
    }
    const db = await getDb();
    const { id, sprintId, additionalContext, rawNotes, ...values } = parsed.data;
    const [row] = await db
      .update(schema.ceremonyRecord)
      .set({
        ...values,
        sprintId: sprintId ?? null,
        rawNotes: rawNotes ?? "",
        additionalContext: additionalContext ?? null,
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(eq(schema.ceremonyRecord.id, id))
      .returning();
    if (!row) return { ok: false, error: "Ata não encontrada" };
    revalidatePath("/ritos");
    revalidatePath("/revisao");
    return { ok: true, data: row };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao atualizar ata";
    console.error("[updateCeremonyAction]", err);
    return { ok: false, error: message };
  }
}

export async function setCeremonyStatusAction(
  input: z.infer<typeof setStatusSchema>
): Promise<ActionResult<CeremonyRecord>> {
  try {
    const userId = await requireUserId();
    const parsed = setStatusSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
    }
    const db = await getDb();
    const [row] = await db
      .update(schema.ceremonyRecord)
      .set({
        status: parsed.data.status,
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(eq(schema.ceremonyRecord.id, parsed.data.id))
      .returning();
    if (!row) return { ok: false, error: "Ata não encontrada" };
    revalidatePath("/ritos");
    return { ok: true, data: row };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao atualizar status";
    console.error("[setCeremonyStatusAction]", err);
    return { ok: false, error: message };
  }
}
