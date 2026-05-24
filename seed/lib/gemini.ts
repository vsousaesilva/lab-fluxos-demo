import type { IngestConfig } from "./config";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";
const EMBED_MODEL = "gemini-embedding-001";
const OUTPUT_DIMS = 768; // bate com o índice Vectorize criado (768, cosine)

type EmbedResponse = {
  embedding?: { values: number[] };
  error?: { code: number; message: string };
};

type BatchEmbedResponse = {
  embeddings?: Array<{ values: number[] }>;
  error?: { code: number; message: string };
};

/**
 * Gera embeddings via Gemini Embedding 001, truncados em 768 dims
 * pra compatibilizar com o índice Vectorize (lab-fluxos-flows).
 * taskType = RETRIEVAL_DOCUMENT para textos indexados;
 * para queries de busca use taskType = RETRIEVAL_QUERY na call site.
 */
export class GeminiEmbedder {
  constructor(private readonly cfg: IngestConfig) {}

  async embed(
    text: string,
    taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY" = "RETRIEVAL_DOCUMENT"
  ): Promise<number[]> {
    const url = `${GEMINI_BASE}/models/${EMBED_MODEL}:embedContent?key=${this.cfg.geminiApiKey}`;
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

  async embedBatch(
    texts: string[],
    taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY" = "RETRIEVAL_DOCUMENT"
  ): Promise<number[][]> {
    if (texts.length === 0) return [];
    // Gemini batchEmbedContents aceita no máximo 100 requests por chamada.
    const MAX_BATCH = 100;
    if (texts.length > MAX_BATCH) {
      const results: number[][] = [];
      for (let i = 0; i < texts.length; i += MAX_BATCH) {
        const slice = texts.slice(i, i + MAX_BATCH);
        results.push(...(await this.embedBatch(slice, taskType)));
      }
      return results;
    }
    const url = `${GEMINI_BASE}/models/${EMBED_MODEL}:batchEmbedContents?key=${this.cfg.geminiApiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        requests: texts.map((t) => ({
          model: `models/${EMBED_MODEL}`,
          content: { parts: [{ text: t }] },
          taskType,
          outputDimensionality: OUTPUT_DIMS,
        })),
      }),
    });
    const body = (await res.json()) as BatchEmbedResponse;
    if (body.error || !body.embeddings) {
      throw new Error(
        `Gemini batch embed falhou: ${body.error?.message ?? "sem embeddings"}`
      );
    }
    return body.embeddings.map((e) => e.values);
  }
}
