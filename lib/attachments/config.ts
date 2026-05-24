// Configuração e validação de anexos de demanda.
// Limites foram alinhados com o usuário: até 10 arquivos, 10 MB cada,
// 100 MB total por demanda.

export const ATTACHMENT_LIMITS = {
  maxFilesPerDemand: 10,
  maxFileBytes: 10 * 1024 * 1024,
  maxTotalBytes: 100 * 1024 * 1024,
} as const;

// MIME → categoria de processamento pela IA do Demand Analyst.
export type AttachmentCategory =
  | "image" // image/* → Gemini multimodal (vision)
  | "pdf" // application/pdf → Gemini multimodal (PDF nativo)
  | "text" // text/* + CSV → injetado como string no prompt
  | "office" // XLSX/DOCX → guardado, mas NÃO consumido (fase 2)
  | "unknown";

export const ACCEPTED_MIMES: Record<string, AttachmentCategory> = {
  // imagens
  "image/jpeg": "image",
  "image/jpg": "image",
  "image/png": "image",
  "image/webp": "image",
  "image/gif": "image",
  // PDF
  "application/pdf": "pdf",
  // texto
  "text/plain": "text",
  "text/markdown": "text",
  "text/csv": "text",
  // Office — DOCX via mammoth, XLSX via SheetJS (consumido pela IA)
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "office",
  "application/vnd.ms-excel": "office",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "office",
  "application/msword": "office",
};

export const ACCEPT_ATTR = Object.keys(ACCEPTED_MIMES).join(",");

export function classifyMime(mime: string): AttachmentCategory {
  return ACCEPTED_MIMES[mime.toLowerCase()] ?? "unknown";
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/** Sanitiza nome de arquivo pra uso como parte da chave R2. */
export function sanitizeFileName(name: string): string {
  // Remove acentos via NFD + filtro de marcas combinantes (Unicode Mn).
  const stripped = name.normalize("NFD").replace(/\p{Mn}/gu, "");
  const safe = stripped
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 80);
  return safe || "arquivo";
}

/** Monta a chave R2: demand/<demandId>/<uuid>-<sanitizedName>. */
export function buildR2Key(demandId: string, fileName: string): string {
  const uuid = crypto.randomUUID();
  const safe = sanitizeFileName(fileName);
  return `demand/${demandId}/${uuid}-${safe}`;
}
