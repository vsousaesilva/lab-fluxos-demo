import { z } from "zod";

/**
 * Spec estruturado que o LLM devolve para o Designer BPMN.
 * O BPMN 2.0 XML é renderizado por `renderer.ts` (port de BpmnRenderer).
 *
 * Vocabulário — kind: TASK | GATEWAY | END.
 * O StartEvent "Início" é criado automaticamente pelo renderer.
 */

export const bpmnTransitionSpecSchema = z.object({
  to: z.string().min(1).max(200),
  name: z.string().min(1).max(200).nullable().optional(),
});

export const bpmnNodeSpecSchema = z.object({
  kind: z.enum(["TASK", "GATEWAY", "END"]),
  name: z.string().min(1).max(200),
  transitions: z.array(bpmnTransitionSpecSchema).max(10).optional().default([]),
});

export const bpmnFlowSpecSchema = z.object({
  processName: z.string().min(1).max(200),
  startNode: z.string().min(1).max(200),
  nodes: z.array(bpmnNodeSpecSchema).min(1).max(30),
});

export type BpmnFlowSpec = z.infer<typeof bpmnFlowSpecSchema>;
export type BpmnNodeSpec = z.infer<typeof bpmnNodeSpecSchema>;
export type BpmnTransitionSpec = z.infer<typeof bpmnTransitionSpecSchema>;
