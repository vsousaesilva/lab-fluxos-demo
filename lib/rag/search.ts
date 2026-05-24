import { inArray } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb, schema } from "@/lib/db/client";
import { embedText } from "./embed";

export type RetrievedChunk = {
  chunkId: string;
  flowSourceId: string;
  fileName: string;
  processName: string;
  dialect: "jPDL" | "BPMN";
  ordinal: number;
  content: string;
  /** Cosine similarity ∈ [-1, 1] (1 = idêntico). */
  score: number;
};

/**
 * Busca semântica no índice Vectorize `lab-fluxos-flows`.
 *
 * 1. Embedda a query com Gemini (RETRIEVAL_QUERY, 768d)
 * 2. Consulta o Vectorize → vectorIds + scores
 * 3. Busca o content do chunk em D1 (`flow_chunk`) e enriquece com metadata
 *    de `flow_source`.
 *
 * Retorna ordenado por score desc.
 */
export async function searchFlows(
  query: string,
  opts: { topK?: number; minScore?: number } = {}
): Promise<RetrievedChunk[]> {
  const topK = opts.topK ?? 8;
  const minScore = opts.minScore ?? 0.0;

  const trimmed = query.trim();
  if (trimmed.length === 0) return [];

  const queryVector = await embedText(trimmed, "RETRIEVAL_QUERY");

  const { env } = await getCloudflareContext({ async: true });
  const result = await env.FLOW_VECTORS.query(queryVector, {
    topK,
    returnMetadata: "indexed",
  });

  const matches = (result.matches ?? []).filter((m) => m.score >= minScore);
  if (matches.length === 0) return [];

  const chunkIds = matches.map((m) => m.id);
  const db = await getDb();

  // Busca em batch: content dos chunks + metadata dos sources
  const chunks = await db
    .select({
      id: schema.flowChunk.id,
      flowSourceId: schema.flowChunk.flowSourceId,
      ordinal: schema.flowChunk.ordinal,
      content: schema.flowChunk.content,
    })
    .from(schema.flowChunk)
    .where(inArray(schema.flowChunk.id, chunkIds));

  const sourceIds = Array.from(new Set(chunks.map((c) => c.flowSourceId)));
  const sources = await db
    .select({
      id: schema.flowSource.id,
      fileName: schema.flowSource.fileName,
      processName: schema.flowSource.processName,
      dialect: schema.flowSource.dialect,
    })
    .from(schema.flowSource)
    .where(inArray(schema.flowSource.id, sourceIds));

  const sourceById = new Map(sources.map((s) => [s.id, s]));
  const chunkById = new Map(chunks.map((c) => [c.id, c]));

  const retrieved: RetrievedChunk[] = [];
  for (const match of matches) {
    const chunk = chunkById.get(match.id);
    if (!chunk) continue; // chunk dropado do D1, mas ainda no Vectorize (orfão)
    const source = sourceById.get(chunk.flowSourceId);
    if (!source) continue;
    retrieved.push({
      chunkId: chunk.id,
      flowSourceId: chunk.flowSourceId,
      fileName: source.fileName,
      processName: source.processName,
      dialect: source.dialect,
      ordinal: chunk.ordinal,
      content: chunk.content,
      score: match.score,
    });
  }

  return retrieved;
}
