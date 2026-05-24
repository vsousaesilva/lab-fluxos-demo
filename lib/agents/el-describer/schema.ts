import { z } from "zod";

export const EL_CATEGORIES = [
  "ASSINATURA",
  "TAREFA",
  "DECISAO",
  "DADO",
  "OUTRO",
] as const;

export const elDescriberOutputSchema = z.object({
  objective: z
    .string()
    .min(10, "Objetivo precisa ter ao menos 10 caracteres")
    .max(1500),
  category: z.enum(EL_CATEGORIES),
  tags: z.array(z.string().min(1).max(40)).max(8).default([]),
});

export type ElDescriberOutput = z.infer<typeof elDescriberOutputSchema>;
