import type { IngestConfig } from "./config";

/**
 * Wrapper sobre as APIs REST da Cloudflare (D1, R2, Vectorize).
 * Usado pelo script de ingestão local (Node.js / tsx).
 */

const API_BASE = "https://api.cloudflare.com/client/v4";

type D1Response = {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  result: Array<{
    results: Array<Record<string, unknown>>;
    success: boolean;
    meta: Record<string, unknown>;
  }>;
};

export class CloudflareClient {
  constructor(private readonly cfg: IngestConfig) {}

  private authHeaders(extra: Record<string, string> = {}) {
    return {
      Authorization: `Bearer ${this.cfg.cloudflareToken}`,
      ...extra,
    };
  }

  // -------------------- D1 --------------------

  async d1Query(
    sql: string,
    params: Array<string | number | null> = []
  ): Promise<Array<Record<string, unknown>>> {
    const url = `${API_BASE}/accounts/${this.cfg.accountId}/d1/database/${this.cfg.d1DatabaseId}/query`;
    const res = await fetch(url, {
      method: "POST",
      headers: this.authHeaders({ "content-type": "application/json" }),
      body: JSON.stringify({ sql, params }),
    });
    const body = (await res.json()) as D1Response;
    if (!body.success) {
      const msg =
        body.errors?.map((e) => `[${e.code}] ${e.message}`).join("; ") ??
        "erro D1 desconhecido";
      throw new Error(`D1 query falhou: ${msg}`);
    }
    return body.result[0]?.results ?? [];
  }

  async d1Exists(sql: string, params: Array<string | number | null>): Promise<boolean> {
    const rows = await this.d1Query(sql, params);
    return rows.length > 0;
  }

  // -------------------- R2 --------------------

  async r2PutObject(
    key: string,
    bytes: Uint8Array | ArrayBuffer,
    contentType = "application/xml",
    retries = 3
  ): Promise<void> {
    const url = `${API_BASE}/accounts/${this.cfg.accountId}/r2/buckets/${this.cfg.r2BucketName}/objects/${encodeURIComponent(key)}`;
    let lastErr = "";
    for (let attempt = 0; attempt <= retries; attempt++) {
      const res = await fetch(url, {
        method: "PUT",
        headers: this.authHeaders({ "content-type": contentType }),
        body: bytes,
      });
      if (res.ok) return;
      const txt = await res.text();
      lastErr = `${res.status} ${txt.slice(0, 300)}`;
      // 5xx é transiente; retry com backoff. 4xx é permanente.
      if (res.status < 500 || attempt === retries) break;
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
    throw new Error(`R2 PUT ${key} falhou: ${lastErr}`);
  }

  // -------------------- Vectorize --------------------

  /**
   * Insere (ou faz upsert) vetores no índice. Aceita NDJSON.
   * Cada linha: { id, values: number[], metadata?: Record<string, unknown> }
   */
  async vectorizeUpsert(
    vectors: Array<{
      id: string;
      values: number[];
      metadata?: Record<string, unknown>;
    }>
  ): Promise<void> {
    if (vectors.length === 0) return;
    const url = `${API_BASE}/accounts/${this.cfg.accountId}/vectorize/v2/indexes/${this.cfg.vectorizeIndexName}/upsert`;
    const ndjson = vectors.map((v) => JSON.stringify(v)).join("\n");
    const res = await fetch(url, {
      method: "POST",
      headers: this.authHeaders({ "content-type": "application/x-ndjson" }),
      body: ndjson,
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Vectorize upsert falhou: ${res.status} ${txt.slice(0, 300)}`);
    }
  }
}
