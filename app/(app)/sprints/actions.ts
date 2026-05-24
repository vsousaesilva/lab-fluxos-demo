"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db/client";
import { getAuth } from "@/lib/auth";
import type { DemandAnalysis, Sprint } from "@/lib/db/schema";
import { sprintManagerOutputSchema } from "@/lib/agents/sprint-manager/schema";

const SPRINT_STATUSES = ["PROPOSED", "APPROVED", "REJECTED"] as const;

const setSprintStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(SPRINT_STATUSES),
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

export async function listSprints(): Promise<Sprint[]> {
  const db = await getDb();
  return db
    .select()
    .from(schema.sprint)
    .orderBy(desc(schema.sprint.createdAt));
}

export async function listApprovedAnalysesWithBacklog(): Promise<DemandAnalysis[]> {
  const db = await getDb();
  return db
    .select()
    .from(schema.demandAnalysis)
    .where(eq(schema.demandAnalysis.status, "APPROVED"))
    .orderBy(desc(schema.demandAnalysis.createdAt));
}

const updateSprintSchema = sprintManagerOutputSchema.extend({
  id: z.string().uuid(),
  weeks: z.number().int().min(1).max(8),
  capacityDescription: z.string().max(2000).optional().nullable(),
  goalHint: z.string().max(500).optional().nullable(),
});

export async function updateSprintAction(
  input: z.infer<typeof updateSprintSchema>
): Promise<ActionResult<Sprint>> {
  try {
    const userId = await requireUserId();
    const parsed = updateSprintSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
    }
    const db = await getDb();
    const { id, capacityDescription, goalHint, ...values } = parsed.data;
    const [row] = await db
      .update(schema.sprint)
      .set({
        ...values,
        capacityNotes: values.capacityNotes ?? null,
        capacityDescription: capacityDescription ?? null,
        goalHint: goalHint ?? null,
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(eq(schema.sprint.id, id))
      .returning();
    if (!row) return { ok: false, error: "Sprint não encontrada" };
    revalidatePath("/sprints");
    revalidatePath("/revisao");
    return { ok: true, data: row };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao atualizar sprint";
    console.error("[updateSprintAction]", err);
    return { ok: false, error: message };
  }
}

export async function setSprintStatusAction(
  input: z.infer<typeof setSprintStatusSchema>
): Promise<ActionResult<Sprint>> {
  try {
    const userId = await requireUserId();
    const parsed = setSprintStatusSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
    }
    const db = await getDb();
    const [row] = await db
      .update(schema.sprint)
      .set({
        status: parsed.data.status,
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(eq(schema.sprint.id, parsed.data.id))
      .returning();
    if (!row) return { ok: false, error: "Sprint não encontrada" };
    revalidatePath("/sprints");
    revalidatePath("/revisao");
    return { ok: true, data: row };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao atualizar status";
    console.error("[setSprintStatusAction]", err);
    return { ok: false, error: message };
  }
}
