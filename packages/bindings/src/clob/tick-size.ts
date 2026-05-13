import { z } from 'zod';
import { TickSizeValueSchema } from '../shared';

export const TickSizeSchema = z
  .object({
    minimum_tick_size: TickSizeValueSchema,
  })
  .transform(({ minimum_tick_size, ...rest }) => ({
    ...rest,
    minimumTickSize: minimum_tick_size,
  }));

export const FetchTickSizeResponseSchema = TickSizeSchema;

export type TickSize = z.infer<typeof TickSizeSchema>;
export type FetchTickSizeResponse = z.infer<typeof FetchTickSizeResponseSchema>;
