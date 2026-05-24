import { z } from "zod";

export const scenarioSchema = z.object({
  name: z.string().min(1).max(200),
  given: z.string().min(1).max(1000),
  when: z.string().min(1).max(1000),
  then: z.string().min(1).max(1000),
  and: z.array(z.string().min(1)).max(10).optional(),
});

export const businessRuleSchema = z.object({
  code: z.string().regex(/^RN\d{2,3}$/, "Use RN01, RN02, RN03…"),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
});

export const userStoryWriterOutputSchema = z.object({
  title: z.string().min(1).max(200),
  asA: z.string().min(1).max(200),
  iWant: z.string().min(1).max(500),
  soThat: z.string().min(1).max(500),
  scenarios: z.array(scenarioSchema).min(1).max(15),
  businessRules: z.array(businessRuleSchema).max(20),
  references: z.string().max(500).default("N/a"),
});

export type UserStoryWriterOutput = z.infer<typeof userStoryWriterOutputSchema>;
export type Scenario = z.infer<typeof scenarioSchema>;
export type BusinessRule = z.infer<typeof businessRuleSchema>;
