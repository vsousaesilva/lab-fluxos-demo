"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db/client";
import { getAuth } from "@/lib/auth";
import type { Demand, UserStory } from "@/lib/db/schema";
import { userStoryWriterOutputSchema } from "@/lib/agents/user-story-writer/schema";

const USER_STORY_STATUSES = ["DRAFT", "APPROVED", "REJECTED"] as const;

const setUserStoryStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(USER_STORY_STATUSES),
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

export async function listUserStories(): Promise<UserStory[]> {
  const db = await getDb();
  return db
    .select()
    .from(schema.userStory)
    .orderBy(desc(schema.userStory.createdAt));
}

export async function listApprovedDemands(): Promise<Demand[]> {
  const db = await getDb();
  return db
    .select()
    .from(schema.demand)
    .where(eq(schema.demand.status, "APPROVED"))
    .orderBy(desc(schema.demand.createdAt));
}

const updateUserStorySchema = userStoryWriterOutputSchema.extend({
  id: z.string().uuid(),
});

export async function updateUserStoryAction(
  input: z.infer<typeof updateUserStorySchema>
): Promise<ActionResult<UserStory>> {
  try {
    const userId = await requireUserId();
    const parsed = updateUserStorySchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
    }
    const db = await getDb();
    const { id, ...values } = parsed.data;
    const [row] = await db
      .update(schema.userStory)
      .set({
        ...values,
        references: values.references && values.references.trim() ? values.references : "N/a",
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(eq(schema.userStory.id, id))
      .returning();
    if (!row) return { ok: false, error: "HU não encontrada" };
    revalidatePath("/hu");
    revalidatePath("/revisao");
    return { ok: true, data: row };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao atualizar HU";
    console.error("[updateUserStoryAction]", err);
    return { ok: false, error: message };
  }
}

export async function setUserStoryStatusAction(
  input: z.infer<typeof setUserStoryStatusSchema>
): Promise<ActionResult<UserStory>> {
  try {
    const userId = await requireUserId();
    const parsed = setUserStoryStatusSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
    }
    const db = await getDb();
    const [row] = await db
      .update(schema.userStory)
      .set({
        status: parsed.data.status,
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(eq(schema.userStory.id, parsed.data.id))
      .returning();
    if (!row) return { ok: false, error: "HU não encontrada" };
    revalidatePath("/hu");
    revalidatePath("/revisao");
    return { ok: true, data: row };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao atualizar status";
    console.error("[setUserStoryStatusAction]", err);
    return { ok: false, error: message };
  }
}
