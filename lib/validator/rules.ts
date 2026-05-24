import { finding, type Finding, type FlowGraph } from "./types";

/**
 * As 6 LintRules portadas verbatim do projeto Java.
 * Cada regra implementa a mesma interface: `(graph) => Finding[]`.
 */

export type LintRule = {
  code: string;
  apply: (graph: FlowGraph) => Finding[];
};

// ============================================================
// PJE-END — o fluxo deve ter pelo menos um nó de fim
// ============================================================
export const hasEndRule: LintRule = {
  code: "PJE-END",
  apply(graph) {
    let hasEnd = false;
    for (const node of graph.nodes.values()) {
      if (node.kind === "END") {
        hasEnd = true;
        break;
      }
    }
    if (!hasEnd) {
      return [finding("PJE-END", "ERROR", "O fluxo não possui nó de fim.")];
    }
    return [];
  },
};

// ============================================================
// PJE-START — o fluxo deve ter exatamente um nó de início
// ============================================================
export const singleStartRule: LintRule = {
  code: "PJE-START",
  apply(graph) {
    let starts = 0;
    for (const node of graph.nodes.values()) {
      if (node.kind === "START") starts += 1;
    }
    if (starts === 0) {
      return [
        finding("PJE-START", "ERROR", "O fluxo não possui nó de início."),
      ];
    }
    if (starts > 1) {
      return [
        finding(
          "PJE-START",
          "WARNING",
          `O fluxo possui ${starts} nós de início (esperado 1).`
        ),
      ];
    }
    return [];
  },
};

// ============================================================
// PJE-DEADEND — nó não-final sem transição de saída
// ============================================================
export const deadEndRule: LintRule = {
  code: "PJE-DEADEND",
  apply(graph) {
    const withOutgoing = new Set<string>();
    for (const t of graph.transitions) {
      if (t.from) withOutgoing.add(t.from);
    }
    const findings: Finding[] = [];
    for (const node of graph.nodes.values()) {
      if (node.kind !== "END" && !withOutgoing.has(node.key)) {
        findings.push(
          finding(
            "PJE-DEADEND",
            "WARNING",
            "Nó sem transição de saída e que não é nó de fim.",
            node.key
          )
        );
      }
    }
    return findings;
  },
};

// ============================================================
// PJE-UNREACHABLE — nós não alcançáveis a partir dos starts
// ============================================================
export const unreachableNodeRule: LintRule = {
  code: "PJE-UNREACHABLE",
  apply(graph) {
    const starts: string[] = [];
    for (const node of graph.nodes.values()) {
      if (node.kind === "START") starts.push(node.key);
    }
    if (starts.length === 0) return [];

    const visited = new Set<string>();
    const queue: string[] = [...starts];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      for (const t of graph.transitions) {
        if (t.from === current && t.to && !visited.has(t.to)) {
          queue.push(t.to);
        }
      }
    }

    const findings: Finding[] = [];
    for (const node of graph.nodes.values()) {
      if (!visited.has(node.key)) {
        findings.push(
          finding(
            "PJE-UNREACHABLE",
            "WARNING",
            "Nó inalcançável a partir do início.",
            node.key
          )
        );
      }
    }
    return findings;
  },
};

// ============================================================
// PJE-DANGLING — transição aponta pra nó inexistente / parte de nó inexistente
// ============================================================
export const danglingTransitionRule: LintRule = {
  code: "PJE-DANGLING",
  apply(graph) {
    const findings: Finding[] = [];
    for (const t of graph.transitions) {
      if (!t.to || t.to.length === 0) {
        findings.push(
          finding(
            "PJE-DANGLING",
            "ERROR",
            "Transição sem destino definido.",
            `origem: ${t.from ?? "?"}`
          )
        );
      } else if (!graph.nodes.has(t.to)) {
        findings.push(
          finding(
            "PJE-DANGLING",
            "ERROR",
            `Transição aponta para nó inexistente: '${t.to}'.`,
            `origem: ${t.from ?? "?"}`
          )
        );
      }
      if (t.from && !graph.nodes.has(t.from)) {
        findings.push(
          finding(
            "PJE-DANGLING",
            "ERROR",
            `Transição parte de nó inexistente: '${t.from}'.`,
            `destino: ${t.to ?? "?"}`
          )
        );
      }
    }
    return findings;
  },
};

// ============================================================
// PJE-EL — catálogo informativo de Expression Languages usadas
// ============================================================
const EL_PREVIEW = 10;

export const expressionLanguageInfoRule: LintRule = {
  code: "PJE-EL",
  apply(graph) {
    const els = graph.expressionLanguageRefs;
    if (els.length === 0) return [];
    const preview = els.slice(0, EL_PREVIEW).join(", ");
    const suffix = els.length > EL_PREVIEW ? ` (+${els.length - EL_PREVIEW})` : "";
    return [
      finding(
        "PJE-EL",
        "INFO",
        `${els.length} expressão(ões) (EL) detectada(s): ${preview}${suffix}`
      ),
    ];
  },
};

// ============================================================
// Registry (ordem fixa para output previsível)
// ============================================================
export const allRules: LintRule[] = [
  hasEndRule,
  singleStartRule,
  deadEndRule,
  unreachableNodeRule,
  danglingTransitionRule,
  expressionLanguageInfoRule,
];
