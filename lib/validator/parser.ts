import { XMLParser } from "fast-xml-parser";
import {
  FlowParseError,
  type FlowGraph,
  type FlowNode,
  type FlowNodeKind,
  type FlowTransition,
} from "./types";

/**
 * Parser portado de `PjeFlowParser.java`. Suporta jBPM jPDL 3.2
 * (root `process-definition`) e BPMN 2.0 (root `definitions`).
 * A extração é deliberadamente tolerante — as 6 LintRules é que reportam
 * problemas estruturais; o parser só normaliza o XML em um grafo.
 */

// PJe usa EL Seam/JSF no formato #{...}; ${...} é aceito por robustez.
const EL_REGEX = /[#$]\{[^}]+\}/g;

const JPDL_START_TAGS = new Set(["start-state"]);
const JPDL_END_TAGS = new Set(["end-state"]);
const JPDL_DECISION_TAGS = new Set(["decision"]);
const JPDL_NODE_TAGS = new Set([
  "start-state",
  "end-state",
  "state",
  "task-node",
  "node",
  "decision",
  "fork",
  "join",
  "super-state",
  "process-state",
]);

const BPMN_START_TAGS = new Set(["startEvent"]);
const BPMN_END_TAGS = new Set(["endEvent"]);
const BPMN_DECISION_TAGS = new Set([
  "exclusiveGateway",
  "inclusiveGateway",
  "parallelGateway",
  "complexGateway",
  "eventBasedGateway",
]);
const BPMN_NODE_TAGS = new Set([
  "startEvent",
  "endEvent",
  "task",
  "userTask",
  "serviceTask",
  "scriptTask",
  "manualTask",
  "businessRuleTask",
  "sendTask",
  "receiveTask",
  "callActivity",
  "subProcess",
  "exclusiveGateway",
  "inclusiveGateway",
  "parallelGateway",
  "complexGateway",
  "eventBasedGateway",
  "intermediateCatchEvent",
  "intermediateThrowEvent",
  "boundaryEvent",
]);

type RawEntry = Record<string, unknown>;

function newParser() {
  return new XMLParser({
    preserveOrder: true,
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    removeNSPrefix: true,
    trimValues: true,
    parseAttributeValue: false,
    processEntities: true,
    allowBooleanAttributes: true,
  });
}

function tagOf(entry: RawEntry): string {
  for (const k of Object.keys(entry)) {
    if (k !== ":@") return k;
  }
  return "";
}

function attrsOf(entry: RawEntry): Record<string, string> {
  const raw = entry[":@"] as Record<string, unknown> | undefined;
  if (!raw) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v == null) continue;
    const key = k.startsWith("@_") ? k.slice(2) : k;
    out[key] = String(v);
  }
  return out;
}

function attrOrNull(attrs: Record<string, string>, name: string): string | null {
  const v = attrs[name];
  return v && v.length > 0 ? v : null;
}

function childrenOf(entry: RawEntry): RawEntry[] {
  const tag = tagOf(entry);
  const children = entry[tag];
  if (!Array.isArray(children)) return [];
  return (children as RawEntry[]).filter(
    (c) => typeof c === "object" && c !== null && tagOf(c) !== ""
  );
}

function findFirst(entry: RawEntry, target: string): RawEntry | null {
  if (tagOf(entry) === target) return entry;
  for (const c of childrenOf(entry)) {
    const found = findFirst(c, target);
    if (found) return found;
  }
  return null;
}

function collectDescendants(entry: RawEntry, acc: RawEntry[]): void {
  for (const c of childrenOf(entry)) {
    acc.push(c);
    collectDescendants(c, acc);
  }
}

function collectExpressionLanguageRefs(xml: string): string[] {
  const found: string[] = [];
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  EL_REGEX.lastIndex = 0;
  while ((m = EL_REGEX.exec(xml)) !== null) {
    const expr = m[0];
    if (!seen.has(expr)) {
      seen.add(expr);
      found.push(expr);
    }
  }
  return found;
}

function jpdlKind(tag: string): FlowNodeKind {
  if (JPDL_START_TAGS.has(tag)) return "START";
  if (JPDL_END_TAGS.has(tag)) return "END";
  if (JPDL_DECISION_TAGS.has(tag)) return "DECISION";
  if (tag === "task-node" || tag === "state") return "TASK";
  return "OTHER";
}

function bpmnKind(tag: string): FlowNodeKind {
  if (BPMN_START_TAGS.has(tag)) return "START";
  if (BPMN_END_TAGS.has(tag)) return "END";
  if (BPMN_DECISION_TAGS.has(tag)) return "DECISION";
  if (tag.endsWith("Task")) return "TASK";
  return "OTHER";
}

export function parseFlow(xml: string): FlowGraph {
  if (!xml || xml.trim().length === 0) {
    throw new FlowParseError("XML vazio");
  }

  let tree: RawEntry[];
  try {
    tree = newParser().parse(xml) as RawEntry[];
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new FlowParseError(`XML mal formado: ${message}`, { cause: err });
  }

  // Ignora declarações XML iniciais (<?xml ... ?>) — fast-xml-parser as inclui
  // como entrada com tag "?xml" em preserveOrder mode.
  const root = tree.find((e) => {
    const t = tagOf(e);
    return t !== "" && !t.startsWith("?");
  });

  if (!root) {
    throw new FlowParseError("XML sem elemento raiz reconhecível");
  }

  const els = collectExpressionLanguageRefs(xml);
  const rootTag = tagOf(root);

  if (rootTag === "definitions") {
    return parseBpmn(root, els);
  }
  return parseJpdl(root, els);
}

function parseJpdl(root: RawEntry, els: string[]): FlowGraph {
  const rootAttrs = attrsOf(root);
  const processName = attrOrNull(rootAttrs, "name");
  const nodes = new Map<string, FlowNode>();
  const transitions: FlowTransition[] = [];

  for (const child of childrenOf(root)) {
    const tag = tagOf(child);
    if (!JPDL_NODE_TAGS.has(tag)) continue;

    const attrs = attrsOf(child);
    let name = attrOrNull(attrs, "name");
    if (!name) {
      name = `${tag}@${nodes.size}`;
    }
    if (!nodes.has(name)) {
      nodes.set(name, { key: name, displayName: name, kind: jpdlKind(tag) });
    }
    for (const t of childrenOf(child)) {
      if (tagOf(t) === "transition") {
        const tAttrs = attrsOf(t);
        transitions.push({
          from: name,
          to: attrOrNull(tAttrs, "to"),
          name: attrOrNull(tAttrs, "name"),
        });
      }
    }
  }

  return {
    processName,
    dialect: "JPDL",
    nodes,
    transitions,
    expressionLanguageRefs: els,
  };
}

function parseBpmn(root: RawEntry, els: string[]): FlowGraph {
  const process = findFirst(root, "process");
  if (!process) {
    return {
      processName: null,
      dialect: "BPMN",
      nodes: new Map(),
      transitions: [],
      expressionLanguageRefs: els,
    };
  }

  const pAttrs = attrsOf(process);
  const processName = attrOrNull(pAttrs, "name") ?? attrOrNull(pAttrs, "id");

  const nodes = new Map<string, FlowNode>();
  const transitions: FlowTransition[] = [];

  const descendants: RawEntry[] = [];
  collectDescendants(process, descendants);

  for (const el of descendants) {
    const tag = tagOf(el);
    if (BPMN_NODE_TAGS.has(tag)) {
      const attrs = attrsOf(el);
      const id = attrOrNull(attrs, "id");
      if (!id) continue;
      const display = attrOrNull(attrs, "name") ?? id;
      if (!nodes.has(id)) {
        nodes.set(id, { key: id, displayName: display, kind: bpmnKind(tag) });
      }
    } else if (tag === "sequenceFlow") {
      const attrs = attrsOf(el);
      transitions.push({
        from: attrOrNull(attrs, "sourceRef"),
        to: attrOrNull(attrs, "targetRef"),
        name: attrOrNull(attrs, "name"),
      });
    }
  }

  return {
    processName,
    dialect: "BPMN",
    nodes,
    transitions,
    expressionLanguageRefs: els,
  };
}
