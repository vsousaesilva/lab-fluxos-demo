import { z } from "zod";
import {
  BACKLOG_ITEM_TYPES,
  IMPACTED_TEAMS,
  PRIORITIES,
} from "@/lib/agents/demand-analyst/schema";

export const sprintItemSchema = z.object({
  sourceAnalysisId: z.string().uuid().nullable(),
  type: z.enum(BACKLOG_ITEM_TYPES),
  title: z.string().min(1).max(200),
  team: z.enum(IMPACTED_TEAMS),
  priority: z.enum(PRIORITIES),
  estimate: z.string().min(1).max(40),
  rationale: z.string().min(1).max(800),
});

export const sprintManagerOutputSchema = z.object({
  name: z.string().min(1).max(120),
  goal: z.string().min(1).max(500),
  capacityNotes: z.string().max(1000).optional(),
  items: z.array(sprintItemSchema).min(1).max(40),
  outOfScope: z.array(z.string().min(1)).max(40),
  risks: z.array(z.string().min(1)).max(20),
  definitionOfDone: z.array(z.string().min(1)).min(1).max(20),
});

export type SprintManagerOutput = z.infer<typeof sprintManagerOutputSchema>;
export type SprintItem = z.infer<typeof sprintItemSchema>;
