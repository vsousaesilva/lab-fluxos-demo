import { and, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/lib/db/client";
import { runStreamingAgent } from "@/lib/ai";
import {
  SPRINT_MANAGER_SYSTEM_PROMPT,
  buildSprintCandidatePool,
  buildSprintManagerUserPrompt,
  type SprintCandidateLine,
} from "./prompt";
import { sprintManagerOutputSchema } from "./schema";

export type RunSprintManagerInput = {
  analysisIds: string[];
  weeks: number;
  capacityDescription?: string;
  goalHint?: string;
  userId?: string;
  /** Se informado, substitui o registro existente (regenerar). */
  replaceSprintId?: string;
};

export async function runSprintManager(input: RunSprintManagerInput) {
  if (!Number.isInteger(input.weeks) || input.weeks <= 0) {
    throw new Error("A duração da sprint (semanas) deve ser maior que zero.");
  }
  if (!input.analysisIds || input.analysisIds.length === 0) {
    throw new Error("Selecione pelo menos uma análise aprovada.");
  }

  const db = await getDb();
  const analyses = await db
    .select()
    .from(schema.demandAnalysis)
    .where(
      and(
        inArray(schema.demandAnalysis.id, input.analysisIds),
        eq(schema.demandAnalysis.status, "APPROVED")
      )
    );

  if (analyses.length === 0) {
    throw new Error(
      "Nenhuma análise aprovada foi encontrada entre os IDs informados."
    );
  }

  const lines: SprintCandidateLine[] = [];
  for (const a of analyses) {
    for (const item of a.backlogItems) {
      lines.push({
        analysisId: a.id,
        type: item.type,
        title: item.title,
        team: item.team,
        priority: item.priority,
        estimate: item.estimate,
      });
    }
  }

  if (lines.length === 0) {
    throw new Error(
      "As análises selecionadas não possuem itens de backlog."
    );
  }

  const candidatePool = buildSprintCandidatePool(lines);
  const userPrompt = buildSprintManagerUserPrompt({
    candidatePool,
    weeks: input.weeks,
    capacityDescription: input.capacityDescription,
    goalHint: input.goalHint,
  });

  const inputSummary = `${analyses.length} análise(s), ${lines.length} item(ns), ${input.weeks} sem.${input.replaceSprintId ? " (regenerar)" : ""}`;

  return runStreamingAgent({
    agentType: "SPRINT_MANAGER",
    schema: sprintManagerOutputSchema,
    systemPrompt: SPRINT_MANAGER_SYSTEM_PROMPT,
    userPrompt,
    inputSummary,
    userId: input.userId,
    temperature: 0.3,
    onComplete: async (output, job) => {
      const values = {
        agentJobId: job.id,
        name: output.name,
        goal: output.goal,
        weeks: input.weeks,
        capacityNotes: output.capacityNotes ?? null,
        capacityDescription: input.capacityDescription ?? null,
        goalHint: input.goalHint ?? null,
        items: output.items,
        outOfScope: output.outOfScope,
        risks: output.risks,
        definitionOfDone: output.definitionOfDone,
      };

      const db = await getDb();
      if (input.replaceSprintId) {
        await db
          .update(schema.sprint)
          .set({
            ...values,
            status: "PROPOSED",
            updatedAt: new Date(),
            updatedBy: input.userId ?? null,
          })
          .where(eq(schema.sprint.id, input.replaceSprintId));
      } else {
        await db.insert(schema.sprint).values({
          ...values,
          createdBy: input.userId ?? null,
          updatedBy: input.userId ?? null,
        });
      }
    },
  });
}
