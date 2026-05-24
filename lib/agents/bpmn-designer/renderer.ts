import type { BpmnFlowSpec, BpmnNodeSpec } from "./schema";

/**
 * Renderer BPMN 2.0 com layout DI manual (left-to-right, espaçado).
 *
 * Como o `bpmn-auto-layout` quebra o build do Next/OpenNext (duplicação de
 * React no SSR), fazemos um layout linear simples aqui. Para fluxos com
 * gateways e ramificações, recomendamos abrir no bpmn.io / Bizagi Modeler
 * / Camunda Modeler e usar "Auto-arrange" / "Apply automatic layout".
 *
 * O XML também é enriquecido com `xmlns:xsi` + `exporter`/`exporterVersion`
 * para compatibilidade com validadores mais rígidos como o Bizagi.
 */

const CENTER_Y = 240;
const START_X = 180;
const STEP_X = 260; // espaçamento generoso entre nós

type ElType = "START" | "TASK" | "GATEWAY" | "END";

type Element = {
  id: string;
  type: ElType;
  name: string;
  x: number;
};

type Edge = {
  id: string;
  source: string;
  target: string;
  name: string | null;
};

function widthOf(t: ElType): number {
  if (t === "START" || t === "END") return 36;
  if (t === "GATEWAY") return 50;
  return 130;
}

function heightOf(t: ElType): number {
  if (t === "START" || t === "END") return 36;
  if (t === "GATEWAY") return 50;
  return 84;
}

function topY(t: ElType): number {
  return CENTER_Y - heightOf(t) / 2;
}

function rightX(el: Element): number {
  return el.x + widthOf(el.type);
}

function buildModel(spec: BpmnFlowSpec): { els: Element[]; edges: Edge[] } {
  if (!spec.nodes || spec.nodes.length === 0) {
    throw new Error("Especificação BPMN vazia — não há nós para gerar.");
  }

  const byName = new Map<string, Element>();
  const els: Element[] = [];

  const start: Element = {
    id: "StartEvent_1",
    type: "START",
    name: "Início",
    x: START_X,
  };
  byName.set("Início", start);
  els.push(start);

  let i = 1;
  let cursorX = START_X + STEP_X;
  for (const n of spec.nodes) {
    const name = required(n.name, "node.name");
    const kind = (n.kind ?? "TASK").toUpperCase() as ElType;
    const type: ElType =
      kind === "GATEWAY" ? "GATEWAY" : kind === "END" ? "END" : "TASK";
    const id =
      type === "GATEWAY"
        ? `Gateway_${i}`
        : type === "END"
          ? `EndEvent_${i}`
          : `Activity_${i}`;
    const el: Element = { id, type, name, x: cursorX };
    byName.set(name, el);
    els.push(el);
    i++;
    cursorX += STEP_X;
  }

  const startNode =
    spec.startNode && spec.startNode.trim().length > 0
      ? spec.startNode
      : spec.nodes[0].name;

  const edges: Edge[] = [];
  let f = 1;
  edges.push({
    id: `Flow_${f++}`,
    source: start.id,
    target: resolveId(byName, startNode),
    name: null,
  });
  for (const n of spec.nodes) {
    const fromEl = byName.get(n.name);
    if (!fromEl) continue;
    for (const t of n.transitions ?? []) {
      const to = required(t.to, "transition.to");
      edges.push({
        id: `Flow_${f++}`,
        source: fromEl.id,
        target: resolveId(byName, to),
        name: t.name && t.name.trim().length > 0 ? t.name : null,
      });
    }
  }

  return { els, edges };
}

export function renderBpmnXml(spec: BpmnFlowSpec): string {
  const processName = required(spec.processName, "processName");
  const { els, edges } = buildModel(spec);

  const incoming = new Map<string, string[]>();
  const outgoing = new Map<string, string[]>();
  for (const e of edges) {
    pushTo(outgoing, e.source, e.id);
    pushTo(incoming, e.target, e.id);
  }

  const lines: string[] = [];
  lines.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  lines.push(
    `<bpmn:definitions ` +
      `xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" ` +
      `xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" ` +
      `xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" ` +
      `xmlns:di="http://www.omg.org/spec/DD/20100524/DI" ` +
      `xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ` +
      `id="Definitions_1" ` +
      `targetNamespace="http://bpmn.io/schema/bpmn" ` +
      `exporter="Laboratorio de Fluxos" exporterVersion="1.0">`
  );
  lines.push(
    `  <bpmn:process id="Process_1" name="${esc(processName)}" isExecutable="false">`
  );

  for (const el of els) {
    const tag =
      el.type === "START"
        ? "startEvent"
        : el.type === "END"
          ? "endEvent"
          : el.type === "GATEWAY"
            ? "exclusiveGateway"
            : "task";
    lines.push(`    <bpmn:${tag} id="${el.id}" name="${esc(el.name)}">`);
    for (const inId of incoming.get(el.id) ?? []) {
      lines.push(`      <bpmn:incoming>${inId}</bpmn:incoming>`);
    }
    for (const outId of outgoing.get(el.id) ?? []) {
      lines.push(`      <bpmn:outgoing>${outId}</bpmn:outgoing>`);
    }
    lines.push(`    </bpmn:${tag}>`);
  }

  for (const e of edges) {
    const nameAttr = e.name ? ` name="${esc(e.name)}"` : "";
    lines.push(
      `    <bpmn:sequenceFlow id="${e.id}" sourceRef="${e.source}" targetRef="${e.target}"${nameAttr}/>`
    );
  }
  lines.push(`  </bpmn:process>`);

  // BPMNDI (layout horizontal)
  lines.push(`  <bpmndi:BPMNDiagram id="BPMNDiagram_1">`);
  lines.push(`    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">`);

  const byId = new Map<string, Element>();
  for (const el of els) byId.set(el.id, el);

  for (const el of els) {
    lines.push(
      `      <bpmndi:BPMNShape id="${el.id}_di" bpmnElement="${el.id}">`
    );
    lines.push(
      `        <dc:Bounds x="${el.x}" y="${topY(el.type)}" width="${widthOf(el.type)}" height="${heightOf(el.type)}"/>`
    );
    lines.push(`      </bpmndi:BPMNShape>`);
  }
  for (const e of edges) {
    const s = byId.get(e.source);
    const t = byId.get(e.target);
    const sx = s ? rightX(s) : START_X;
    const tx = t ? t.x : START_X + STEP_X;
    lines.push(
      `      <bpmndi:BPMNEdge id="${e.id}_di" bpmnElement="${e.id}">`
    );
    lines.push(`        <di:waypoint x="${sx}" y="${CENTER_Y}"/>`);
    lines.push(`        <di:waypoint x="${tx}" y="${CENTER_Y}"/>`);
    lines.push(`      </bpmndi:BPMNEdge>`);
  }
  lines.push(`    </bpmndi:BPMNPlane>`);
  lines.push(`  </bpmndi:BPMNDiagram>`);
  lines.push(`</bpmn:definitions>`);
  return lines.join("\n") + "\n";
}

function resolveId(byName: Map<string, Element>, name: string): string {
  const el = byName.get(name);
  return el ? el.id : `Missing_${sanitize(name)}`;
}

function pushTo(map: Map<string, string[]>, key: string, value: string): void {
  const arr = map.get(key);
  if (arr) arr.push(value);
  else map.set(key, [value]);
}

function sanitize(name: string): string {
  return name.replace(/[^A-Za-z0-9_]/g, "_");
}

function required(value: string | undefined | null, field: string): string {
  if (!value || value.trim().length === 0) {
    throw new Error(`Campo obrigatório ausente na especificação BPMN: ${field}`);
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

// avoid unused warning
export type _Unused = BpmnNodeSpec;
