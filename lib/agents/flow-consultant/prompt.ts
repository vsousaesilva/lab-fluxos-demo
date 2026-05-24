import type { RetrievedChunk } from "@/lib/rag/search";

/**
 * Prompt portado do agente Java original (FlowConsultantAgent),
 * com escopo institucional ajustado: atende a 5ª Região da Justiça
 * Federal (TRF5 + Seções Judiciárias vinculadas) como um todo.
 */
export const FLOW_CONSULTANT_SYSTEM_PROMPT = `Você é o Consultor de Fluxos do Laboratório de Fluxos.
O Laboratório atende a 5ª Região da Justiça Federal — o TRF5 e
todas as Seções Judiciárias vinculadas (Ceará, Pernambuco, Alagoas,
Paraíba, Rio Grande do Norte e Sergipe) — nos fluxos do PJe (jBPM jPDL 3.2).

Responde dúvidas técnicas das equipes de desenvolvimento e de negócio.

Regras:
- Responda em português (Brasil), técnico e objetivo.
- Baseie-se EXCLUSIVAMENTE no CONTEXTO recuperado. Não invente nós,
  transições, Expression Languages ou comportamentos.
- Se o contexto for insuficiente, diga claramente que não há base
  suficiente nos fluxos indexados e sugira refinar a pergunta.
- Cite os fluxos usados pelo nome do arquivo/processo no formato
  [<fileName>] ao final da resposta ou inline.
- Não exponha dados sensíveis (números de processo, CPF, nomes de partes).
- Soluções devem atender a toda a 5ª Região; comportamentos específicos
  de uma Seção devem ser explicitados.`;

const CHUNK_PREVIEW = 1500;
const HISTORY_PREVIEW = 600;

export type ChatHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

export function buildConsultantUserPrompt(opts: {
  question: string;
  history?: ChatHistoryMessage[];
  chunks: RetrievedChunk[];
}): string {
  let prompt = "";

  if (opts.history && opts.history.length > 0) {
    prompt += "HISTÓRICO (resumido):\n";
    for (const m of opts.history) {
      prompt += `${m.role}: ${truncate(m.content, HISTORY_PREVIEW)}\n`;
    }
    prompt += "\n";
  }

  prompt += "CONTEXTO RECUPERADO:\n";
  if (opts.chunks.length === 0) {
    prompt += "(nenhum trecho relevante encontrado nos fluxos indexados)\n";
  } else {
    for (const c of opts.chunks) {
      prompt += `[Fluxo: ${c.fileName} | processo: ${c.processName ?? "?"}]\n`;
      prompt += `${truncate(c.content, CHUNK_PREVIEW)}\n---\n`;
    }
  }

  prompt += `\nPERGUNTA:\n${opts.question}`;
  return prompt;
}

function truncate(s: string, max: number): string {
  if (!s) return "";
  return s.length > max ? `${s.slice(0, max)}…` : s;
}
