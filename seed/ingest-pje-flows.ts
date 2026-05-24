/**
 * Ingestão dos XMLs jPDL 3.2 do PJe (Fase 4 do roadmap).
 *
 * Lê os arquivos em DEFAULT_XML_DIR (ou no caminho passado por arg),
 * detecta encoding, parseia, chunka, gera embeddings via Gemini e
 * grava em D1 (metadata) + R2 (XML cru) + Vectorize (embeddings).
 *
 * Como rodar:
 *   "..\..\Portatil\node-v24.14.1-win-x64\npm.cmd" run ingest:flows
 *
 * ou via script .cmd (vou criar _ingest-flows.cmd separado).
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, join, basename } from "node:path";
import { loadConfig } from "./lib/config";
import { CloudflareClient } from "./lib/cloudflare";
import { GeminiEmbedder } from "./lib/gemini";
import { chunkXml } from "./lib/chunk";
import { parseFlow } from "../lib/validator/parser";
import { FlowParseError } from "../lib/validator/types";

const PROJECT_ROOT = resolve(__dirname, "..");
const DEFAULT_XML_DIR =
  "C:\\Users\\vsousaesilva\\Downloads\\fluxos-pje-ativos-v2.4";

// Limita concorrência pra não estourar rate limits do Gemini/Cloudflare.
const PARALLELISM = 3;

// ============================================================
// Helpers
// ============================================================

function listXmlFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isFile() && name.toLowerCase().endsWith(".xml")) out.push(full);
  }
  return out.sort();
}

function readWithDeclaredEncoding(path: string): string {
  const buf = readFileSync(path);
  const head = new TextDecoder("ascii", { fatal: false }).decode(
    buf.subarray(0, 200)
  );
  const m = head.match(/encoding\s*=\s*["']([^"']+)["']/i);
  const declared = (m?.[1] ?? "utf-8").toLowerCase();
  let encoding = "utf-8";
  if (
    declared === "iso-8859-1" ||
    declared === "iso8859-1" ||
    declared === "latin1"
  ) {
    encoding = "iso-8859-1";
  } else if (declared === "windows-1252" || declared === "cp1252") {
    encoding = "windows-1252";
  }
  try {
    return new TextDecoder(encoding).decode(buf);
  } catch {
    return new TextDecoder("utf-8", { fatal: false }).decode(buf);
  }
}

function sha256(s: string): string {
  return createHash("sha256").update(s, "utf-8").digest("hex");
}

function uuid(): string {
  return crypto.randomUUID();
}

function nowMs(): number {
  return Date.now();
}

// ============================================================
// Ingestão de um arquivo
// ============================================================

type IngestStat = {
  file: string;
  status: "ok" | "skipped" | "error";
  chunkCount?: number;
  error?: string;
};

async function ingestFile(
  filePath: string,
  cf: CloudflareClient,
  embedder: GeminiEmbedder
): Promise<IngestStat> {
  const fileName = basename(filePath);
  try {
    const xml = readWithDeclaredEncoding(filePath);
    const hash = sha256(xml);

    // Skip se já existe (por filePath)
    const exists = await cf.d1Exists(
      "SELECT id FROM flow_source WHERE file_path = ? LIMIT 1",
      [filePath]
    );
    if (exists) {
      return { file: fileName, status: "skipped" };
    }

    // Parse pra extrair processName e dialect
    let processName = fileName.replace(/\.xml$/i, "");
    let dialect: "jPDL" | "BPMN" = "jPDL";
    try {
      const graph = parseFlow(xml);
      processName = graph.processName ?? processName;
      dialect = graph.dialect === "BPMN" ? "BPMN" : "jPDL";
    } catch (err) {
      if (!(err instanceof FlowParseError)) throw err;
      // Se não parsea, ingere mesmo assim (XML pode estar válido pra busca de texto)
    }

    // R2: upload do XML cru
    const r2Key = `flows/${hash}.xml`;
    await cf.r2PutObject(r2Key, new TextEncoder().encode(xml));

    // Chunk + embed
    const chunks = chunkXml(xml);
    const embeddings = await embedder.embedBatch(chunks);
    if (embeddings.length !== chunks.length) {
      throw new Error(
        `Embed retornou ${embeddings.length} pra ${chunks.length} chunks`
      );
    }

    // Inserções D1: flow_source + flow_chunks
    const flowSourceId = uuid();
    const indexedAt = nowMs();
    const createdAt = indexedAt;

    await cf.d1Query(
      `INSERT INTO flow_source
        (id, file_path, file_name, content_hash, process_name, dialect,
         chunk_count, status, indexed_at, r2_key, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'INDEXED', ?, ?, ?, ?)`,
      [
        flowSourceId,
        filePath,
        fileName,
        hash,
        processName,
        dialect,
        chunks.length,
        indexedAt,
        r2Key,
        createdAt,
        createdAt,
      ]
    );

    const chunkIds: string[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunkId = uuid();
      chunkIds.push(chunkId);
      await cf.d1Query(
        `INSERT INTO flow_chunk (id, flow_source_id, ordinal, content, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [chunkId, flowSourceId, i, chunks[i], createdAt]
      );
    }

    // Vectorize: upsert de todos os chunks
    await cf.vectorizeUpsert(
      chunks.map((_chunk, i) => ({
        id: chunkIds[i],
        values: embeddings[i],
        metadata: {
          flowSourceId,
          fileName,
          processName,
          dialect,
          ordinal: i,
        },
      }))
    );

    return { file: fileName, status: "ok", chunkCount: chunks.length };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { file: fileName, status: "error", error: message };
  }
}

// ============================================================
// Concorrência limitada
// ============================================================

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, idx: number) => Promise<R>,
  onProgress?: (done: number, total: number, last: R) => void
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  let completed = 0;
  async function worker() {
    while (true) {
      const idx = cursor++;
      if (idx >= items.length) return;
      const r = await fn(items[idx], idx);
      results[idx] = r;
      completed += 1;
      onProgress?.(completed, items.length, r);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker())
  );
  return results;
}

// ============================================================
// Main
// ============================================================

async function main() {
  const dir = process.argv[2] ?? DEFAULT_XML_DIR;
  console.log(`[ingest] diretório: ${dir}`);

  const cfg = loadConfig(PROJECT_ROOT);
  const cf = new CloudflareClient(cfg);
  const embedder = new GeminiEmbedder(cfg);

  const files = listXmlFiles(dir);
  console.log(`[ingest] ${files.length} arquivos .xml encontrados`);
  if (files.length === 0) {
    console.log("[ingest] nada pra fazer");
    return;
  }

  const stats = await mapLimit(
    files,
    PARALLELISM,
    (f) => ingestFile(f, cf, embedder),
    (done, total, last) => {
      const mark =
        last.status === "ok" ? "✓" : last.status === "skipped" ? "·" : "✗";
      const detail =
        last.status === "ok"
          ? ` (${last.chunkCount} chunks)`
          : last.status === "error"
            ? ` — ${last.error?.slice(0, 100)}`
            : "";
      console.log(`[${done}/${total}] ${mark} ${last.file}${detail}`);
    }
  );

  const ok = stats.filter((s) => s.status === "ok").length;
  const skipped = stats.filter((s) => s.status === "skipped").length;
  const errors = stats.filter((s) => s.status === "error").length;
  console.log("\n=== Resumo ===");
  console.log(`OK:       ${ok}`);
  console.log(`Skipped:  ${skipped}`);
  console.log(`Errors:   ${errors}`);
  if (errors > 0) {
    console.log("\nArquivos com erro:");
    for (const s of stats) {
      if (s.status === "error") {
        console.log(`  ${s.file} — ${s.error}`);
      }
    }
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("[ingest] fatal:", err);
  process.exit(1);
});
