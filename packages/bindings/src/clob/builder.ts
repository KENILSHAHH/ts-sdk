import { z } from 'zod';
import { OrderSideSchema, TokenIdSchema } from '../shared';

export const BuilderTradeSchema = z.looseObject({
  id: z.string(),
  tradeType: z.string(),
  takerOrderHash: z.string(),
  builder: z.string(),
  market: z.string(),
  assetId: TokenIdSchema,
  side: OrderSideSchema,
  size: z.string(),
  sizeUsdc: z.string(),
  price: z.string(),
  status: z.string(),
  outcome: z.string(),
  outcomeIndex: z.number().int(),
  owner: z.string(),
  maker: z.string(),
  transactionHash: z.string(),
  matchTime: z.string(),
  bucketIndex: z.number().int(),
  fee: z.string(),
  feeUsdc: z.string(),
  err_msg: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type BuilderTrade = z.infer<typeof BuilderTradeSchema>;

export const PaginatedBuilderTradesSchema = z.object({
  limit: z.number().int(),
  count: z.number().int(),
  next_cursor: z.string(),
  data: z.array(BuilderTradeSchema),
});
export type PaginatedBuilderTrades = z.infer<
  typeof PaginatedBuilderTradesSchema
>;
