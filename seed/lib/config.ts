import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Carrega configuração do ambiente local (Node.js / tsx).
 *
 * Lê:
 *  - .cf-token       (Cloudflare API token)
 *  - .dev.vars       (GOOGLE_GENERATIVE_AI_API_KEY)
 *  - constantes hardcoded com IDs de conta/D1
 */

export type IngestConfig = {
  cloudflareToken: string;
  geminiApiKey: string;
  accountId: string;
  d1DatabaseId: string;
  d1DatabaseName: string;
  r2BucketName: string;
  vectorizeIndexName: string;
};

const ACCOUNT_ID = "63ae4eb9d39a6b3083ce162a43cd0b7b";
const D1_DATABASE_ID = "27e1e2a7-53a3-4639-977f-4886d7b77950";
const D1_DATABASE_NAME = "lab-fluxos";
const R2_BUCKET_NAME = "lab-fluxos-xmls";
const VECTORIZE_INDEX_NAME = "lab-fluxos-flows";

export function loadConfig(projectRoot: string): IngestConfig {
  const cfTokenPath = resolve(projectRoot, ".cf-token");
  const devVarsPath = resolve(projectRoot, ".dev.vars");

  const cloudflareToken = readFileSync(cfTokenPath, "utf-8").trim();
  if (!cloudflareToken || cloudflareToken.includes("COLE_AQUI")) {
    throw new Error(".cf-token vazio ou com placeholder. Cole um API token válido.");
  }

  const devVars = readFileSync(devVarsPath, "utf-8");
  const geminiMatch = devVars.match(
    /^GOOGLE_GENERATIVE_AI_API_KEY\s*=\s*"([^"]*)"/m
  );
  const geminiApiKey = geminiMatch?.[1]?.trim();
  if (!geminiApiKey) {
    throw new Error(
      "GOOGLE_GENERATIVE_AI_API_KEY não encontrada em .dev.vars (deve estar entre aspas)."
    );
  }

  return {
    cloudflareToken,
    geminiApiKey,
    accountId: ACCOUNT_ID,
    d1DatabaseId: D1_DATABASE_ID,
    d1DatabaseName: D1_DATABASE_NAME,
    r2BucketName: R2_BUCKET_NAME,
    vectorizeIndexName: VECTORIZE_INDEX_NAME,
  };
}
