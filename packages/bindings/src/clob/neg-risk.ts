import { z } from 'zod';

export const NegRiskSchema = z
  .object({
    neg_risk: z.boolean(),
  })
  .transform(({ neg_risk, ...rest }) => ({
    ...rest,
    negRisk: neg_risk,
  }));

export const FetchNegRiskResponseSchema = NegRiskSchema;

export type NegRisk = z.infer<typeof NegRiskSchema>;
export type FetchNegRiskResponse = z.infer<typeof FetchNegRiskResponseSchema>;
