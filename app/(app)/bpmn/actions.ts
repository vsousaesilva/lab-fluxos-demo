"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db/client";
import { getAuth } from "@/lib/auth";
import type { BpmnDiagram, UserStory } from "@/lib/db/schema";
import { validateFlow } from "@/lib/validator";

const STATUSES = ["DRAFT", "APPROVED", "REJECTED"] as const;

const setStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(STATUSES),
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

export async function listBpmnDiagrams(): Promise<BpmnDiagram[]> {
  const db = await getDb();
  return db
    .select()
    .from(schema.bpmnDiagram)
    .orderBy(desc(schema.bpmnDiagram.createdAt));
}

export async function listApprovedUserStories(): Promise<UserStory[]> {
  const db = await getDb();
  return db
    .select()
    .from(schema.userStory)
    .where(eq(schema.userStory.status, "APPROVED"))
    .orderBy(desc(schema.userStory.createdAt));
}

const updateBpmnSchema = z.object({
  id: z.string().uuid(),
  processName: z.string().min(1).max(200),
  bpmnXml: z.string().min(1).max(500_000),
});

export async function updateBpmnAction(
  input: z.infer<typeof updateBpmnSchema>
): Promise<ActionResult<BpmnDiagram>> {
  try {
    const userId = await requireUserId();
    const parsed = updateBpmnSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
    }
    const outcome = validateFlow(parsed.data.bpmnXml);
    const db = await getDb();
    const [row] = await db
      .update(schema.bpmnDiagram)
      .set({
        processName: parsed.data.processName,
        bpmnXml: parsed.data.bpmnXml,
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
      .where(eq(schema.bpmnDiagram.id, parsed.data.id))
      .returning();
    if (!row) return { ok: false, error: "Diagrama não encontrado" };
    revalidatePath("/bpmn");
    return { ok: true, data: row };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao atualizar diagrama";
    console.error("[updateBpmnAction]", err);
    return { ok: false, error: message };
  }
}

export async function setBpmnStatusAction(
  input: z.infer<typeof setStatusSchema>
): Promise<ActionResult<BpmnDiagram>> {
  try {
    const userId = await requireUserId();
    const parsed = setStatusSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
    }
    const db = await getDb();
    const [row] = await db
      .update(schema.bpmnDiagram)
      .set({
        status: parsed.data.status,
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(eq(schema.bpmnDiagram.id, parsed.data.id))
      .returning();
    if (!row) return { ok: false, error: "Diagrama não encontrado" };
    revalidatePath("/bpmn");
    return { ok: true, data: row };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao atualizar status";
    console.error("[setBpmnStatusAction]", err);
    return { ok: false, error: message };
  }
}
