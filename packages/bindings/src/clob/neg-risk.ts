import { z } from 'zod';

export const NegRiskSchema = z.looseObject({
  neg_risk: z.boolean(),
});

export const FetchNegRiskResponseSchema = NegRiskSchema;

export type NegRisk = z.infer<typeof NegRiskSchema>;
export type FetchNegRiskResponse = z.infer<typeof FetchNegRiskResponseSchema>;
