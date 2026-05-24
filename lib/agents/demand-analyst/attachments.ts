// Helper: carrega anexos de uma demanda do R2 e converte em content parts
// (text/image/file) compatíveis com a AI SDK multimodal do Gemini.
//
// Categorias:
// - image/* → image part (Gemini vision)
// - application/pdf → file part (Gemini lê PDF nativo)
// - text/* + text/csv → text part inline no prompt
// - DOCX → texto extraído via mammoth, injetado inline
// - XLSX → planilhas extraídas via xlsx (SheetJS), cada aba vira TSV inline

import { eq } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { CoreUserMessage } from "ai";
import { getDb, schema } from "@/lib/db/client";
import { classifyMime } from "@/lib/attachments/config";
import { extractDocxText, extractXlsxText, isDocx, isXlsx } from "./office";

// `CoreUserMessage["content"]` é `string | Array<TextPart|ImagePart|FilePart>`.
// Aqui sempre devolvemos array — extraímos o tipo do elemento pra eliminar
// a variante `string` da assinatura.
type UserContentArray = Exclude<CoreUserMessage["content"], string>;

export type AttachmentParts = {
  contentParts: UserContentArray;
  summary: string;
  attachmentCount: number;
};

const MAX_TEXT_FILE_CHARS = 20_000; // limita texto enviado pra IA por arquivo

export async function loadDemandAttachmentParts(
  demandId: string
): Promise<AttachmentParts> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.demandAttachment)
    .where(eq(schema.demandAttachment.demandId, demandId));

  if (rows.length === 0) {
    return { contentParts: [], summary: "sem anexos", attachmentCount: 0 };
  }

  const { env } = await getCloudflareContext({ async: true });
  const r2 = env.DEMAND_ATTACHMENTS;
  if (!r2) {
    return {
      contentParts: [
        {
          type: "text",
          text: `\n\n⚠️ Há ${rows.length} anexo(s) mas o bucket DEMAND_ATTACHMENTS não está configurado — IA segue sem eles.`,
        },
      ],
      summary: `${rows.length} anexos ignorados (bucket off)`,
      attachmentCount: rows.length,
    };
  }

  const parts: UserContentArray = [];
  const summaryItems: string[] = [];

  // Cabeçalho explicando à IA que vem material anexo
  parts.push({
    type: "text",
    text: `\n\n--- Anexos do solicitante (${rows.length} arquivo${rows.length > 1 ? "s" : ""}) ---\nUse o conteúdo abaixo como contexto adicional. Cite o nome do arquivo quando referenciar trechos.\n`,
  });

  for (const att of rows) {
    const category = classifyMime(att.mimeType);
    try {
      const obj = await r2.get(att.r2Key);
      if (!obj) {
        parts.push({
          type: "text",
          text: `\n[${att.fileName}] — arquivo não encontrado em R2, ignorado.`,
        });
        summaryItems.push(`${att.fileName}(missing)`);
        continue;
      }

      if (category === "image") {
        const buf = await obj.arrayBuffer();
        parts.push({
          type: "text",
          text: `\n[Imagem anexa: ${att.fileName}]`,
        });
        parts.push({
          type: "image",
          image: new Uint8Array(buf),
          mimeType: att.mimeType,
        });
        summaryItems.push(`${att.fileName}(img)`);
      } else if (category === "pdf") {
        const buf = await obj.arrayBuffer();
        parts.push({
          type: "text",
          text: `\n[PDF anexo: ${att.fileName}]`,
        });
        parts.push({
          type: "file",
          data: new Uint8Array(buf),
          mimeType: att.mimeType,
        });
        summaryItems.push(`${att.fileName}(pdf)`);
      } else if (category === "text") {
        const text = await obj.text();
        const truncated =
          text.length > MAX_TEXT_FILE_CHARS
            ? text.slice(0, MAX_TEXT_FILE_CHARS) + "\n…(truncado)"
            : text;
        parts.push({
          type: "text",
          text: `\n--- Conteúdo de "${att.fileName}" (${att.mimeType}) ---\n${truncated}\n--- fim "${att.fileName}" ---`,
        });
        summaryItems.push(`${att.fileName}(txt)`);
      } else if (category === "office") {
        const buf = await obj.arrayBuffer();
        let extracted = "";
        let kind = "office";
        if (isDocx(att.mimeType)) {
          extracted = await extractDocxText(buf);
          kind = "docx";
        } else if (isXlsx(att.mimeType)) {
          extracted = await extractXlsxText(buf);
          kind = "xlsx";
        }
        if (!extracted) {
          parts.push({
            type: "text",
            text: `\n[${att.fileName} — ${att.mimeType}] não foi possível extrair texto. Arquivo segue disponível no R2.`,
          });
          summaryItems.push(`${att.fileName}(${kind}-fail)`);
        } else {
          const truncated =
            extracted.length > MAX_TEXT_FILE_CHARS
              ? extracted.slice(0, MAX_TEXT_FILE_CHARS) + "\n…(truncado)"
              : extracted;
          parts.push({
            type: "text",
            text: `\n--- Conteúdo de "${att.fileName}" (${kind.toUpperCase()}) ---\n${truncated}\n--- fim "${att.fileName}" ---`,
          });
          summaryItems.push(`${att.fileName}(${kind})`);
        }
      } else {
        parts.push({
          type: "text",
          text: `\n[${att.fileName}] tipo ${att.mimeType} não suportado, ignorado.`,
        });
        summaryItems.push(`${att.fileName}(skip)`);
      }
    } catch (err) {
      console.error("[loadDemandAttachmentParts] falha ao ler", att.r2Key, err);
      parts.push({
        type: "text",
        text: `\n[${att.fileName}] falha ao ler do storage, ignorado.`,
      });
      summaryItems.push(`${att.fileName}(error)`);
    }
  }

  return {
    contentParts: parts,
    summary: summaryItems.join(", "),
    attachmentCount: rows.length,
  };
}
