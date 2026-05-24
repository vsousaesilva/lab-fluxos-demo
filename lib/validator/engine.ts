import { parseFlow } from "./parser";
import { allRules, type LintRule } from "./rules";
import {
  FlowParseError,
  finding,
  type Finding,
  type Severity,
  type ValidationOutcome,
} from "./types";

/**
 * Roda todas as `allRules` contra o XML informado. Erro de parsing
 * vira um finding ERROR `PJE-XML` para que a UI mostre algo coerente
 * em vez de explodir.
 */
export function validateFlow(
  xml: string,
  rules: LintRule[] = allRules
): ValidationOutcome {
  try {
    const graph = parseFlow(xml);

    const findings: Finding[] = [];
    for (const rule of rules) {
      try {
        findings.push(...rule.apply(graph));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        findings.push(
          finding(
            rule.code,
            "WARNING",
            `A regra não pôde ser avaliada: ${message}`
          )
        );
      }
    }

    const errorCount = countBy(findings, "ERROR");
    const warningCount = countBy(findings, "WARNING");
    const infoCount = countBy(findings, "INFO");

    return {
      processName: graph.processName,
      dialect: graph.dialect,
      findings,
      errorCount,
      warningCount,
      infoCount,
      passed: errorCount === 0,
    };
  } catch (err) {
    if (err instanceof FlowParseError) {
      const f = finding("PJE-XML", "ERROR", err.message);
      return {
        processName: null,
        dialect: null,
        findings: [f],
        errorCount: 1,
        warningCount: 0,
        infoCount: 0,
        passed: false,
      };
    }
    throw err;
  }
}

function countBy(findings: Finding[], severity: Severity): number {
  return findings.reduce((n, f) => (f.severity === severity ? n + 1 : n), 0);
}
