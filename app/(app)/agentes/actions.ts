"use server";

import { and, desc, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db/client";
import type { AgentJob, AgentJobStatus, AgentType } from "@/lib/db/schema";

export type JobsFilter = {
  status?: AgentJobStatus;
  agentType?: AgentType;
};

export async function listAgentJobs(
  filter: JobsFilter = {},
  limit = 100
): Promise<AgentJob[]> {
  const db = await getDb();
  const conditions = [];
  if (filter.status) conditions.push(eq(schema.agentJob.status, filter.status));
  if (filter.agentType)
    conditions.push(eq(schema.agentJob.agentType, filter.agentType));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  return db
    .select()
    .from(schema.agentJob)
    .where(where)
    .orderBy(desc(schema.agentJob.startedAt), desc(schema.agentJob.createdAt))
    .limit(limit);
}

export type AgentMetrics = {
  totalJobs: number;
  successCount: number;
  failedCount: number;
  runningCount: number;
  pendingCount: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  successRate: number; // 0..1 (entre finalizados)
};

export async function getAgentMetrics(
  filter: JobsFilter = {}
): Promise<AgentMetrics> {
  const db = await getDb();
  const conditions = [];
  if (filter.status) conditions.push(eq(schema.agentJob.status, filter.status));
  if (filter.agentType)
    conditions.push(eq(schema.agentJob.agentType, filter.agentType));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [row] = await db
    .select({
      totalJobs: sql<number>`count(*)`,
      successCount: sql<number>`sum(case when status='SUCCESS' then 1 else 0 end)`,
      failedCount: sql<number>`sum(case when status='FAILED' then 1 else 0 end)`,
      runningCount: sql<number>`sum(case when status='RUNNING' then 1 else 0 end)`,
      pendingCount: sql<number>`sum(case when status='PENDING' then 1 else 0 end)`,
      totalPromptTokens: sql<number>`coalesce(sum(prompt_tokens), 0)`,
      totalCompletionTokens: sql<number>`coalesce(sum(completion_tokens), 0)`,
    })
    .from(schema.agentJob)
    .where(where);

  const finalized = (row?.successCount ?? 0) + (row?.failedCount ?? 0);
  return {
    totalJobs: Number(row?.totalJobs ?? 0),
    successCount: Number(row?.successCount ?? 0),
    failedCount: Number(row?.failedCount ?? 0),
    runningCount: Number(row?.runningCount ?? 0),
    pendingCount: Number(row?.pendingCount ?? 0),
    totalPromptTokens: Number(row?.totalPromptTokens ?? 0),
    totalCompletionTokens: Number(row?.totalCompletionTokens ?? 0),
    successRate: finalized > 0 ? Number(row?.successCount ?? 0) / finalized : 0,
  };
}
