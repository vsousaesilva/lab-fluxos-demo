import type { GeneratedFlowSpec, NodeSpec, TransitionSpec } from "./schema";

/**
 * Renderiza determinísticamente um `GeneratedFlowSpec` em XML jPDL 3.2
 * no padrão exato dos fluxos produtivos do PJe: prolog ISO-8859-1,
 * namespace jpdl-3.2, swimlanes Secretaria + "Nó de Desvio",
 * estados Início/Término e o bloco invariável PROCESS-EVENTS.
 *
 * O LLM nunca escreve XML cru — sintaxe e boilerplate garantidos aqui.
 * Port de `PjeJpdlRenderer.java`.
 */

const END_STATE = "Término";
const START_STATE = "Início";
const DEFAULT_SWIMLANE = "Secretaria";

const PROCESS_EVENT_TYPES = [
  "superstate-enter",
  "process-start",
  "before-signal",
  "task-end",
  "task-create",
  "subprocess-created",
  "task-assign",
  "transition",
  "after-signal",
  "timer",
  "task-start",
  "subprocess-end",
  "process-end",
  "node-leave",
  "superstate-leave",
  "node-enter",
];

export function renderJpdlXml(spec: GeneratedFlowSpec): string {
  if (!spec.nodes || spec.nodes.length === 0) {
    throw new Error("Especificação de fluxo vazia — não há nós para gerar.");
  }
  const processName = required(spec.processName, "processName");
  const desvioSwimlane = `Nó de Desvio - ${processName}`;
  const startNode =
    spec.startNode && spec.startNode.trim().length > 0
      ? spec.startNode
      : spec.nodes[0].name;

  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="ISO-8859-1"?>');
  lines.push("");
  lines.push(
    `<process-definition xmlns="urn:jbpm.org:jpdl-3.2" name="${esc(processName)}">`
  );
  lines.push(`    <description><![CDATA[.]]></description>`);

  // SWIMLANES
  lines.push(`    <swimlane name="${esc(DEFAULT_SWIMLANE)}">`);
  lines.push(
    `        <assignment pooled-actors="#{localizacaoAssignment.getPooledActors('')}"/>`
  );
  lines.push(`    </swimlane>`);
  lines.push(`    <swimlane name="${esc(desvioSwimlane)}">`);
  lines.push(
    `        <assignment pooled-actors="#{localizacaoAssignment.getPooledActors('')}"/>`
  );
  lines.push(`    </swimlane>`);

  // START-STATE
  lines.push(`    <start-state name="${esc(START_STATE)}">`);
  lines.push(
    `        <task name="Tarefa inicial" swimlane="${esc(DEFAULT_SWIMLANE)}" priority="3"/>`
  );
  lines.push(
    `        <transition to="${esc(startNode)}" name="${esc(startNode)}"/>`
  );
  lines.push(`    </start-state>`);

  // NODES
  for (const node of spec.nodes) {
    renderNode(node, lines);
  }

  // END-STATE
  lines.push(`    <end-state name="${esc(END_STATE)}"/>`);

  // Nó de Desvio (presente em todos os fluxos PJe)
  lines.push(`    <task-node end-tasks="true" name="${esc(desvioSwimlane)}">`);
  lines.push(
    `        <task name="${esc(desvioSwimlane)}" swimlane="${esc(desvioSwimlane)}" priority="3"/>`
  );
  lines.push(
    `        <transition to="${esc(END_STATE)}" name="${esc(END_STATE)}"/>`
  );
  lines.push(
    `        <transition to="${esc(startNode)}" name="${esc(startNode)}"/>`
  );
  lines.push(`    </task-node>`);

  // PROCESS-EVENTS (invariável)
  for (const t of PROCESS_EVENT_TYPES) {
    lines.push(`    <event type="${t}">`);
    lines.push(
      `        <script>br.com.infox.ibpm.util.JbpmEvents.raiseEvent(executionContext)</script>`
    );
    lines.push(`    </event>`);
  }

  lines.push(`</process-definition>`);
  return lines.join("\n") + "\n";
}

function renderNode(node: NodeSpec, lines: string[]): void {
  const name = required(node.name, "node.name");
  const kind = (node.kind ?? "NODE").toUpperCase();
  if (kind === "TASK") {
    renderTaskNode(node, name, lines);
  } else if (kind === "DECISION") {
    renderDecision(node, name, lines);
  } else {
    renderPlainNode(node, name, lines);
  }
}

function renderTaskNode(node: NodeSpec, name: string, lines: string[]): void {
  const swimlane =
    node.swimlane && node.swimlane.trim().length > 0
      ? node.swimlane
      : DEFAULT_SWIMLANE;
  lines.push(`    <task-node end-tasks="true" name="${esc(name)}">`);
  lines.push(
    `        <task name="${esc(name)}" swimlane="${esc(swimlane)}" priority="3"/>`
  );
  renderTransitions(node.transitions, lines);
  const hasDefault = node.transitions?.some((t) => t.name === "default");
  if (hasDefault) {
    lines.push(`        <event type="task-create">`);
    lines.push(
      `            <action expression="#{taskInstanceUtil.setFrameDefaultTransition('default')}"/>`
    );
    lines.push(`        </event>`);
  }
  lines.push(`    </task-node>`);
}

function renderDecision(node: NodeSpec, name: string, lines: string[]): void {
  const expr =
    node.decisionExpression && node.decisionExpression.trim().length > 0
      ? node.decisionExpression
      : "#{true}";
  lines.push(`    <decision expression="${esc(expr)}" name="${esc(name)}">`);
  renderTransitions(node.transitions, lines);
  lines.push(`    </decision>`);
}

function renderPlainNode(node: NodeSpec, name: string, lines: string[]): void {
  lines.push(`    <node name="${esc(name)}">`);
  renderTransitions(node.transitions, lines);
  if (node.actions && node.actions.length > 0) {
    lines.push(`        <event type="node-enter">`);
    for (const action of node.actions) {
      lines.push(`            <action expression="${esc(action)}"/>`);
    }
    lines.push(`        </event>`);
  }
  lines.push(`    </node>`);
}

function renderTransitions(
  transitions: TransitionSpec[] | undefined,
  lines: string[]
): void {
  if (!transitions) return;
  for (const t of transitions) {
    const to = required(t.to, "transition.to");
    const tName = t.name && t.name.trim().length > 0 ? t.name : to;
    if (t.condition && t.condition.trim().length > 0) {
      lines.push(`        <transition to="${esc(to)}" name="${esc(tName)}">`);
      lines.push(
        `            <condition expression="${esc(t.condition)}"/>`
      );
      lines.push(`        </transition>`);
    } else {
      lines.push(`        <transition to="${esc(to)}" name="${esc(tName)}"/>`);
    }
  }
}

function required(value: string | undefined | null, field: string): string {
  if (!value || value.trim().length === 0) {
    throw new Error(`Campo obrigatório ausente na especificação: ${field}`);
  }
  return value;
}

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
