import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db/client";
import {
  startAgentJob,
  completeAgentJob,
  failAgentJob,
} from "@/lib/ai/agent-job";
import { createJiraIssue } from "./client";
import type {
  BacklogItem,
  JiraCard,
  JiraSourceType,
  SprintItem,
} from "@/lib/db/schema";

export type SyncOutcome = {
  cardsTotal: number;
  synced: number;
  failed: number;
  skipped: number;
};

const MAP_TYPE: Record<string, string> = {
  EPIC: "Epic",
  STORY: "Story",
  BUG: "Bug",
  TASK: "Task",
  SPIKE: "Task",
};

function mapIssueType(type: string | null | undefined): string {
  if (!type) return "Task";
  return MAP_TYPE[type.toUpperCase()] ?? "Task";
}

function safeSummary(value: string | null | undefined): string {
  const v = !value || value.trim().length === 0 ? "(sem título)" : value;
  return v.length > 255 ? v.slice(0, 255) : v;
}

function describeBacklogItem(item: BacklogItem): string {
  const lines: string[] = [];
  if (item.description) {
    lines.push(item.description);
    lines.push("");
  }
  lines.push(
    `Time: ${item.team} | Prioridade: ${item.priority} | Estimativa: ${item.estimate}`
  );
  if (item.acceptanceCriteria && item.acceptanceCriteria.length > 0) {
    lines.push("");
    lines.push("Critérios de aceite:");
    for (const c of item.acceptanceCriteria) lines.push(`- ${c}`);
  }
  return lines.join("\n");
}

function describeSprintItem(item: SprintItem): string {
  const lines: string[] = [];
  lines.push(
    `Time: ${item.team} | Prioridade: ${item.priority} | Estimativa: ${item.estimate}`
  );
  if (item.rationale && item.rationale.trim()) {
    lines.push("");
    lines.push(`Por que entra na sprint: ${item.rationale}`);
  }
  return lines.join("\n");
}

/** Enfileira card idempotente (UNIQUE em sourceType+sourceId+sourceRef). */
async function enqueueCard(opts: {
  sourceType: JiraSourceType;
  sourceId: string;
  sourceRef: string;
  issueType: string;
  summary: string;
  description: string;
  agentJobId: string;
  userId?: string;
}): Promise<JiraCard | null> {
  const db = await getDb();
  const existing = await db.query.jiraCard.findFirst({
    where: and(
      eq(schema.jiraCard.sourceType, opts.sourceType),
      eq(schema.jiraCard.sourceId, opts.sourceId),
      eq(schema.jiraCard.sourceRef, opts.sourceRef)
    ),
  });
  if (existing) return null; // idempotente

  const [row] = await db
    .insert(schema.jiraCard)
    .values({
      sourceType: opts.sourceType,
      sourceId: opts.sourceId,
      sourceRef: opts.sourceRef,
      issueType: opts.issueType,
      summary: safeSummary(opts.summary),
      description: opts.description,
      agentJobId: opts.agentJobId,
      createdBy: opts.userId ?? null,
      updatedBy: opts.userId ?? null,
    })
    .returning();
  return row;
}

/**
 * Tenta criar todos os cards NOT_SYNCED de uma fonte no Jira.
 * Atualiza syncStatus, issueKey e cria jira_sync_operation por tentativa.
 */
async function dispatchPending(
  sourceType: JiraSourceType,
  sourceId: string,
  userId?: string
): Promise<{ synced: number; failed: number }> {
  const db = await getDb();
  const pending = await db
    .select()
    .from(schema.jiraCard)
    .where(
      and(
        eq(schema.jiraCard.sourceType, sourceType),
        eq(schema.jiraCard.sourceId, sourceId),
        eq(schema.jiraCard.syncStatus, "NOT_SYNCED")
      )
    );

  let synced = 0;
  let failed = 0;

  for (const card of pending) {
    // Marca SYNCING + insere operation
    await db
      .update(schema.jiraCard)
      .set({
        syncStatus: "SYNCING",
        updatedAt: new Date(),
        updatedBy: userId ?? null,
      })
      .where(eq(schema.jiraCard.id, card.id));

    const [op] = await db
      .insert(schema.jiraSyncOperation)
      .values({
        jiraCardId: card.id,
        operationType: "CREATE",
        status: "PENDING",
        attempts: 1,
        createdBy: userId ?? null,
        updatedBy: userId ?? null,
      })
      .returning();

    try {
      const result = await createJiraIssue({
        summary: card.summary,
        description: card.description,
        issueType: card.issueType,
      });
      await db
        .update(schema.jiraCard)
        .set({
          syncStatus: "SYNCED",
          issueKey: result.key,
          updatedAt: new Date(),
          updatedBy: userId ?? null,
        })
        .where(eq(schema.jiraCard.id, card.id));
      await db
        .update(schema.jiraSyncOperation)
        .set({
          status: "COMPLETED",
          updatedAt: new Date(),
          updatedBy: userId ?? null,
        })
        .where(eq(schema.jiraSyncOperation.id, op.id));
      synced++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await db
        .update(schema.jiraCard)
        .set({
          syncStatus: "FAILED",
          updatedAt: new Date(),
          updatedBy: userId ?? null,
        })
        .where(eq(schema.jiraCard.id, card.id));
      await db
        .update(schema.jiraSyncOperation)
        .set({
          status: "FAILED",
          errorMessage: message.slice(0, 2000),
          updatedAt: new Date(),
          updatedBy: userId ?? null,
        })
        .where(eq(schema.jiraSyncOperation.id, op.id));
      failed++;
    }
  }

  return { synced, failed };
}

async function summarizeOutcome(
  sourceType: JiraSourceType,
  sourceId: string
): Promise<SyncOutcome> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.jiraCard)
    .where(
      and(
        eq(schema.jiraCard.sourceType, sourceType),
        eq(schema.jiraCard.sourceId, sourceId)
      )
    );
  return {
    cardsTotal: rows.length,
    synced: rows.filter((r) => r.syncStatus === "SYNCED").length,
    failed: rows.filter((r) => r.syncStatus === "FAILED").length,
    skipped: rows.filter((r) => r.syncStatus === "NOT_SYNCED").length,
  };
}

export async function syncAnalysisToJira(opts: {
  analysisId: string;
  userId?: string;
}): Promise<SyncOutcome> {
  const db = await getDb();
  const analysis = await db.query.demandAnalysis.findFirst({
    where: eq(schema.demandAnalysis.id, opts.analysisId),
  });
  if (!analysis) throw new Error("Análise não encontrada");
  if (analysis.status !== "APPROVED") {
    throw new Error(
      "A análise precisa estar APPROVED para sincronizar com o Jira."
    );
  }

  const job = await startAgentJob({
    agentType: "JIRA_SYNCHRONIZER",
    inputSummary: `analysis:${opts.analysisId.slice(0, 8)}`,
    llmProvider: "jira",
    llmModel: "jira-api-v3",
    userId: opts.userId,
  });

  try {
    let idx = 0;
    for (const item of analysis.backlogItems) {
      await enqueueCard({
        sourceType: "DEMAND_ANALYSIS",
        sourceId: opts.analysisId,
        sourceRef: `ITEM-${idx}`,
        issueType: mapIssueType(item.type),
        summary: item.title,
        description: describeBacklogItem(item),
        agentJobId: job.id,
        userId: opts.userId,
      });
      idx++;
    }

    await dispatchPending("DEMAND_ANALYSIS", opts.analysisId, opts.userId);
    const outcome = await summarizeOutcome("DEMAND_ANALYSIS", opts.analysisId);

    await completeAgentJob(job.id, {
      outputSummary: `${outcome.cardsTotal} card(s): ${outcome.synced} sincronizado(s), ${outcome.failed} falha(s)`,
    });
    return outcome;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await failAgentJob(job.id, message);
    throw err;
  }
}

export async function syncSprintToJira(opts: {
  sprintId: string;
  userId?: string;
}): Promise<SyncOutcome> {
  const db = await getDb();
  const sprint = await db.query.sprint.findFirst({
    where: eq(schema.sprint.id, opts.sprintId),
  });
  if (!sprint) throw new Error("Sprint não encontrada");
  if (sprint.status !== "APPROVED") {
    throw new Error(
      "A sprint precisa estar APPROVED para sincronizar com o Jira."
    );
  }

  const job = await startAgentJob({
    agentType: "JIRA_SYNCHRONIZER",
    inputSummary: `sprint:${opts.sprintId.slice(0, 8)}`,
    llmProvider: "jira",
    llmModel: "jira-api-v3",
    userId: opts.userId,
  });

  try {
    let idx = 0;
    for (const item of sprint.items) {
      await enqueueCard({
        sourceType: "SPRINT",
        sourceId: opts.sprintId,
        sourceRef: `ITEM-${idx}`,
        issueType: mapIssueType(item.type),
        summary: item.title,
        description: describeSprintItem(item),
        agentJobId: job.id,
        userId: opts.userId,
      });
      idx++;
    }

    await dispatchPending("SPRINT", opts.sprintId, opts.userId);
    const outcome = await summarizeOutcome("SPRINT", opts.sprintId);

    await completeAgentJob(job.id, {
      outputSummary: `${outcome.cardsTotal} card(s): ${outcome.synced} sincronizado(s), ${outcome.failed} falha(s)`,
    });
    return outcome;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await failAgentJob(job.id, message);
    throw err;
  }
}

/** Retentar cards FAILED de uma fonte específica. */
export async function retryFailedCards(opts: {
  sourceType: JiraSourceType;
  sourceId: string;
  userId?: string;
}): Promise<SyncOutcome> {
  const db = await getDb();
  // Reset FAILED → NOT_SYNCED para entrar no dispatch
  await db
    .update(schema.jiraCard)
    .set({
      syncStatus: "NOT_SYNCED",
      updatedAt: new Date(),
      updatedBy: opts.userId ?? null,
    })
    .where(
      and(
        eq(schema.jiraCard.sourceType, opts.sourceType),
        eq(schema.jiraCard.sourceId, opts.sourceId),
        eq(schema.jiraCard.syncStatus, "FAILED")
      )
    );

  await dispatchPending(opts.sourceType, opts.sourceId, opts.userId);
  return summarizeOutcome(opts.sourceType, opts.sourceId);
}
