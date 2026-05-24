"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db/client";
import { getAuth } from "@/lib/auth";
import type { GeneratedFlow, UserStory } from "@/lib/db/schema";
import { validateFlow } from "@/lib/validator";

const GENERATED_FLOW_STATUSES = ["DRAFT", "APPROVED", "REJECTED"] as const;

const setStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(GENERATED_FLOW_STATUSES),
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

export async function listGeneratedFlows(): Promise<GeneratedFlow[]> {
  const db = await getDb();
  return db
    .select()
    .from(schema.generatedFlow)
    .orderBy(desc(schema.generatedFlow.createdAt));
}

export async function listApprovedUserStories(): Promise<UserStory[]> {
  const db = await getDb();
  return db
    .select()
    .from(schema.userStory)
    .where(eq(schema.userStory.status, "APPROVED"))
    .orderBy(desc(schema.userStory.createdAt));
}

const updateGeneratedFlowSchema = z.object({
  id: z.string().uuid(),
  processName: z.string().min(1).max(200),
  xml: z.string().min(1).max(500_000),
});

export async function updateGeneratedFlowAction(
  input: z.infer<typeof updateGeneratedFlowSchema>
): Promise<ActionResult<GeneratedFlow>> {
  try {
    const userId = await requireUserId();
    const parsed = updateGeneratedFlowSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
    }
    const outcome = validateFlow(parsed.data.xml);
    const db = await getDb();
    const [row] = await db
      .update(schema.generatedFlow)
      .set({
        processName: parsed.data.processName,
        xml: parsed.data.xml,
        validationResult: outcome.passed ? "PASSED" : "FAILED",
        errorCount: outcome.errorCount,
        warningCount: outcome.warningCount,
        infoCount: outcome.infoCount,
        findings: outcome.findings.map((f) => ({
          code: f.ruleCode,
          severity: f.severity,
          message: f.message,
          nodeKey: f.location ?? undefined,
        })),
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(eq(schema.generatedFlow.id, parsed.data.id))
      .returning();
    if (!row) return { ok: false, error: "Fluxo não encontrado" };
    revalidatePath("/gerador-xml");
    return { ok: true, data: row };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao atualizar fluxo";
    console.error("[updateGeneratedFlowAction]", err);
    return { ok: false, error: message };
  }
}

export async function setGeneratedFlowStatusAction(
  input: z.infer<typeof setStatusSchema>
): Promise<ActionResult<GeneratedFlow>> {
  try {
    const userId = await requireUserId();
    const parsed = setStatusSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
    }
    const db = await getDb();
    const [row] = await db
      .update(schema.generatedFlow)
      .set({
        status: parsed.data.status,
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(eq(schema.generatedFlow.id, parsed.data.id))
      .returning();
    if (!row) return { ok: false, error: "Fluxo não encontrado" };
    revalidatePath("/gerador-xml");
    return { ok: true, data: row };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao atualizar status";
    console.error("[setGeneratedFlowStatusAction]", err);
    return { ok: false, error: message };
  }
}
