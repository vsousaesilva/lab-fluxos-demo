/**
 * Estratégia de chunking pra XMLs jPDL 3.2 do PJe.
 *
 * Os XMLs do PJe variam de 5KB a 200KB. text-embedding-004 aceita até
 * 2048 tokens (~8000 chars). Chunkamos em ~1500 chars com overlap de 200
 * pra preservar contexto através das fronteiras.
 *
 * Tenta quebrar em limites naturais (>, fim de linha) antes de cortar
 * no meio de uma palavra.
 */
const TARGET_CHARS = 1500;
const OVERLAP = 200;

export function chunkXml(xml: string): string[] {
  const text = xml.trim();
  if (text.length === 0) return [];
  if (text.length <= TARGET_CHARS) return [text];

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + TARGET_CHARS, text.length);
    let cut = end;

    if (end < text.length) {
      // tenta quebrar em ">" mais próximo, depois em "\n", depois em " "
      const slice = text.slice(start, end);
      const lastGt = slice.lastIndexOf(">");
      const lastNl = slice.lastIndexOf("\n");
      const lastSp = slice.lastIndexOf(" ");
      const breakAt = Math.max(lastGt, lastNl, lastSp);
      if (breakAt > TARGET_CHARS * 0.5) {
        cut = start + breakAt + 1;
      }
    }

    const chunk = text.slice(start, cut).trim();
    if (chunk.length > 0) chunks.push(chunk);

    if (cut >= text.length) break;
    start = Math.max(cut - OVERLAP, start + 1);
  }

  return chunks;
}
