import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db/client";
import { runStreamingAgent } from "@/lib/ai";
import {
  DEMAND_ANALYST_SYSTEM_PROMPT,
  buildDemandAnalystUserPrompt,
} from "./prompt";
import { demandAnalystOutputSchema } from "./schema";

export type RunDemandAnalystInput = {
  demandId: string;
  additionalContext?: string;
  userId?: string;
  /** Se informado, substitui o registro existente (regenerar). */
  replaceAnalysisId?: string;
};

export async function runDemandAnalyst(input: RunDemandAnalystInput) {
  const db = await getDb();
  const demand = await db.query.demand.findFirst({
    where: eq(schema.demand.id, input.demandId),
  });

  if (!demand) {
    throw new Error("Demanda não encontrada");
  }
  if (demand.status !== "APPROVED") {
    throw new Error(
      "A demanda precisa estar APPROVED antes de gerar análise."
    );
  }

  const userPrompt = buildDemandAnalystUserPrompt({
    title: demand.title,
    description: demand.description,
    additionalContext: input.additionalContext,
  });

  const inputSummary = `Demanda ${demand.id.slice(0, 8)} — ${demand.title.slice(0, 80)}${input.replaceAnalysisId ? " (regenerar)" : ""}`;

  return runStreamingAgent({
    agentType: "DEMAND_ANALYST",
    schema: demandAnalystOutputSchema,
    systemPrompt: DEMAND_ANALYST_SYSTEM_PROMPT,
    userPrompt,
    inputSummary,
    userId: input.userId,
    temperature: 0.3,
    onComplete: async (output, job) => {
      const values = {
        demandId: demand.id,
        agentJobId: job.id,
        summary: output.summary,
        objectives: output.objectives,
        impactedTeams: output.impactedTeams,
        assumptions: output.assumptions,
        risks: output.risks,
        openQuestions: output.openQuestions,
        backlogItems: output.backlogItems,
      };

      const db = await getDb();
      if (input.replaceAnalysisId) {
        await db
          .update(schema.demandAnalysis)
          .set({
            ...values,
            status: "DRAFT",
            updatedAt: new Date(),
            updatedBy: input.userId ?? null,
          })
          .where(eq(schema.demandAnalysis.id, input.replaceAnalysisId));
      } else {
        await db.insert(schema.demandAnalysis).values({
          ...values,
          createdBy: input.userId ?? null,
          updatedBy: input.userId ?? null,
        });
      }
    },
  });
}
