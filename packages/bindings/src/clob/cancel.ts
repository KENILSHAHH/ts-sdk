import { z } from 'zod';

export const CancelOrdersResponseSchema = z.object({
  canceled: z.array(z.string()),
  not_canceled: z.record(z.string(), z.string()),
});

export type CancelOrdersResponse = z.infer<typeof CancelOrdersResponseSchema>;
