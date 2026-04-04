import { z } from 'zod';

export const FeeRateSchema = z.looseObject({
  base_fee: z.number(),
});

export const FetchFeeRateResponseSchema = FeeRateSchema;

export type FeeRate = z.infer<typeof FeeRateSchema>;
export type FetchFeeRateResponse = z.infer<typeof FetchFeeRateResponseSchema>;
