import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db/client";
import { runStreamingAgent } from "@/lib/ai";
import {
  RITES_SCRIBE_SYSTEM_PROMPT,
  buildRitesScribeUserPrompt,
} from "./prompt";
import { ritesScribeOutputSchema, type CeremonyTypeValue } from "./schema";

export type RunRitesScribeInput = {
  type: CeremonyTypeValue;
  occurredOn: string; // YYYY-MM-DD
  sprintId?: string | null;
  rawNotes: string;
  additionalContext?: string;
  userId?: string;
  /** Se informado, substitui o registro existente (regenerar). */
  replaceCeremonyId?: string;
};

export async function runRitesScribe(input: RunRitesScribeInput) {
  if (!input.rawNotes?.trim()) {
    throw new Error("As anotações da cerimônia são obrigatórias.");
  }

  const userPrompt = buildRitesScribeUserPrompt({
    type: input.type,
    rawNotes: input.rawNotes,
    additionalContext: input.additionalContext,
  });

  const inputSummary = `${input.type} em ${input.occurredOn} — ${input.rawNotes.length} chars de anotação${input.replaceCeremonyId ? " (regenerar)" : ""}`;

  return runStreamingAgent({
    agentType: "RITES_SCRIBE",
    schema: ritesScribeOutputSchema,
    systemPrompt: RITES_SCRIBE_SYSTEM_PROMPT,
    userPrompt,
    inputSummary,
    userId: input.userId,
    temperature: 0.3,
    onComplete: async (output, job) => {
      const values = {
        agentJobId: job.id,
        sprintId: input.sprintId ?? null,
        ceremonyType: input.type,
        title: output.title,
        occurredOn: input.occurredOn,
        summary: output.summary,
        participants: output.participants,
        sections: output.sections,
        actionItems: output.actionItems,
        rawNotes: input.rawNotes,
        additionalContext: input.additionalContext ?? null,
      };

      const db = await getDb();
      if (input.replaceCeremonyId) {
        await db
          .update(schema.ceremonyRecord)
          .set({
            ...values,
            status: "DRAFT",
            updatedAt: new Date(),
            updatedBy: input.userId ?? null,
          })
          .where(eq(schema.ceremonyRecord.id, input.replaceCeremonyId));
      } else {
        await db.insert(schema.ceremonyRecord).values({
          ...values,
          createdBy: input.userId ?? null,
          updatedBy: input.userId ?? null,
        });
      }
    },
  });
}
