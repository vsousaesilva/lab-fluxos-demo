import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db/client";
import { runStreamingAgent } from "@/lib/ai";
import { validateFlow } from "@/lib/validator";
import {
  BPMN_DESIGNER_SYSTEM_PROMPT,
  buildBpmnDesignerUserPrompt,
} from "./prompt";
import { bpmnFlowSpecSchema } from "./schema";
import { renderBpmnXml } from "./renderer";
import { userStoryToMarkdown } from "@/lib/agents/pje-xml-generator/user-story-renderer";

export type RunBpmnDesignerInput = {
  userStoryId: string;
  additionalContext?: string;
  userId?: string;
  /** Se informado, substitui o registro existente (regenerar). */
  replaceDiagramId?: string;
};

export async function runBpmnDesigner(input: RunBpmnDesignerInput) {
  const db = await getDb();
  const hu = await db.query.userStory.findFirst({
    where: eq(schema.userStory.id, input.userStoryId),
  });

  if (!hu) throw new Error("HU não encontrada");
  if (hu.status !== "APPROVED") {
    throw new Error("A HU precisa estar APROVADA para gerar o BPMN.");
  }

  const processName = hu.title;
  const specification = userStoryToMarkdown(hu);

  const userPrompt = buildBpmnDesignerUserPrompt({
    processName,
    specification,
    additionalContext: input.additionalContext,
  });

  const inputSummary = `HU ${hu.id.slice(0, 8)} — ${hu.title.slice(0, 80)}${input.replaceDiagramId ? " (regenerar)" : ""}`;

  return runStreamingAgent({
    agentType: "BPMN_DESIGNER",
    schema: bpmnFlowSpecSchema,
    systemPrompt: BPMN_DESIGNER_SYSTEM_PROMPT,
    userPrompt,
    inputSummary,
    userId: input.userId,
    temperature: 0.2,
    onComplete: async (spec, job) => {
      let bpmnXml: string;
      try {
        bpmnXml = renderBpmnXml(spec);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erro ao renderizar BPMN";
        throw new Error(`Render falhou: ${message}`);
      }

      const outcome = validateFlow(bpmnXml);

      const values = {
        agentJobId: job.id,
        userStoryId: hu.id,
        processName: outcome.processName ?? spec.processName ?? "Fluxo BPMN",
        specification,
        bpmnXml,
        validationResult: outcome.passed
          ? ("PASSED" as const)
          : ("FAILED" as const),
        errorCount: outcome.errorCount,
        warningCount: outcome.warningCount,
        infoCount: outcome.infoCount,
        findings: outcome.findings.map((f) => ({
          code: f.ruleCode,
          severity: f.severity,
          message: f.message,
          nodeKey: f.location ?? undefined,
        })),
      };

      const db = await getDb();
      if (input.replaceDiagramId) {
        await db
          .update(schema.bpmnDiagram)
          .set({
            ...values,
            status: "DRAFT",
            updatedAt: new Date(),
            updatedBy: input.userId ?? null,
          })
          .where(eq(schema.bpmnDiagram.id, input.replaceDiagramId));
      } else {
        await db.insert(schema.bpmnDiagram).values({
          ...values,
          createdBy: input.userId ?? null,
          updatedBy: input.userId ?? null,
        });
      }
    },
  });
}
