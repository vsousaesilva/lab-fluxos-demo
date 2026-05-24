export type Severity = "ERROR" | "WARNING" | "INFO";

export type Finding = {
  ruleCode: string;
  severity: Severity;
  message: string;
  location: string | null;
};

export function finding(
  ruleCode: string,
  severity: Severity,
  message: string,
  location: string | null = null
): Finding {
  return { ruleCode, severity, message, location };
}

export type FlowNodeKind = "START" | "END" | "TASK" | "DECISION" | "OTHER";

export type FlowNode = {
  key: string;
  displayName: string;
  kind: FlowNodeKind;
};

export type FlowTransition = {
  from: string | null;
  to: string | null;
  name: string | null;
};

export type FlowDialect = "JPDL" | "BPMN";

export type FlowGraph = {
  processName: string | null;
  dialect: FlowDialect;
  /** key = node.key (Map preserva ordem de inserção, igual LinkedHashMap do Java) */
  nodes: Map<string, FlowNode>;
  transitions: FlowTransition[];
  expressionLanguageRefs: string[];
};

export type ValidationOutcome = {
  processName: string | null;
  dialect: FlowDialect | null;
  findings: Finding[];
  errorCount: number;
  warningCount: number;
  infoCount: number;
  passed: boolean;
};

export class FlowParseError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "FlowParseError";
  }
}
