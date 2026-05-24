import { z } from "zod";

export const DEMAND_STATUSES = ["REGISTERED", "APPROVED", "REJECTED"] as const;

export const demandStatusSchema = z.enum(DEMAND_STATUSES);

export const createDemandSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Mínimo 3 caracteres")
    .max(140, "Máximo 140 caracteres"),
  description: z
    .string()
    .trim()
    .min(10, "Descreva a demanda em pelo menos 10 caracteres")
    .max(5000, "Máximo 5000 caracteres"),
  requesterName: z
    .string()
    .trim()
    .min(2, "Informe o solicitante")
    .max(120, "Máximo 120 caracteres"),
});

export type CreateDemandInput = z.infer<typeof createDemandSchema>;

export const updateDemandSchema = createDemandSchema.partial().extend({
  id: z.string().uuid(),
});

export type UpdateDemandInput = z.infer<typeof updateDemandSchema>;

export const setDemandStatusSchema = z.object({
  id: z.string().uuid(),
  status: demandStatusSchema,
});

export type SetDemandStatusInput = z.infer<typeof setDemandStatusSchema>;
