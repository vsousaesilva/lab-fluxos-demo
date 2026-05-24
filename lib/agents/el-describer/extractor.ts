// Extrai ELs (Expression Languages do Seam/JSF) de um XML jPDL/BPMN.
// Mesmo regex do lib/validator/parser.ts pra consistência.
const EL_REGEX = /[#$]\{[^}]+\}/g;

export type ExtractedEl = {
  code: string;
  count: number;
};

/**
 * Retorna ELs únicas + contagem dentro de um único XML.
 */
export function extractElsFromXml(xml: string): ExtractedEl[] {
  const counts = new Map<string, number>();
  const matches = xml.matchAll(EL_REGEX);
  for (const m of matches) {
    const raw = m[0].trim();
    counts.set(raw, (counts.get(raw) ?? 0) + 1);
  }
  return [...counts.entries()].map(([code, count]) => ({ code, count }));
}

/**
 * Pega snippets de contexto (linhas em volta de cada ocorrência) pra dar
 * pro LLM no describe — entender o uso, não só o código.
 *
 * @param maxSnippets quantos snippets devolver (default 6)
 * @param windowChars janela de chars antes/depois (default 120)
 */
export function getElSnippets(
  xml: string,
  code: string,
  maxSnippets = 6,
  windowChars = 120
): string[] {
  const out: string[] = [];
  // busca todas posições do código literal (sem regex pra evitar escapar metacaracteres)
  let from = 0;
  while (out.length < maxSnippets) {
    const idx = xml.indexOf(code, from);
    if (idx < 0) break;
    const start = Math.max(0, idx - windowChars);
    const end = Math.min(xml.length, idx + code.length + windowChars);
    let snippet = xml.slice(start, end);
    // colapsa whitespace pra não estourar tokens
    snippet = snippet.replace(/\s+/g, " ").trim();
    if (start > 0) snippet = "…" + snippet;
    if (end < xml.length) snippet = snippet + "…";
    out.push(snippet);
    from = idx + code.length;
  }
  return out;
}
