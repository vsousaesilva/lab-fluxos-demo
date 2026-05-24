import type { UserStory } from "@/lib/db/schema";

/**
 * Renderiza uma HU como Markdown no template oficial da JFCE
 * (História de Usuário): Visão de Usuário, Cenários, Regras de Negócio,
 * Fluxo, Referências. Usado como input do Gerador de XML PJe.
 *
 * Port de `UserStoryRenderer.java`.
 */
export function userStoryToMarkdown(hu: UserStory): string {
  const lines: string[] = [];
  lines.push("# História de Usuário");
  lines.push(`## ${hu.title}`);
  lines.push("");

  lines.push("### 1) VISÃO DE USUÁRIO");
  lines.push(`**Como** ${hu.asA}`);
  lines.push("");
  lines.push(`**Quero (solução)** ${hu.iWant}`);
  lines.push("");
  lines.push(`**Para (problema)** ${hu.soThat}`);
  lines.push("");

  lines.push("### 2) CENÁRIOS");
  let i = 1;
  for (const s of hu.scenarios) {
    lines.push(`**Cenário ${i++} — ${s.name}**`);
    lines.push(`**Dado** ${s.given}`);
    lines.push(`**Quando** ${s.when}`);
    lines.push(`**Então** ${s.then}`);
    if (s.and) {
      for (const a of s.and) {
        lines.push(`**E** ${a}`);
      }
    }
    lines.push("");
  }

  lines.push("### 3) REGRAS DE NEGÓCIO");
  for (const rn of hu.businessRules) {
    lines.push(`**${rn.code} — ${rn.title}**`);
    lines.push(rn.description);
    lines.push("");
  }

  lines.push("### 4) FLUXO");
  lines.push("_A modelar pelo agente Designer de Fluxo BPMN._");
  lines.push("");

  lines.push("### 5) REFERÊNCIAS");
  lines.push(hu.references && hu.references.trim() ? hu.references : "N/a");

  return lines.join("\n");
}
