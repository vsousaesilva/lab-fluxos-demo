"use server";

import { revalidatePath } from "next/cache";
import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/lib/db/client";
import type {
  ElCategory,
  ElStatus,
  ExpressionLanguage,
  FlowSource,
} from "@/lib/db/schema";

type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type ElsFilter = {
  status?: ElStatus;
  category?: ElCategory;
  q?: string;
};

export async function listEls(
  filter: ElsFilter = {},
  limit = 200
): Promise<ExpressionLanguage[]> {
  const db = await getDb();
  const conditions = [];
  if (filter.status) conditions.push(eq(schema.expressionLanguage.status, filter.status));
  if (filter.category)
    conditions.push(eq(schema.expressionLanguage.category, filter.category));
  if (filter.q && filter.q.trim()) {
    const pattern = `%${filter.q.trim()}%`;
    conditions.push(
      or(
        like(schema.expressionLanguage.code, pattern),
        like(schema.expressionLanguage.objective, pattern)
      )!
    );
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  return db
    .select()
    .from(schema.expressionLanguage)
    .where(where)
    .orderBy(
      desc(schema.expressionLanguage.occurrenceCount),
      desc(schema.expressionLanguage.updatedAt)
    )
    .limit(limit);
}

export type ElMetrics = {
  total: number;
  byStatus: Record<ElStatus, number>;
  byCategory: Record<string, number>;
  withoutObjective: number;
};

export async function getElMetrics(): Promise<ElMetrics> {
  const db = await getDb();
  const [row] = await db
    .select({
      total: sql<number>`count(*)`,
      ativos: sql<number>`sum(case when status='ATIVO' then 1 else 0 end)`,
      deprecados: sql<number>`sum(case when status='DEPRECADO' then 1 else 0 end)`,
      experimentais: sql<number>`sum(case when status='EXPERIMENTAL' then 1 else 0 end)`,
      withoutObjective: sql<number>`sum(case when objective is null or trim(objective)='' then 1 else 0 end)`,
    })
    .from(schema.expressionLanguage);

  const cats = await db
    .select({
      category: schema.expressionLanguage.category,
      n: sql<number>`count(*)`,
    })
    .from(schema.expressionLanguage)
    .groupBy(schema.expressionLanguage.category);

  const byCategory: Record<string, number> = {};
  for (const c of cats) {
    byCategory[c.category ?? "sem-categoria"] = Number(c.n);
  }

  return {
    total: Number(row?.total ?? 0),
    byStatus: {
      ATIVO: Number(row?.ativos ?? 0),
      DEPRECADO: Number(row?.deprecados ?? 0),
      EXPERIMENTAL: Number(row?.experimentais ?? 0),
    },
    byCategory,
    withoutObjective: Number(row?.withoutObjective ?? 0),
  };
}

export async function getEl(id: string): Promise<{
  el: ExpressionLanguage | null;
  flows: Array<Pick<FlowSource, "id" | "processName" | "fileName"> & { count: number }>;
}> {
  const db = await getDb();
  const el = await db.query.expressionLanguage.findFirst({
    where: eq(schema.expressionLanguage.id, id),
  });
  if (!el) return { el: null, flows: [] };

  const flowsRaw = await db
    .select({
      id: schema.flowSource.id,
      processName: schema.flowSource.processName,
      fileName: schema.flowSource.fileName,
      count: schema.expressionLanguageOccurrence.count,
    })
    .from(schema.expressionLanguageOccurrence)
    .innerJoin(
      schema.flowSource,
      eq(schema.flowSource.id, schema.expressionLanguageOccurrence.flowSourceId)
    )
    .where(eq(schema.expressionLanguageOccurrence.expressionLanguageId, id))
    .orderBy(desc(schema.expressionLanguageOccurrence.count));

  return { el, flows: flowsRaw };
}

const CATEGORIES = ["ASSINATURA", "TAREFA", "DECISAO", "DADO", "OUTRO"] as const;
const STATUSES = ["ATIVO", "DEPRECADO", "EXPERIMENTAL"] as const;

const createSchema = z.object({
  code: z.string().trim().min(1, "Código obrigatório").max(500),
  objective: z.string().trim().max(2000).optional().or(z.literal("")),
  category: z.enum(CATEGORIES).optional(),
  tags: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
  status: z.enum(STATUSES).default("ATIVO"),
});

export async function createElAction(
  input: z.infer<typeof createSchema>
): Promise<ActionResult<ExpressionLanguage>> {
  try {
    const parsed = createSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
    }
    const db = await getDb();
    const exists = await db.query.expressionLanguage.findFirst({
      where: eq(schema.expressionLanguage.code, parsed.data.code),
    });
    if (exists) return { ok: false, error: "EL com esse código já existe." };

    const [row] = await db
      .insert(schema.expressionLanguage)
      .values({
        code: parsed.data.code,
        objective: parsed.data.objective || null,
        category: parsed.data.category ?? null,
        tags: parsed.data.tags ?? [],
        status: parsed.data.status,
      })
      .returning();

    revalidatePath("/catalogos/els");
    return { ok: true, data: row };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao criar EL";
    console.error("[createElAction]", err);
    return { ok: false, error: message };
  }
}

const updateSchema = z.object({
  id: z.string().uuid(),
  objective: z.string().trim().max(2000).optional().or(z.literal("")),
  category: z.enum(CATEGORIES).optional(),
  tags: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
  status: z.enum(STATUSES).optional(),
});

export async function updateElAction(
  input: z.infer<typeof updateSchema>
): Promise<ActionResult<ExpressionLanguage>> {
  try {
    const parsed = updateSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
    }
    const db = await getDb();
    const now = new Date();
    const [row] = await db
      .update(schema.expressionLanguage)
      .set({
        objective: parsed.data.objective ?? undefined,
        category: parsed.data.category ?? undefined,
        tags: parsed.data.tags ?? undefined,
        status: parsed.data.status ?? undefined,
        updatedAt: now,
      })
      .where(eq(schema.expressionLanguage.id, parsed.data.id))
      .returning();
    if (!row) return { ok: false, error: "EL não encontrada" };

    revalidatePath("/catalogos/els");
    revalidatePath(`/catalogos/els/${parsed.data.id}`);
    return { ok: true, data: row };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao atualizar";
    console.error("[updateElAction]", err);
    return { ok: false, error: message };
  }
}

const idSchema = z.object({ id: z.string().uuid() });

export async function deleteElAction(
  input: z.infer<typeof idSchema>
): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = idSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "ID inválido" };
    const db = await getDb();
    await db
      .delete(schema.expressionLanguage)
      .where(eq(schema.expressionLanguage.id, parsed.data.id));
    revalidatePath("/catalogos/els");
    return { ok: true, data: { id: parsed.data.id } };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao excluir";
    console.error("[deleteElAction]", err);
    return { ok: false, error: message };
  }
}

// Stub: extração automática + IA virá no próximo release.
export async function extractElsFromFlowsAction(): Promise<ActionResult<{ status: string }>> {
  return {
    ok: false,
    error:
      "Em breve: auto-extração dos 212 XMLs + descrição via Gemini. Por enquanto, cadastre manualmente com 'Nova EL'.",
  };
}
