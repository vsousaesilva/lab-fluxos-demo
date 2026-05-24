import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db/client";
import { runStreamingAgent } from "@/lib/ai";
import { searchFlows } from "@/lib/rag/search";
import { validateFlow } from "@/lib/validator";
import {
  PJE_XML_GENERATOR_SYSTEM_PROMPT,
  buildPjeXmlGeneratorUserPrompt,
} from "./prompt";
import { generatedFlowSpecSchema } from "./schema";
import { renderJpdlXml } from "./renderer";
import { userStoryToMarkdown } from "./user-story-renderer";

export type RunPjeXmlGeneratorInput = {
  userStoryId: string;
  additionalContext?: string;
  userId?: string;
  /** Se informado, substitui o registro existente (regenerar). */
  replaceFlowId?: string;
};

export async function runPjeXmlGenerator(input: RunPjeXmlGeneratorInput) {
  const db = await getDb();
  const hu = await db.query.userStory.findFirst({
    where: eq(schema.userStory.id, input.userStoryId),
  });

  if (!hu) {
    throw new Error("HU não encontrada");
  }
  if (hu.status !== "APPROVED") {
    throw new Error("A HU precisa estar APROVADA para gerar o XML PJe.");
  }

  const processName = hu.title;
  const specification = userStoryToMarkdown(hu);

  // RAG: busca chunks relevantes pra contexto do LLM
  const references = await searchFlows(
    `${processName}\n\n${specification}`.slice(0, 4000),
    { topK: 6, minScore: 0.3 }
  );

  const userPrompt = buildPjeXmlGeneratorUserPrompt({
    processName,
    specification,
    additionalContext: input.additionalContext,
    references,
  });

  const inputSummary = `HU ${hu.id.slice(0, 8)} — ${hu.title.slice(0, 80)} · ${references.length} ref(s)${input.replaceFlowId ? " (regenerar)" : ""}`;

  return runStreamingAgent({
    agentType: "PJE_XML_GENERATOR",
    schema: generatedFlowSpecSchema,
    systemPrompt: PJE_XML_GENERATOR_SYSTEM_PROMPT,
    userPrompt,
    inputSummary,
    userId: input.userId,
    temperature: 0.2,
    onComplete: async (spec, job) => {
      // 1) renderiza XML deterministicamente
      let xml: string;
      try {
        xml = renderJpdlXml(spec);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erro ao renderizar XML";
        throw new Error(`Render falhou: ${message}`);
      }

      // 2) valida com nossa engine (port das 6 LintRules)
      const outcome = validateFlow(xml);

      // 3) persiste em generated_flow (INSERT ou UPDATE se regenerando)
      const values = {
        agentJobId: job.id,
        userStoryId: hu.id,
        processName: outcome.processName ?? spec.processName ?? "Fluxo gerado",
        specification,
        xml,
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
      if (input.replaceFlowId) {
        await db
          .update(schema.generatedFlow)
          .set({
            ...values,
            status: "DRAFT",
            updatedAt: new Date(),
            updatedBy: input.userId ?? null,
          })
          .where(eq(schema.generatedFlow.id, input.replaceFlowId));
      } else {
        await db.insert(schema.generatedFlow).values({
          ...values,
          createdBy: input.userId ?? null,
          updatedBy: input.userId ?? null,
        });
      }
    },
  });
}
