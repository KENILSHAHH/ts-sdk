import { z } from 'zod';

export const CancelOrdersResponseSchema = z.object({
  canceled: z.array(z.string()),
  not_canceled: z.record(z.string(), z.string()),
}).transform(({ canceled, not_canceled }) => ({
  canceled,
  notCanceled: not_canceled,
}));

export type CancelOrdersResponse = z.infer<typeof CancelOrdersResponseSchema>;
