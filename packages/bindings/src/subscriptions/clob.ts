import { z } from 'zod';
import { type OrderSide, OrderSideSchema, OrderTypeSchema } from '../shared';

const NormalizedOrderSideSchema: z.ZodType<OrderSide> = z.preprocess(
  (value) => (typeof value === 'string' ? value.toUpperCase() : value),
  OrderSideSchema,
);

export enum TradeStatus {
  Matched = 'TRADE_STATUS_MATCHED',
  MatchedNotBroadcasted = 'TRADE_STATUS_MATCHED_NOT_BROADCASTED',
  Mined = 'TRADE_STATUS_MINED',
  Confirmed = 'TRADE_STATUS_CONFIRMED',
  Retrying = 'TRADE_STATUS_RETRYING',
  Failed = 'TRADE_STATUS_FAILED',
}

const TradeStatusSchema = z.enum(TradeStatus);

export enum UserOrderStatus {
  Live = 'LIVE',
  Matched = 'MATCHED',
  Delayed = 'DELAYED',
  Unmatched = 'UNMATCHED',
  Canceled = 'CANCELED',
}

const UserOrderStatusSchema = z.enum(UserOrderStatus);

const OrderBookLevelSchema = z.looseObject({
  price: z.string(),
  size: z.string(),
});

export type OrderBookLevel = z.infer<typeof OrderBookLevelSchema>;

export const MarketBookEventSchema = z
  .looseObject({
    event_type: z.literal('book'),
    market: z.string(),
    asset_id: z.string(),
    bids: z.array(OrderBookLevelSchema),
    asks: z.array(OrderBookLevelSchema),
    hash: z.string().nullish(),
    timestamp: z.string().nullish(),
    min_order_size: z.string().nullish(),
    tick_size: z.string().nullish(),
    neg_risk: z.boolean().nullish(),
    last_trade_price: z.string().nullish(),
  })
  .transform(({ event_type, ...event }) => {
    return {
      // Normalize to a consistent event envelope: `topic`, `type`, and `payload`.
      topic: 'market',
      type: event_type,
      payload: event,
    };
  });

export type MarketBookEvent = z.infer<typeof MarketBookEventSchema>;

const PriceChangeSchema = z.looseObject({
  asset_id: z.string(),
  price: z.string(),
  size: z.string(),
  side: NormalizedOrderSideSchema,
  hash: z.string().nullish(),
  best_bid: z.string().nullish(),
  best_ask: z.string().nullish(),
});

export type PriceChange = z.infer<typeof PriceChangeSchema>;

export const MarketPriceChangeEventSchema = z
  .looseObject({
    event_type: z.literal('price_change'),
    market: z.string(),
    price_changes: z.array(PriceChangeSchema),
    timestamp: z.string().nullish(),
  })
  .transform(({ event_type, ...event }) => {
    return {
      // Normalize to a consistent event envelope: `topic`, `type`, and `payload`.
      topic: 'market',
      type: event_type,
      payload: event,
    };
  });

export type MarketPriceChangeEvent = z.infer<
  typeof MarketPriceChangeEventSchema
>;

export const MarketLastTradePriceEventSchema = z
  .looseObject({
    event_type: z.literal('last_trade_price'),
    market: z.string(),
    asset_id: z.string(),
    price: z.string(),
    size: z.string().nullish(),
    fee_rate_bps: z.string().nullish(),
    side: NormalizedOrderSideSchema,
    timestamp: z.string().nullish(),
    transaction_hash: z.string().nullish(),
  })
  .transform(({ event_type, ...event }) => {
    return {
      // Normalize to a consistent event envelope: `topic`, `type`, and `payload`.
      topic: 'market',
      type: event_type,
      payload: event,
    };
  });

export type MarketLastTradePriceEvent = z.infer<
  typeof MarketLastTradePriceEventSchema
>;

export const MarketTickSizeChangeEventSchema = z
  .looseObject({
    event_type: z.literal('tick_size_change'),
    market: z.string(),
    asset_id: z.string(),
    old_tick_size: z.string().nullish(),
    new_tick_size: z.string(),
    timestamp: z.string().nullish(),
  })
  .transform(({ event_type, ...event }) => {
    return {
      // Normalize to a consistent event envelope: `topic`, `type`, and `payload`.
      topic: 'market',
      type: event_type,
      payload: event,
    };
  });

export type MarketTickSizeChangeEvent = z.infer<
  typeof MarketTickSizeChangeEventSchema
>;

export const MarketBestBidAskEventSchema = z
  .looseObject({
    event_type: z.literal('best_bid_ask'),
    market: z.string(),
    asset_id: z.string(),
    best_bid: z.string().nullish(),
    best_ask: z.string().nullish(),
    spread: z.string().nullish(),
    timestamp: z.string().nullish(),
  })
  .transform(({ event_type, ...event }) => {
    return {
      // Normalize to a consistent event envelope: `topic`, `type`, and `payload`.
      topic: 'market',
      type: event_type,
      payload: event,
    };
  });

export type MarketBestBidAskEvent = z.infer<typeof MarketBestBidAskEventSchema>;

const MarketEventMessageSchema = z.looseObject({
  id: z.string(),
  ticker: z.string().nullish(),
  slug: z.string().nullish(),
  title: z.string().nullish(),
  description: z.string().nullish(),
});

export type MarketEventMessage = z.infer<typeof MarketEventMessageSchema>;

export const NewMarketEventSchema = z
  .looseObject({
    event_type: z.literal('new_market'),
    id: z.string(),
    question: z.string().nullish(),
    market: z.string(),
    slug: z.string().nullish(),
    description: z.string().nullish(),
    assets_ids: z.array(z.string()).nullish(),
    outcomes: z.array(z.string()).nullish(),
    event_message: MarketEventMessageSchema.nullish(),
    timestamp: z.string().nullish(),
    tags: z.array(z.string()).nullish(),
    condition_id: z.string().nullish(),
    active: z.boolean().nullish(),
    clob_token_ids: z.array(z.string()).nullish(),
    sports_market_type: z.string().nullish(),
    line: z.string().nullish(),
    game_start_time: z.string().nullish(),
    order_price_min_tick_size: z.string().nullish(),
    group_item_title: z.string().nullish(),
    taker_base_fee: z.string().nullish(),
    fees_enabled: z.boolean().nullish(),
    fee_schedule: z.unknown().nullish(),
  })
  .transform(({ event_type, ...event }) => {
    return {
      // Normalize to a consistent event envelope: `topic`, `type`, and `payload`.
      topic: 'market',
      type: event_type,
      payload: event,
    };
  });

export type NewMarketEvent = z.infer<typeof NewMarketEventSchema>;

export const MarketResolvedEventSchema = z
  .looseObject({
    event_type: z.literal('market_resolved'),
    id: z.string(),
    market: z.string(),
    assets_ids: z.array(z.string()).nullish(),
    winning_asset_id: z.string().nullish(),
    winning_outcome: z.string().nullish(),
    event_message: MarketEventMessageSchema.nullish(),
    timestamp: z.string().nullish(),
    tags: z.array(z.string()).nullish(),
  })
  .transform(({ event_type, ...event }) => {
    return {
      // Normalize to a consistent event envelope: `topic`, `type`, and `payload`.
      topic: 'market',
      type: event_type,
      payload: event,
    };
  });

export type MarketResolvedEvent = z.infer<typeof MarketResolvedEventSchema>;

export enum UserOrderEventType {
  Placement = 'PLACEMENT',
  Update = 'UPDATE',
  Cancellation = 'CANCELLATION',
}

const UserOrderEventTypeSchema = z.enum(UserOrderEventType);

export const UserOrderEventSchema = z
  .looseObject({
    event_type: z.literal('order'),
    id: z.string(),
    owner: z.string(),
    market: z.string(),
    asset_id: z.string(),
    side: NormalizedOrderSideSchema,
    order_owner: z.string().nullish(),
    original_size: z.string(),
    size_matched: z.string(),
    price: z.string(),
    associate_trades: z.array(z.string()).nullish(),
    outcome: z.string().nullish(),
    type: UserOrderEventTypeSchema,
    created_at: z.string().nullish(),
    expiration: z.string().nullish(),
    order_type: OrderTypeSchema.nullish(),
    status: UserOrderStatusSchema.nullish(),
    maker_address: z.string().nullish(),
    timestamp: z.string(),
  })
  .transform(({ event_type, type: orderEventType, ...event }) => {
    return {
      // Normalize to a consistent event envelope: `topic`, `type`, and `payload`.
      topic: 'user',
      type: event_type,
      payload: {
        ...event,
        orderEventType,
      },
    };
  });

export type UserOrderEvent = z.infer<typeof UserOrderEventSchema>;

const TradeMakerOrderSchema = z.looseObject({
  order_id: z.string(),
  owner: z.string(),
  maker_address: z.string().nullish(),
  matched_amount: z.string(),
  price: z.string(),
  fee_rate_bps: z.string().nullish(),
  asset_id: z.string(),
  outcome: z.string().nullish(),
  outcome_index: z.number().int().nullish(),
  side: NormalizedOrderSideSchema,
});

export type TradeMakerOrder = z.infer<typeof TradeMakerOrderSchema>;

export const UserTradeEventSchema = z
  .looseObject({
    event_type: z.literal('trade'),
    type: z.literal('TRADE'),
    id: z.string(),
    taker_order_id: z.string(),
    market: z.string(),
    asset_id: z.string(),
    side: NormalizedOrderSideSchema,
    size: z.string(),
    fee_rate_bps: z.string().nullish(),
    price: z.string(),
    status: TradeStatusSchema,
    match_time: z.string().nullish(),
    matchtime: z.string().nullish(),
    last_update: z.string().nullish(),
    outcome: z.string().nullish(),
    owner: z.string(),
    trade_owner: z.string().nullish(),
    maker_address: z.string().nullish(),
    transaction_hash: z.string().nullish(),
    bucket_index: z.number().int().nullish(),
    maker_orders: z.array(TradeMakerOrderSchema).nullish(),
    trader_side: z.union([z.literal('TAKER'), z.literal('MAKER')]).nullish(),
    timestamp: z.string(),
  })
  .transform(({ event_type, type: _, ...event }) => {
    return {
      // Normalize to a consistent event envelope: `topic`, `type`, and `payload`.
      topic: 'user',
      type: event_type,
      payload: event,
    };
  });

export type UserTradeEvent = z.infer<typeof UserTradeEventSchema>;

export const MarketEventSchema = z.discriminatedUnion('type', [
  MarketBookEventSchema,
  MarketPriceChangeEventSchema,
  MarketLastTradePriceEventSchema,
  MarketTickSizeChangeEventSchema,
  MarketBestBidAskEventSchema,
  NewMarketEventSchema,
  MarketResolvedEventSchema,
]);

export type MarketEvent = z.infer<typeof MarketEventSchema>;

export const UserEventSchema = z.discriminatedUnion('type', [
  UserOrderEventSchema,
  UserTradeEventSchema,
]);

export type UserEvent = z.infer<typeof UserEventSchema>;
