import { getCloudflareContext } from "@opennextjs/cloudflare";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";
const EMBED_MODEL = "gemini-embedding-001";
const OUTPUT_DIMS = 768; // bate com o índice Vectorize criado

type EmbedResponse = {
  embedding?: { values: number[] };
  error?: { code: number; message: string };
};

/**
 * Gera um embedding 768-dim via Gemini para uso em busca no Vectorize.
 * Use taskType = "RETRIEVAL_QUERY" para queries de usuário e
 * "RETRIEVAL_DOCUMENT" para texto a indexar (mesmo modelo da ingestão).
 */
export async function embedText(
  text: string,
  taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY" = "RETRIEVAL_QUERY"
): Promise<number[]> {
  const { env } = await getCloudflareContext({ async: true });
  const apiKey = env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GOOGLE_GENERATIVE_AI_API_KEY ausente. Configure em .dev.vars (dev) ou via _secrets.cmd (prod)."
    );
  }
  const url = `${GEMINI_BASE}/models/${EMBED_MODEL}:embedContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: `models/${EMBED_MODEL}`,
      content: { parts: [{ text }] },
      taskType,
      outputDimensionality: OUTPUT_DIMS,
    }),
  });
  const body = (await res.json()) as EmbedResponse;
  if (body.error || !body.embedding) {
    throw new Error(
      `Gemini embed falhou: ${body.error?.message ?? "sem embedding"}`
    );
  }
  return body.embedding.values;
}
