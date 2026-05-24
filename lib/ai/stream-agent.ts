import { streamObject } from "ai";
import { z } from "zod";
import {
  getGeminiModel,
  type GeminiModelKey,
} from "./gemini";
import {
  startAgentJob,
  completeAgentJob,
  failAgentJob,
} from "./agent-job";
import type { AgentJob, AgentType } from "@/lib/db/schema";

export type RunStreamingAgentOptions<S extends z.ZodType> = {
  agentType: AgentType;
  modelKey?: GeminiModelKey;
  systemPrompt: string;
  userPrompt: string;
  schema: S;
  inputSummary?: string;
  userId?: string;
  temperature?: number;
  onComplete?: (
    object: z.infer<S>,
    job: AgentJob
  ) => Promise<void> | void;
};

/**
 * Roda um agente Gemini com saída estruturada via streamObject.
 *
 * - Cria um registro `agent_job` em RUNNING antes do streaming
 * - Stream pode ser consumido pelo caller (ex.: Route Handler retornando toTextStreamResponse)
 * - Ao final do stream (onFinish), grava tokens + outputSummary e marca SUCCESS
 * - Em erro: marca FAILED com mensagem
 *
 * Retorna `{ job, result }` — o caller decide o que fazer com `result`.
 */
export async function runStreamingAgent<S extends z.ZodType>(
  opts: RunStreamingAgentOptions<S>
) {
  const { model, modelId } = await getGeminiModel(opts.modelKey ?? "flash");

  const job = await startAgentJob({
    agentType: opts.agentType,
    inputSummary: opts.inputSummary,
    llmProvider: "google",
    llmModel: modelId,
    userId: opts.userId,
  });

  console.log(
    `[runStreamingAgent] start job=${job.id} agentType=${opts.agentType} model=${modelId}`
  );

  const result = streamObject({
    model,
    schema: opts.schema,
    system: opts.systemPrompt,
    prompt: opts.userPrompt,
    temperature: opts.temperature ?? 0.3,
    onError: async ({ error }) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[runStreamingAgent.onError] job=${job.id}`, error);
      await failAgentJob(job.id, `streamObject.onError: ${message}`);
    },
    onFinish: async ({ object, usage, error }) => {
      console.log(
        `[runStreamingAgent.onFinish] job=${job.id} hasObject=${!!object} hasError=${!!error} tokens=${usage?.promptTokens ?? 0}/${usage?.completionTokens ?? 0}`
      );
      try {
        if (error || !object) {
          const message =
            error instanceof Error ? error.message : "Sem objeto retornado";
          await failAgentJob(job.id, message, {
            promptTokens: usage?.promptTokens,
            completionTokens: usage?.completionTokens,
          });
          return;
        }

        await completeAgentJob(job.id, {
          outputSummary: summarizeObject(object),
          promptTokens: usage?.promptTokens ?? 0,
          completionTokens: usage?.completionTokens ?? 0,
        });

        if (opts.onComplete) {
          await opts.onComplete(object as z.infer<S>, job);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erro pós-stream";
        console.error("[runStreamingAgent.onFinish]", err);
        await failAgentJob(job.id, message);
      }
    },
  });

  return { job, result };
}

function summarizeObject(obj: unknown, max = 240): string {
  if (obj == null) return "";
  try {
    if (typeof obj === "string") return obj.slice(0, max);
    if (typeof obj === "object") {
      const keys = Object.keys(obj as object).slice(0, 6).join(", ");
      const json = JSON.stringify(obj);
      return `{${keys}} · ${json.length}b`.slice(0, max);
    }
    return String(obj).slice(0, max);
  } catch {
    return "";
  }
}
