"use server";

import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db/client";
import type {
  DemandAnalysis,
  JiraCard,
  Sprint,
} from "@/lib/db/schema";

export async function listApprovedAnalyses(): Promise<DemandAnalysis[]> {
  const db = await getDb();
  return db
    .select()
    .from(schema.demandAnalysis)
    .where(eq(schema.demandAnalysis.status, "APPROVED"))
    .orderBy(desc(schema.demandAnalysis.createdAt));
}

export async function listApprovedSprints(): Promise<Sprint[]> {
  const db = await getDb();
  return db
    .select()
    .from(schema.sprint)
    .where(eq(schema.sprint.status, "APPROVED"))
    .orderBy(desc(schema.sprint.createdAt));
}

export async function listJiraCards(limit = 200): Promise<JiraCard[]> {
  const db = await getDb();
  return db
    .select()
    .from(schema.jiraCard)
    .orderBy(desc(schema.jiraCard.createdAt))
    .limit(limit);
}
