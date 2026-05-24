import { z } from "zod";

export const BACKLOG_ITEM_TYPES = ["EPIC", "STORY", "TASK", "SPIKE", "BUG"] as const;
export const IMPACTED_TEAMS = ["DEV", "BUSINESS", "QA", "DESIGN"] as const;
export const PRIORITIES = ["HIGHEST", "HIGH", "MEDIUM", "LOW"] as const;

export const backlogItemSchema = z.object({
  type: z.enum(BACKLOG_ITEM_TYPES),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  team: z.enum(IMPACTED_TEAMS),
  priority: z.enum(PRIORITIES),
  estimate: z.string().min(1).max(40),
  acceptanceCriteria: z.array(z.string().min(1)).min(1).max(15),
});

export const demandAnalystOutputSchema = z.object({
  summary: z.string().min(1).max(3000),
  objectives: z.array(z.string().min(1)).min(1).max(15),
  impactedTeams: z.array(z.enum(IMPACTED_TEAMS)).min(1).max(4),
  assumptions: z.array(z.string()).max(15),
  risks: z.array(z.string()).max(15),
  openQuestions: z.array(z.string()).max(15),
  backlogItems: z.array(backlogItemSchema).min(1).max(30),
});

export type DemandAnalystOutput = z.infer<typeof demandAnalystOutputSchema>;
export type BacklogItem = z.infer<typeof backlogItemSchema>;
