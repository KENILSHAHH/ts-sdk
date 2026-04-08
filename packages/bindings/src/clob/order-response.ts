import { z } from 'zod';

export const OrderResponseSchema = z.object({
  errorMsg: z.string(),
  makingAmount: z.string(),
  orderID: z.string(),
  status: z.string(),
  success: z.boolean(),
  takingAmount: z.string(),
  transactionsHashes: z.array(z.string()).default([]),
});

export type OrderResponse = z.infer<typeof OrderResponseSchema>;

export const OrderResponsesSchema = z.array(OrderResponseSchema);

export type OrderResponses = z.infer<typeof OrderResponsesSchema>;
