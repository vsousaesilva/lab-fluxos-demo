import { streamText } from "ai";
import { getGeminiModel } from "@/lib/ai/gemini";
import {
  startAgentJob,
  completeAgentJob,
  failAgentJob,
} from "@/lib/ai/agent-job";
import { searchFlows } from "@/lib/rag/search";
import {
  FLOW_CONSULTANT_SYSTEM_PROMPT,
  buildConsultantUserPrompt,
  type ChatHistoryMessage,
} from "./prompt";

export type FlowConsultantCitation = {
  fileName: string;
  processName: string;
  flowSourceId: string;
};

export type RunFlowConsultantInput = {
  question: string;
  history?: ChatHistoryMessage[];
  userId?: string;
  topK?: number;
};

/**
 * Roda o Consultor de Fluxos: busca chunks via RAG, monta prompt,
 * streama texto via Gemini, registra agentJob, devolve `result` (stream)
 * + `citations` (deduplicadas) pro caller exibir.
 */
export async function runFlowConsultant(input: RunFlowConsultantInput) {
  const chunks = await searchFlows(input.question, {
    topK: input.topK ?? 8,
    minScore: 0.3,
  });

  const citationMap = new Map<string, FlowConsultantCitation>();
  for (const c of chunks) {
    if (!citationMap.has(c.flowSourceId)) {
      citationMap.set(c.flowSourceId, {
        flowSourceId: c.flowSourceId,
        fileName: c.fileName,
        processName: c.processName,
      });
    }
  }
  const citations = Array.from(citationMap.values());

  const userPrompt = buildConsultantUserPrompt({
    question: input.question,
    history: input.history,
    chunks,
  });

  const { model, modelId } = await getGeminiModel("flash");

  const job = await startAgentJob({
    agentType: "FLOW_CONSULTANT",
    inputSummary: input.question.slice(0, 200),
    llmProvider: "google",
    llmModel: modelId,
    userId: input.userId,
  });

  console.log(
    `[runFlowConsultant] job=${job.id} chunks=${chunks.length} citations=${citations.length}`
  );

  const result = streamText({
    model,
    system: FLOW_CONSULTANT_SYSTEM_PROMPT,
    prompt: userPrompt,
    temperature: 0.3,
    onError: async ({ error }) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[runFlowConsultant.onError] job=${job.id}`, error);
      await failAgentJob(job.id, `streamText.onError: ${message}`);
    },
    onFinish: async ({ text, usage }) => {
      console.log(
        `[runFlowConsultant.onFinish] job=${job.id} chars=${text.length} tokens=${usage?.promptTokens ?? 0}/${usage?.completionTokens ?? 0}`
      );
      try {
        await completeAgentJob(job.id, {
          outputSummary: `${citations.length} fluxo(s) citado(s), ${text.length} chars`,
          promptTokens: usage?.promptTokens ?? 0,
          completionTokens: usage?.completionTokens ?? 0,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erro pós-stream";
        console.error("[runFlowConsultant.onFinish]", err);
        await failAgentJob(job.id, message);
      }
    },
  });

  return { job, result, citations };
}
