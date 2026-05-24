import type { RetrievedChunk } from "@/lib/rag/search";

/**
 * Prompt portado do agente Java original (PjeXmlGeneratorAgent),
 * com escopo institucional ajustado: atende a 5ª Região (TRF5 +
 * Seções Judiciárias vinculadas) como um todo.
 *
 * Saída JSON estruturada — o XML em si é renderizado por `renderer.ts`,
 * então o modelo só decide a lógica do fluxo (nomes, ELs, transições).
 */
export const PJE_XML_GENERATOR_SYSTEM_PROMPT = `Você é o Gerador de Fluxos do Laboratório de Fluxos.
O Laboratório atende a 5ª Região da Justiça Federal — o TRF5 e
todas as Seções Judiciárias vinculadas (Ceará, Pernambuco, Alagoas,
Paraíba, Rio Grande do Norte e Sergipe). Projeta fluxos do PJe
(jBPM jPDL 3.2).

Você NÃO escreve XML. Você devolve EXCLUSIVAMENTE um JSON válido,
sem texto antes/depois e sem cercas de código, nesta estrutura:
{
  "processName": "nome do processo/fluxo",
  "startNode": "nome do primeiro nó após o início",
  "nodes": [
    {
      "kind": "TASK | NODE | DECISION",
      "name": "nome do nó",
      "swimlane": "Secretaria",
      "decisionExpression": "#{...} (apenas para DECISION)",
      "actions": ["#{...} (apenas para NODE; ações node-enter)"],
      "transitions": [
        { "to": "nó destino", "name": "rótulo", "condition": "#{true} ou null" }
      ]
    }
  ]
}

Regras:
- Expression Language no formato Seam/JSF #{...} (NUNCA \${...}),
  seguindo o estilo dos fluxos de referência fornecidos.
- Todo caminho terminal deve transicionar para o nó "Término".
- DECISION deve ter expressão ternária retornando os nomes das
  transições; cada transição corresponde a um resultado.
- Não inclua swimlanes, start-state, end-state, "Nó de Desvio" nem
  process-events: tudo isso é gerado automaticamente.
- Português (Brasil), nomes de nós descritivos e acionáveis.
- Não invente serviços/EL inexistentes nos fluxos de referência;
  reaproveite os padrões observados.
- A solução vai rodar em qualquer Seção Judiciária da 5ª Região —
  não privilegie uma sobre as outras.`;

const REF_PREVIEW = 1800;

export function buildPjeXmlGeneratorUserPrompt(opts: {
  processName: string;
  specification: string;
  additionalContext?: string;
  references: RetrievedChunk[];
}): string {
  let prompt = "";
  if (opts.processName && opts.processName.trim()) {
    prompt += `NOME DO FLUXO: ${opts.processName}\n\n`;
  }
  prompt += `ESPECIFICAÇÃO (HU/regras):\n${opts.specification}`;
  if (opts.additionalContext && opts.additionalContext.trim()) {
    prompt += `\n\nCONTEXTO ADICIONAL:\n${opts.additionalContext.trim()}`;
  }
  prompt += "\n\nFLUXOS DE REFERÊNCIA (padrão de EL/estrutura a seguir):\n";
  if (opts.references.length === 0) {
    prompt +=
      "(nenhum fluxo de referência recuperado — siga o padrão jPDL 3.2 do PJe descrito nas regras)\n";
  } else {
    for (const c of opts.references) {
      prompt += `[${c.fileName}]\n${truncate(c.content, REF_PREVIEW)}\n---\n`;
    }
  }
  return prompt;
}

function truncate(s: string, max: number): string {
  if (!s) return "";
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

export function buildGeneratorSynopsis(opts: {
  passed: boolean;
  errorCount: number;
  warningCount: number;
}): string {
  return `XML gerado — ${opts.passed ? "PASSED" : "FAILED"} (${opts.errorCount} erro(s), ${opts.warningCount} aviso(s))`;
}
