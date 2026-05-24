"use server";

import { eq } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { revalidatePath } from "next/cache";
import { getDb, schema } from "@/lib/db/client";
import type { DemandAttachment } from "@/lib/db/schema";
import { ATTACHMENT_LIMITS, classifyMime } from "./config";

type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function listAttachmentsAction(
  demandId: string
): Promise<DemandAttachment[]> {
  const db = await getDb();
  return db
    .select()
    .from(schema.demandAttachment)
    .where(eq(schema.demandAttachment.demandId, demandId));
}

export async function deleteAttachmentAction(
  id: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const db = await getDb();
    const att = await db.query.demandAttachment.findFirst({
      where: eq(schema.demandAttachment.id, id),
    });
    if (!att) return { ok: false, error: "Anexo não encontrado." };

    const { env } = await getCloudflareContext({ async: true });
    if (env.DEMAND_ATTACHMENTS) {
      try {
        await env.DEMAND_ATTACHMENTS.delete(att.r2Key);
      } catch (err) {
        console.warn("[deleteAttachmentAction] R2 delete falhou", err);
      }
    }

    await db
      .delete(schema.demandAttachment)
      .where(eq(schema.demandAttachment.id, id));

    revalidatePath("/demandas");
    return { ok: true, data: { id } };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao excluir";
    console.error("[deleteAttachmentAction]", err);
    return { ok: false, error: message };
  }
}

/** Pega total de bytes já anexados a uma demanda (pra checar limites no client). */
export async function getAttachmentsTotalSize(demandId: string): Promise<{
  count: number;
  totalBytes: number;
  remainingFiles: number;
  remainingBytes: number;
}> {
  const all = await listAttachmentsAction(demandId);
  const totalBytes = all.reduce((s, a) => s + a.size, 0);
  return {
    count: all.length,
    totalBytes,
    remainingFiles: Math.max(0, ATTACHMENT_LIMITS.maxFilesPerDemand - all.length),
    remainingBytes: Math.max(0, ATTACHMENT_LIMITS.maxTotalBytes - totalBytes),
  };
}

/** Server action helper que valida MIME + tamanho contra os limites. */
export function validateAttachment(file: { type: string; size: number }): string | null {
  const category = classifyMime(file.type);
  if (category === "unknown") {
    return `Tipo "${file.type}" não suportado. Aceitos: imagens, PDF, TXT/MD/CSV, XLSX/DOCX.`;
  }
  if (file.size > ATTACHMENT_LIMITS.maxFileBytes) {
    return `Arquivo excede o limite de ${ATTACHMENT_LIMITS.maxFileBytes / 1024 / 1024} MB por arquivo.`;
  }
  return null;
}
