import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db/client";
import type { AgentJob, AgentType } from "@/lib/db/schema";

export type StartAgentJobOptions = {
  agentType: AgentType;
  inputSummary?: string;
  llmProvider?: string;
  llmModel?: string;
  userId?: string;
};

export async function startAgentJob(
  opts: StartAgentJobOptions
): Promise<AgentJob> {
  const db = await getDb();
  const now = new Date();
  const [row] = await db
    .insert(schema.agentJob)
    .values({
      agentType: opts.agentType,
      status: "RUNNING",
      inputSummary: opts.inputSummary ?? null,
      llmProvider: opts.llmProvider ?? "google",
      llmModel: opts.llmModel ?? null,
      startedAt: now,
      createdBy: opts.userId ?? null,
      updatedBy: opts.userId ?? null,
    })
    .returning();
  return row;
}

export type CompleteAgentJobOptions = {
  outputSummary?: string;
  promptTokens?: number;
  completionTokens?: number;
};

export async function completeAgentJob(
  jobId: string,
  opts: CompleteAgentJobOptions = {}
): Promise<void> {
  const db = await getDb();
  await db
    .update(schema.agentJob)
    .set({
      status: "SUCCESS",
      outputSummary: opts.outputSummary ?? null,
      promptTokens: opts.promptTokens ?? 0,
      completionTokens: opts.completionTokens ?? 0,
      finishedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(schema.agentJob.id, jobId));
}

export type FailAgentJobOptions = {
  promptTokens?: number;
  completionTokens?: number;
};

export async function failAgentJob(
  jobId: string,
  errorMessage: string,
  opts: FailAgentJobOptions = {}
): Promise<void> {
  const db = await getDb();
  await db
    .update(schema.agentJob)
    .set({
      status: "FAILED",
      errorMessage: errorMessage.slice(0, 2000),
      promptTokens: opts.promptTokens ?? 0,
      completionTokens: opts.completionTokens ?? 0,
      finishedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(schema.agentJob.id, jobId));
}
