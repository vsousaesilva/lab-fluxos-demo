import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export const GEMINI_MODELS = {
  flash: "gemini-3-flash-preview",
  flash_latest: "gemini-3.5-flash",
  flash_lite: "gemini-3.1-flash-lite",
  pro: "gemini-3.1-pro-preview",
} as const;

export type GeminiModelKey = keyof typeof GEMINI_MODELS;

export async function getGeminiModel(
  modelKey: GeminiModelKey = "flash"
): Promise<{
  model: ReturnType<ReturnType<typeof createGoogleGenerativeAI>>;
  modelId: string;
}> {
  const { env } = await getCloudflareContext({ async: true });
  const apiKey = env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GOOGLE_GENERATIVE_AI_API_KEY ausente. Configure em .dev.vars (dev) ou via _secrets.cmd (prod)."
    );
  }
  const provider = createGoogleGenerativeAI({ apiKey });
  const modelId = GEMINI_MODELS[modelKey];
  return { model: provider(modelId), modelId };
}
