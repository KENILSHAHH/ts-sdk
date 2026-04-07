import { z } from 'zod';
import { TickSizeValueSchema } from '../shared';

export const TickSizeSchema = z.looseObject({
  minimum_tick_size: TickSizeValueSchema,
});

export const FetchTickSizeResponseSchema = TickSizeSchema;

export type TickSize = z.infer<typeof TickSizeSchema>;
export type FetchTickSizeResponse = z.infer<typeof FetchTickSizeResponseSchema>;
