import { z } from 'zod';

export const TickSizeSchema = z.looseObject({
  minimum_tick_size: z.number(),
});

export const FetchTickSizeResponseSchema = TickSizeSchema;

export type TickSize = z.infer<typeof TickSizeSchema>;
export type FetchTickSizeResponse = z.infer<typeof FetchTickSizeResponseSchema>;
