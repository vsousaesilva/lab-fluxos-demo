import { z } from "zod";

/**
 * Spec estruturado que o LLM devolve. O XML em si é renderizado
 * deterministicamente por `renderer.ts` (PjeJpdlRenderer port), então
 * a sintaxe jPDL e o boilerplate invariável são garantidos — o modelo
 * só decide a lógica do fluxo.
 *
 * Vocabulário — kind: TASK | NODE | DECISION.
 * Caminhos terminais devem transicionar para "Término" (o end-state
 * é adicionado automaticamente pelo renderer).
 */

export const transitionSpecSchema = z.object({
  to: z.string().min(1).max(200),
  name: z.string().min(1).max(200),
  condition: z.string().max(500).nullable().optional(),
});

export const nodeSpecSchema = z.object({
  kind: z.enum(["TASK", "NODE", "DECISION"]),
  name: z.string().min(1).max(200),
  swimlane: z.string().max(200).nullable().optional(),
  decisionExpression: z.string().max(500).nullable().optional(),
  actions: z.array(z.string().min(1)).max(15).optional().default([]),
  transitions: z.array(transitionSpecSchema).min(1).max(15),
});

export const generatedFlowSpecSchema = z.object({
  processName: z.string().min(1).max(200),
  startNode: z.string().min(1).max(200),
  nodes: z.array(nodeSpecSchema).min(1).max(30),
});

export type GeneratedFlowSpec = z.infer<typeof generatedFlowSpecSchema>;
export type NodeSpec = z.infer<typeof nodeSpecSchema>;
export type TransitionSpec = z.infer<typeof transitionSpecSchema>;
