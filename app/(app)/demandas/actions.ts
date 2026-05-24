"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db/client";
import { getAuth } from "@/lib/auth";
import {
  createDemandSchema,
  setDemandStatusSchema,
  type CreateDemandInput,
  type SetDemandStatusInput,
} from "@/lib/validators/demand";
import type { Demand, DemandStatus } from "@/lib/db/schema";

type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

async function requireUserId(): Promise<string> {
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Não autenticado");
  return session.user.id;
}

export async function listDemands(filter?: {
  status?: DemandStatus;
}): Promise<Demand[]> {
  const db = await getDb();
  const where = filter?.status ? eq(schema.demand.status, filter.status) : undefined;
  const rows = await db
    .select()
    .from(schema.demand)
    .where(where)
    .orderBy(desc(schema.demand.createdAt));
  return rows;
}

export async function createDemandAction(
  input: CreateDemandInput
): Promise<ActionResult<Demand>> {
  try {
    const userId = await requireUserId();
    const parsed = createDemandSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
    }
    const db = await getDb();
    const [row] = await db
      .insert(schema.demand)
      .values({
        ...parsed.data,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();
    revalidatePath("/demandas");
    return { ok: true, data: row };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao criar demanda";
    console.error("[createDemandAction]", err);
    return { ok: false, error: message };
  }
}

const updateDemandSchema = createDemandSchema.extend({
  id: z.string().uuid(),
});

export async function updateDemandAction(
  input: z.infer<typeof updateDemandSchema>
): Promise<ActionResult<Demand>> {
  try {
    const userId = await requireUserId();
    const parsed = updateDemandSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
    }
    const db = await getDb();
    const { id, ...values } = parsed.data;
    const [row] = await db
      .update(schema.demand)
      .set({
        ...values,
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(eq(schema.demand.id, id))
      .returning();
    if (!row) return { ok: false, error: "Demanda não encontrada" };
    revalidatePath("/demandas");
    return { ok: true, data: row };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao atualizar demanda";
    console.error("[updateDemandAction]", err);
    return { ok: false, error: message };
  }
}

export async function setDemandStatusAction(
  input: SetDemandStatusInput
): Promise<ActionResult<Demand>> {
  try {
    const userId = await requireUserId();
    const parsed = setDemandStatusSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
    }
    const db = await getDb();
    const [row] = await db
      .update(schema.demand)
      .set({
        status: parsed.data.status,
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(eq(schema.demand.id, parsed.data.id))
      .returning();
    if (!row) return { ok: false, error: "Demanda não encontrada" };
    revalidatePath("/demandas");
    return { ok: true, data: row };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao atualizar status";
    console.error("[setDemandStatusAction]", err);
    return { ok: false, error: message };
  }
}

const deleteDemandSchema = z.object({ id: z.string().uuid() });

export async function deleteDemandAction(
  input: z.infer<typeof deleteDemandSchema>
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireUserId();
    const parsed = deleteDemandSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: "ID inválido" };
    }
    const db = await getDb();
    await db.delete(schema.demand).where(eq(schema.demand.id, parsed.data.id));
    revalidatePath("/demandas");
    return { ok: true, data: { id: parsed.data.id } };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao excluir demanda";
    console.error("[deleteDemandAction]", err);
    return { ok: false, error: message };
  }
}
