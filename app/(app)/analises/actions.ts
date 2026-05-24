"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db/client";
import { getAuth } from "@/lib/auth";
import type { Demand, DemandAnalysis } from "@/lib/db/schema";
import { demandAnalystOutputSchema } from "@/lib/agents/demand-analyst/schema";

const ANALYSIS_STATUSES = ["DRAFT", "APPROVED", "REJECTED"] as const;

const setAnalysisStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(ANALYSIS_STATUSES),
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

export async function listAnalyses(): Promise<DemandAnalysis[]> {
  const db = await getDb();
  return db
    .select()
    .from(schema.demandAnalysis)
    .orderBy(desc(schema.demandAnalysis.createdAt));
}

export async function listApprovedDemands(): Promise<Demand[]> {
  const db = await getDb();
  return db
    .select()
    .from(schema.demand)
    .where(eq(schema.demand.status, "APPROVED"))
    .orderBy(desc(schema.demand.createdAt));
}

const updateAnalysisSchema = demandAnalystOutputSchema.extend({
  id: z.string().uuid(),
});

export async function updateAnalysisAction(
  input: z.infer<typeof updateAnalysisSchema>
): Promise<ActionResult<DemandAnalysis>> {
  try {
    const userId = await requireUserId();
    const parsed = updateAnalysisSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
    }
    const db = await getDb();
    const { id, ...values } = parsed.data;
    const [row] = await db
      .update(schema.demandAnalysis)
      .set({
        ...values,
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(eq(schema.demandAnalysis.id, id))
      .returning();
    if (!row) return { ok: false, error: "Análise não encontrada" };
    revalidatePath("/analises");
    revalidatePath("/revisao");
    return { ok: true, data: row };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao atualizar análise";
    console.error("[updateAnalysisAction]", err);
    return { ok: false, error: message };
  }
}

export async function setAnalysisStatusAction(
  input: z.infer<typeof setAnalysisStatusSchema>
): Promise<ActionResult<DemandAnalysis>> {
  try {
    const userId = await requireUserId();
    const parsed = setAnalysisStatusSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
    }
    const db = await getDb();
    const [row] = await db
      .update(schema.demandAnalysis)
      .set({
        status: parsed.data.status,
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(eq(schema.demandAnalysis.id, parsed.data.id))
      .returning();
    if (!row) return { ok: false, error: "Análise não encontrada" };
    revalidatePath("/analises");
    revalidatePath("/revisao");
    return { ok: true, data: row };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao atualizar status";
    console.error("[setAnalysisStatusAction]", err);
    return { ok: false, error: message };
  }
}
