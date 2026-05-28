import { z } from 'zod';
import {
  type ConditionId,
  ConditionIdSchema,
  type DecimalString,
  DecimalStringSchema,
  type EpochMilliseconds,
  EpochMillisecondsStringSchema,
  type TokenId,
  TokenIdSchema,
} from '../shared';

export type OrderBookLevel = {
  price: DecimalString;
  size: DecimalString;
};

export type OrderBook = {
  market: ConditionId;
  tokenId: TokenId;
  timestamp?: EpochMilliseconds | null;

  /** Bid levels in ascending price order, lowest bid first. */
  bids: OrderBookLevel[];

  /** Ask levels in descending price order, highest ask first. */
  asks: OrderBookLevel[];

  minOrderSize: DecimalString;
  tickSize: DecimalString;
  negRisk: boolean;
  lastTradePrice?: DecimalString | null;
  hash: string;
};

export const OrderBookLevelSchema = z.object({
  price: DecimalStringSchema,
  size: DecimalStringSchema,
}) satisfies z.ZodType<OrderBookLevel>;

export const OrderBookSchema = z
  .object({
    market: ConditionIdSchema,
    asset_id: TokenIdSchema,
    timestamp: EpochMillisecondsStringSchema.nullish(),
    bids: z.array(OrderBookLevelSchema),
    asks: z.array(OrderBookLevelSchema),
    min_order_size: DecimalStringSchema,
    tick_size: DecimalStringSchema,
    neg_risk: z.boolean(),
    last_trade_price: DecimalStringSchema.nullish(),
    hash: z.string(),
  })
  .transform(
    ({
      asset_id,
      min_order_size,
      tick_size,
      neg_risk,
      last_trade_price,
      ...rest
    }) => ({
      ...rest,
      tokenId: asset_id,
      minOrderSize: min_order_size,
      tickSize: tick_size,
      negRisk: neg_risk,
      lastTradePrice: last_trade_price,
    }),
  ) satisfies z.ZodType<OrderBook>;

export const FetchOrderBookResponseSchema = OrderBookSchema;
export const OrderBooksSchema = z.array(OrderBookSchema);

export type OrderBooks = OrderBook[];
export type FetchOrderBookResponse = OrderBook;
