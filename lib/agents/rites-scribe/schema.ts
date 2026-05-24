import { z } from "zod";

export const CEREMONY_TYPES = ["PLANNING", "REVIEW", "RETRO", "STANDUP"] as const;
export type CeremonyTypeValue = (typeof CEREMONY_TYPES)[number];

export const ceremonySectionSchema = z.object({
  title: z.string().min(1).max(120),
  items: z.array(z.string().min(1)).min(0).max(30),
});

export const actionItemSchema = z.object({
  description: z.string().min(1).max(500),
  owner: z.string().min(1).max(120),
  dueDate: z.string().min(1).max(50),
});

export const ritesScribeOutputSchema = z.object({
  title: z.string().min(1).max(200),
  summary: z.string().min(1).max(2000),
  participants: z.array(z.string().min(1)).max(40),
  sections: z.array(ceremonySectionSchema).min(1).max(10),
  actionItems: z.array(actionItemSchema).max(30),
});

export type RitesScribeOutput = z.infer<typeof ritesScribeOutputSchema>;
export type CeremonySection = z.infer<typeof ceremonySectionSchema>;
export type ActionItem = z.infer<typeof actionItemSchema>;
