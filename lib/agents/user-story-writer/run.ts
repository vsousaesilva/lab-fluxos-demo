import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db/client";
import { runStreamingAgent } from "@/lib/ai";
import {
  USER_STORY_WRITER_SYSTEM_PROMPT,
  buildUserStoryWriterUserPrompt,
} from "./prompt";
import { userStoryWriterOutputSchema } from "./schema";

export type RunUserStoryWriterInput = {
  demandId: string;
  additionalContext?: string;
  userId?: string;
  /** Se informado, substitui o registro existente (regenerar). */
  replaceStoryId?: string;
};

export async function runUserStoryWriter(input: RunUserStoryWriterInput) {
  const db = await getDb();
  const demand = await db.query.demand.findFirst({
    where: eq(schema.demand.id, input.demandId),
  });

  if (!demand) {
    throw new Error("Demanda não encontrada");
  }
  if (demand.status !== "APPROVED") {
    throw new Error(
      "A demanda precisa estar APPROVED antes de gerar a HU."
    );
  }

  const userPrompt = buildUserStoryWriterUserPrompt({
    title: demand.title,
    description: demand.description,
    additionalContext: input.additionalContext,
  });

  const inputSummary = `Demanda ${demand.id.slice(0, 8)} — ${demand.title.slice(0, 80)}${input.replaceStoryId ? " (regenerar)" : ""}`;

  return runStreamingAgent({
    agentType: "USER_STORY_WRITER",
    schema: userStoryWriterOutputSchema,
    systemPrompt: USER_STORY_WRITER_SYSTEM_PROMPT,
    userPrompt,
    inputSummary,
    userId: input.userId,
    temperature: 0.3,
    onComplete: async (output, job) => {
      const values = {
        demandId: demand.id,
        agentJobId: job.id,
        title: output.title,
        asA: output.asA,
        iWant: output.iWant,
        soThat: output.soThat,
        scenarios: output.scenarios,
        businessRules: output.businessRules,
        references:
          output.references && output.references.trim()
            ? output.references
            : "N/a",
      };

      const db = await getDb();
      if (input.replaceStoryId) {
        await db
          .update(schema.userStory)
          .set({
            ...values,
            status: "DRAFT",
            updatedAt: new Date(),
            updatedBy: input.userId ?? null,
          })
          .where(eq(schema.userStory.id, input.replaceStoryId));
      } else {
        await db.insert(schema.userStory).values({
          ...values,
          createdBy: input.userId ?? null,
          updatedBy: input.userId ?? null,
        });
      }
    },
  });
}
