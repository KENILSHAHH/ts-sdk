import { z } from 'zod';

export const OrderBookLevelSchema = z.looseObject({
  price: z.string(),
  size: z.string(),
});

export const OrderBookSchema = z.looseObject({
  market: z.string(),
  asset_id: z.string(),
  timestamp: z.string().nullish(),
  bids: z.array(OrderBookLevelSchema),
  asks: z.array(OrderBookLevelSchema),
  min_order_size: z.string(),
  tick_size: z.string(),
  neg_risk: z.boolean(),
  last_trade_price: z.string().nullish(),
  hash: z.string(),
}).transform(({ asset_id, min_order_size, tick_size, neg_risk, last_trade_price, ...rest }) => ({
  ...rest,
  tokenId: asset_id,
  minOrderSize: min_order_size,
  tickSize: tick_size,
  negRisk: neg_risk,
  lastTradePrice: last_trade_price,
}));

export const FetchOrderBookResponseSchema = OrderBookSchema;
export const OrderBooksSchema = z.array(OrderBookSchema);

export type OrderBookLevel = z.infer<typeof OrderBookLevelSchema>;
export type OrderBook = z.infer<typeof OrderBookSchema>;
export type OrderBooks = z.infer<typeof OrderBooksSchema>;
export type FetchOrderBookResponse = z.infer<
  typeof FetchOrderBookResponseSchema
>;
