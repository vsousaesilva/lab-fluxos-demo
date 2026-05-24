"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { and, desc, eq, inArray, like, or, sql } from "drizzle-orm";
import { z } from "zod";
import { generateObject } from "ai";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb, schema } from "@/lib/db/client";
import type {
  ElCategory,
  ElStatus,
  ExpressionLanguage,
  FlowSource,
} from "@/lib/db/schema";
import { getAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/auth/admin";
import { getGeminiModel } from "@/lib/ai/gemini";
import {
  completeAgentJob,
  failAgentJob,
  startAgentJob,
} from "@/lib/ai/agent-job";

async function isCurrentUserAdmin(): Promise<boolean> {
  try {
    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return false;
    return await isAdminEmail(session.user.email);
  } catch {
    return false;
  }
}
import {
  extractElsFromXml,
  getElSnippets,
} from "@/lib/agents/el-describer/extractor";
import {
  EL_DESCRIBER_SYSTEM_PROMPT,
  buildElDescriberUserPrompt,
} from "@/lib/agents/el-describer/prompt";
import { elDescriberOutputSchema } from "@/lib/agents/el-describer/schema";

type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type ElsFilter = {
  status?: ElStatus;
  category?: ElCategory;
  q?: string;
};

function buildElsWhere(filter: ElsFilter) {
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
  return conditions.length > 0 ? and(...conditions) : undefined;
}

type ListElsPage = {
  rows: ExpressionLanguage[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export async function listEls(
  filter: ElsFilter = {},
  page = 1,
  pageSize = 100
): Promise<ListElsPage> {
  const db = await getDb();
  const where = buildElsWhere(filter);
  const safePage = Math.max(1, Math.floor(page));
  const safeSize = Math.min(500, Math.max(10, Math.floor(pageSize)));

  const [countRow] = await db
    .select({ n: sql<number>`count(*)` })
    .from(schema.expressionLanguage)
    .where(where);
  const total = Number(countRow?.n ?? 0);

  const rows = await db
    .select()
    .from(schema.expressionLanguage)
    .where(where)
    .orderBy(
      desc(schema.expressionLanguage.occurrenceCount),
      desc(schema.expressionLanguage.updatedAt)
    )
    .limit(safeSize)
    .offset((safePage - 1) * safeSize);

  return {
    rows,
    total,
    page: safePage,
    pageSize: safeSize,
    totalPages: Math.max(1, Math.ceil(total / safeSize)),
  };
}

/** Retorna todos os IDs de ELs sem objective (respeitando filtros). Usado pelo Batch Describe. */
export async function listElIdsWithoutObjective(
  filter: ElsFilter = {}
): Promise<string[]> {
  const db = await getDb();
  const where = buildElsWhere(filter);
  const rows = await db
    .select({ id: schema.expressionLanguage.id })
    .from(schema.expressionLanguage)
    .where(
      where
        ? and(
            where,
            or(
              sql`${schema.expressionLanguage.objective} is null`,
              sql`trim(${schema.expressionLanguage.objective}) = ''`
            )!
          )
        : or(
            sql`${schema.expressionLanguage.objective} is null`,
            sql`trim(${schema.expressionLanguage.objective}) = ''`
          )
    );
  return rows.map((r) => r.id);
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

// ============================================================
// Auto-extração: lê XMLs do R2, regex pra encontrar ELs, popula
// expression_language + expression_language_occurrence.
// Não usa LLM (rápido, sem custo). IA fica no describeElAction.
// ============================================================

export type ExtractElsResult = {
  processedFlows: number;
  skippedFlows: number;
  uniqueEls: number;
  createdEls: number;
  updatedEls: number;
  totalOccurrences: number;
  durationMs: number;
};

// D1/SQLite limita ~100 binds por query. Dimensionamos por op:
//   - SELECT/DELETE com `IN (...)`: 1 bind por valor → CHUNK 80
//   - INSERT expression_language: 6 binds por linha → CHUNK 15 (90 binds)
//   - INSERT expression_language_occurrence: 5 binds por linha → CHUNK 18 (90 binds)
const CHUNK_LOOKUP = 80;
const CHUNK_INSERT_EL = 15;
const CHUNK_INSERT_OCC = 18;

export async function extractElsFromFlowsAction(): Promise<
  ActionResult<ExtractElsResult>
> {
  const t0 = Date.now();
  try {
    const { env } = await getCloudflareContext({ async: true });
    const r2 = env.XML_STORAGE;
    if (!r2) {
      return { ok: false, error: "Bucket R2 XML_STORAGE não configurado." };
    }

    const db = await getDb();
    const flows = await db.select().from(schema.flowSource);

    // 1) Lê todos os XMLs e agrega ELs em memória
    type Agg = { total: number; perFlow: Map<string, number> };
    const agg = new Map<string, Agg>();
    let processedFlows = 0;
    let skippedFlows = 0;

    for (const f of flows) {
      if (!f.r2Key) {
        skippedFlows++;
        continue;
      }
      const obj = await r2.get(f.r2Key);
      if (!obj) {
        skippedFlows++;
        continue;
      }
      const xml = await obj.text();
      const els = extractElsFromXml(xml);
      for (const el of els) {
        let a = agg.get(el.code);
        if (!a) {
          a = { total: 0, perFlow: new Map() };
          agg.set(el.code, a);
        }
        a.total += el.count;
        a.perFlow.set(f.id, el.count);
      }
      processedFlows++;
    }

    if (agg.size === 0) {
      return {
        ok: true,
        data: {
          processedFlows,
          skippedFlows,
          uniqueEls: 0,
          createdEls: 0,
          updatedEls: 0,
          totalOccurrences: 0,
          durationMs: Date.now() - t0,
        },
      };
    }

    const allCodes = [...agg.keys()];

    // 2) Descobre quais ELs já existem.
    //    D1/SQLite tem ~100 binds por query, então chunkamos o IN (...).
    const idByCode = new Map<string, string>();
    const existingCodes: { id: string; code: string }[] = [];
    for (let i = 0; i < allCodes.length; i += CHUNK_LOOKUP) {
      const slice = allCodes.slice(i, i + CHUNK_LOOKUP);
      const found = await db
        .select({
          id: schema.expressionLanguage.id,
          code: schema.expressionLanguage.code,
        })
        .from(schema.expressionLanguage)
        .where(inArray(schema.expressionLanguage.code, slice));
      for (const f of found) {
        idByCode.set(f.code, f.id);
        existingCodes.push(f);
      }
    }

    // 3) Insert das novas em chunks
    let createdEls = 0;
    const newCodes = allCodes.filter((c) => !idByCode.has(c));
    for (let i = 0; i < newCodes.length; i += CHUNK_INSERT_EL) {
      const slice = newCodes.slice(i, i + CHUNK_INSERT_EL);
      const inserted = await db
        .insert(schema.expressionLanguage)
        .values(
          slice.map((code) => ({
            code,
            occurrenceCount: agg.get(code)!.total,
          }))
        )
        .returning({
          id: schema.expressionLanguage.id,
          code: schema.expressionLanguage.code,
        });
      for (const row of inserted) {
        idByCode.set(row.code, row.id);
        createdEls++;
      }
    }

    // 4) Update occurrenceCount das existentes (uma por uma — ok, são poucas)
    let updatedEls = 0;
    for (const e of existingCodes) {
      const a = agg.get(e.code);
      if (!a) continue;
      await db
        .update(schema.expressionLanguage)
        .set({ occurrenceCount: a.total, updatedAt: new Date() })
        .where(eq(schema.expressionLanguage.id, e.id));
      updatedEls++;
    }

    // 5) Replace ocorrências: deleta as existentes pras ELs envolvidas,
    //    depois insere as novas em chunks.
    const allElIds = [...idByCode.values()];
    for (let i = 0; i < allElIds.length; i += CHUNK_LOOKUP) {
      const slice = allElIds.slice(i, i + CHUNK_LOOKUP);
      await db
        .delete(schema.expressionLanguageOccurrence)
        .where(
          inArray(
            schema.expressionLanguageOccurrence.expressionLanguageId,
            slice
          )
        );
    }

    type OccRow = {
      expressionLanguageId: string;
      flowSourceId: string;
      count: number;
    };
    const occRows: OccRow[] = [];
    for (const [code, a] of agg.entries()) {
      const elId = idByCode.get(code);
      if (!elId) continue;
      for (const [flowId, count] of a.perFlow.entries()) {
        occRows.push({
          expressionLanguageId: elId,
          flowSourceId: flowId,
          count,
        });
      }
    }

    for (let i = 0; i < occRows.length; i += CHUNK_INSERT_OCC) {
      const slice = occRows.slice(i, i + CHUNK_INSERT_OCC);
      await db.insert(schema.expressionLanguageOccurrence).values(slice);
    }

    revalidatePath("/catalogos/els");

    return {
      ok: true,
      data: {
        processedFlows,
        skippedFlows,
        uniqueEls: agg.size,
        createdEls,
        updatedEls,
        totalOccurrences: occRows.length,
        durationMs: Date.now() - t0,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro na extração";
    console.error("[extractElsFromFlowsAction]", err);
    return { ok: false, error: message };
  }
}

// ============================================================
// Descrever 1 EL com IA — busca snippets dos XMLs onde aparece,
// chama Gemini Flash e salva objective/category/tags.
// Cada chamada gera um AgentJob com tokens pra auditoria.
// ============================================================

export async function describeElAction(
  input: z.infer<typeof idSchema>
): Promise<ActionResult<ExpressionLanguage>> {
  if (!(await isCurrentUserAdmin())) {
    return {
      ok: false,
      error: "Apenas administradores podem disparar IA no catálogo de ELs.",
    };
  }
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "ID inválido" };

  const db = await getDb();
  const el = await db.query.expressionLanguage.findFirst({
    where: eq(schema.expressionLanguage.id, parsed.data.id),
  });
  if (!el) return { ok: false, error: "EL não encontrada" };

  const { env } = await getCloudflareContext({ async: true });
  const r2 = env.XML_STORAGE;

  // Busca os fluxos onde aparece + nomes + alguns snippets (até 3 fluxos amostrados)
  const occs = await db
    .select({
      flowSourceId: schema.expressionLanguageOccurrence.flowSourceId,
      r2Key: schema.flowSource.r2Key,
      processName: schema.flowSource.processName,
      count: schema.expressionLanguageOccurrence.count,
    })
    .from(schema.expressionLanguageOccurrence)
    .innerJoin(
      schema.flowSource,
      eq(
        schema.flowSource.id,
        schema.expressionLanguageOccurrence.flowSourceId
      )
    )
    .where(
      eq(schema.expressionLanguageOccurrence.expressionLanguageId, el.id)
    )
    .orderBy(desc(schema.expressionLanguageOccurrence.count));

  const processNames = occs.map((o) => o.processName);
  const totalOccurrences = occs.reduce((s, o) => s + o.count, 0);

  // Pega snippets dos 3 fluxos com mais ocorrências
  const snippets: string[] = [];
  if (r2) {
    for (const o of occs.slice(0, 3)) {
      if (!o.r2Key) continue;
      try {
        const obj = await r2.get(o.r2Key);
        if (!obj) continue;
        const xml = await obj.text();
        snippets.push(...getElSnippets(xml, el.code, 2));
        if (snippets.length >= 6) break;
      } catch (err) {
        console.warn("[describeElAction] falha ao ler R2", o.r2Key, err);
      }
    }
  }

  const { model, modelId } = await getGeminiModel("flash");
  const job = await startAgentJob({
    agentType: "EL_DESCRIBER",
    inputSummary: `${el.code.slice(0, 60)} — ${processNames.length} fluxos`,
    llmProvider: "google",
    llmModel: modelId,
  });

  try {
    const result = await generateObject({
      model,
      schema: elDescriberOutputSchema,
      system: EL_DESCRIBER_SYSTEM_PROMPT,
      prompt: buildElDescriberUserPrompt({
        code: el.code,
        snippets,
        processNames,
        totalOccurrences,
      }),
      temperature: 0.2,
    });

    const now = new Date();
    const [updated] = await db
      .update(schema.expressionLanguage)
      .set({
        objective: result.object.objective,
        category: result.object.category,
        tags: result.object.tags,
        updatedAt: now,
      })
      .where(eq(schema.expressionLanguage.id, el.id))
      .returning();

    await completeAgentJob(job.id, {
      outputSummary: `${result.object.category} — ${result.object.objective.slice(0, 80)}`,
      promptTokens: result.usage?.promptTokens ?? 0,
      completionTokens: result.usage?.completionTokens ?? 0,
    });

    revalidatePath("/catalogos/els");
    revalidatePath(`/catalogos/els/${el.id}`);
    return { ok: true, data: updated };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro na descrição";
    await failAgentJob(job.id, message);
    console.error("[describeElAction]", err);
    return { ok: false, error: message };
  }
}

// ============================================================
// Descrever lote de ELs em paralelo (até 5 por call, pra caber
// no CPU time do Worker). O frontend chunka a lista total.
// ============================================================

const batchSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(5),
});

export async function describeElsBatchAction(
  input: z.infer<typeof batchSchema>
): Promise<
  ActionResult<{ ok: number; failed: number; errors: string[] }>
> {
  if (!(await isCurrentUserAdmin())) {
    return {
      ok: false,
      error: "Apenas administradores podem disparar IA no catálogo de ELs.",
    };
  }
  const parsed = batchSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Lote inválido (1–5 ids por chamada)." };
  }

  const settled = await Promise.allSettled(
    parsed.data.ids.map((id) => describeElAction({ id }))
  );

  let okCount = 0;
  let failCount = 0;
  const errors: string[] = [];

  for (const r of settled) {
    if (r.status === "rejected") {
      failCount++;
      errors.push(String(r.reason));
      continue;
    }
    // fulfilled aqui — narrowing direto pelo discriminator `ok`
    if (r.value.ok) {
      okCount++;
    } else {
      failCount++;
      errors.push(r.value.error);
    }
  }

  return { ok: true, data: { ok: okCount, failed: failCount, errors } };
}
