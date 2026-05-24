// Extração de texto de anexos Office (DOCX, XLSX) para passar pro Gemini.
// Usado pelo Demand Analyst em `loadDemandAttachmentParts`.
//
// Libs:
//   - mammoth → DOCX (extrai raw text + lista de avisos)
//   - xlsx (SheetJS) → XLSX (lê todas as planilhas como CSV/TSV)
//
// Imports dinâmicos pra evitar carregar ~700KB no Worker quando não há
// anexos Office numa request.

const DOCX_MIMES = new Set([
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
]);

const XLSX_MIMES = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
]);

export function isDocx(mime: string): boolean {
  return DOCX_MIMES.has(mime.toLowerCase());
}

export function isXlsx(mime: string): boolean {
  return XLSX_MIMES.has(mime.toLowerCase());
}

/**
 * Extrai texto puro de um arquivo DOCX. Retorna string vazia em caso de falha
 * (não lança — o caller decide se inclui ou não no prompt).
 */
export async function extractDocxText(buf: ArrayBuffer): Promise<string> {
  try {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({
      arrayBuffer: buf,
    });
    return (result.value ?? "").trim();
  } catch (err) {
    console.error("[extractDocxText]", err);
    return "";
  }
}

/**
 * Extrai conteúdo de planilha XLSX como texto formatado (1 bloco por aba).
 * Cada aba vira CSV-ish (separado por tab) pra IA conseguir mapear colunas.
 * Trunca cada aba em 100 linhas pra não estourar o prompt.
 */
export async function extractXlsxText(buf: ArrayBuffer): Promise<string> {
  try {
    const xlsxMod = (await import("xlsx")) as typeof import("xlsx");
    const wb = xlsxMod.read(new Uint8Array(buf), { type: "array" });
    const out: string[] = [];
    for (const sheetName of wb.SheetNames) {
      const sheet = wb.Sheets[sheetName];
      if (!sheet) continue;
      const csv = xlsxMod.utils.sheet_to_csv(sheet, { FS: "\t" });
      const lines = csv.split(/\r?\n/);
      const truncated =
        lines.length > 100
          ? lines.slice(0, 100).join("\n") +
            `\n…(${lines.length - 100} linha(s) truncadas)`
          : csv;
      out.push(`### Aba: ${sheetName}\n${truncated}`);
    }
    return out.join("\n\n");
  } catch (err) {
    console.error("[extractXlsxText]", err);
    return "";
  }
}
