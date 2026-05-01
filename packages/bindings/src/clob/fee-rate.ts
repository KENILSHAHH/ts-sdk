import { z } from 'zod';
import { ApproxNumberSchema } from '../shared';

export const FeeRateSchema = z
  .looseObject({
    base_fee: ApproxNumberSchema,
  })
  .transform(({ base_fee, ...rest }) => ({
    ...rest,
    baseFee: base_fee,
  }));

export const FetchFeeRateResponseSchema = FeeRateSchema;

export type FeeRate = z.infer<typeof FeeRateSchema>;
export type FetchFeeRateResponse = z.infer<typeof FetchFeeRateResponseSchema>;
