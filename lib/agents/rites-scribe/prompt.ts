import type { CeremonyTypeValue } from "./schema";

/**
 * Prompt portado do agente Java original (RitesScribeAgent),
 * com escopo institucional ajustado: atende a 5ª Região (TRF5 +
 * Seções Judiciárias vinculadas) como um todo.
 */
export const RITES_SCRIBE_SYSTEM_PROMPT = `Você é o Escriba de Ritos do Laboratório de Fluxos.
O Laboratório atende a 5ª Região da Justiça Federal — o TRF5 e
todas as Seções Judiciárias vinculadas (Ceará, Pernambuco, Alagoas,
Paraíba, Rio Grande do Norte e Sergipe) — nos fluxos do PJe.
Trabalha sob Scrum e apoia o Agile Master.

Tarefa: a partir das anotações/transcrição de uma cerimônia, produzir
uma ata estruturada, objetiva e fiel ao que foi dito (não invente
fatos, decisões ou nomes).

Responda EXCLUSIVAMENTE com JSON válido, sem texto antes ou depois,
sem cercas de código, exatamente nesta estrutura:
{
  "title": "título curto da ata",
  "summary": "resumo objetivo da cerimônia",
  "participants": ["nomes citados"],
  "sections": [
    { "title": "nome da seção", "items": ["ponto 1", "..."] }
  ],
  "actionItems": [
    { "description": "ação", "owner": "responsável", "dueDate": "prazo" }
  ]
}

Regras:
- Escreva em português (Brasil), formal e técnico.
- Use as seções recomendadas para o tipo de cerimônia informado.
- Extraia itens de ação com responsável e prazo quando houver.
- NÃO invente números de processo, CPF, CNPJ ou nomes de partes.
- Se algo não foi dito, omita — não preencha por suposição.`;

const RECOMMENDED_SECTIONS: Record<CeremonyTypeValue, string> = {
  STANDUP: "Andamento por pessoa; Impedimentos; Combinados",
  PLANNING: "Objetivo da sprint; Escopo acordado; Capacidade; Riscos",
  REVIEW: "Entregue; Não entregue; Feedback dos stakeholders",
  RETRO: "Manter; Parar; Começar",
};

const CEREMONY_LABEL: Record<CeremonyTypeValue, string> = {
  STANDUP: "Daily / Standup",
  PLANNING: "Planning",
  REVIEW: "Review",
  RETRO: "Retro",
};

export function ceremonyLabel(type: CeremonyTypeValue): string {
  return CEREMONY_LABEL[type];
}

export function recommendedSectionsFor(type: CeremonyTypeValue): string {
  return RECOMMENDED_SECTIONS[type];
}

export function buildRitesScribeUserPrompt(opts: {
  type: CeremonyTypeValue;
  rawNotes: string;
  additionalContext?: string;
}): string {
  let prompt = `TIPO DE CERIMÔNIA: ${opts.type}`;
  prompt += `\nSEÇÕES RECOMENDADAS: ${RECOMMENDED_SECTIONS[opts.type]}`;
  prompt += `\n\nANOTAÇÕES/TRANSCRIÇÃO:\n${opts.rawNotes}`;
  if (opts.additionalContext && opts.additionalContext.trim()) {
    prompt += `\n\nCONTEXTO ADICIONAL:\n${opts.additionalContext.trim()}`;
  }
  return prompt;
}

export function buildRitesSynopsis(
  type: CeremonyTypeValue,
  output: { actionItems?: unknown[] }
): string {
  const n = output.actionItems?.length ?? 0;
  return `Ata ${type} — ${n} ação(ões)`;
}
