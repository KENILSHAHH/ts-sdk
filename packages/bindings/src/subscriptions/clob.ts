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
  .transform(({ event_type, asset_id, min_order_size, tick_size, neg_risk, last_trade_price, ...rest }) => {
    return {
      // Normalize to a consistent event envelope: `topic`, `type`, and `payload`.
      topic: 'market' as const,
      type: event_type,
      payload: {
        ...rest,
        tokenId: asset_id,
        minOrderSize: min_order_size,
        tickSize: tick_size,
        negRisk: neg_risk,
        lastTradePrice: last_trade_price,
      },
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
}).transform(({ asset_id, best_bid, best_ask, ...rest }) => ({
  ...rest,
  tokenId: asset_id,
  bestBid: best_bid,
  bestAsk: best_ask,
}));

export type PriceChange = z.infer<typeof PriceChangeSchema>;

export const MarketPriceChangeEventSchema = z
  .looseObject({
    event_type: z.literal('price_change'),
    market: z.string(),
    price_changes: z.array(PriceChangeSchema),
    timestamp: z.string().nullish(),
  })
  .transform(({ event_type, price_changes, ...rest }) => {
    return {
      // Normalize to a consistent event envelope: `topic`, `type`, and `payload`.
      topic: 'market' as const,
      type: event_type,
      payload: {
        ...rest,
        priceChanges: price_changes,
      },
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
  .transform(({ event_type, asset_id, fee_rate_bps, transaction_hash, ...rest }) => {
    return {
      // Normalize to a consistent event envelope: `topic`, `type`, and `payload`.
      topic: 'market' as const,
      type: event_type,
      payload: {
        ...rest,
        tokenId: asset_id,
        feeRateBps: fee_rate_bps,
        transactionHash: transaction_hash,
      },
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
  .transform(({ event_type, asset_id, old_tick_size, new_tick_size, ...rest }) => {
    return {
      // Normalize to a consistent event envelope: `topic`, `type`, and `payload`.
      topic: 'market' as const,
      type: event_type,
      payload: {
        ...rest,
        tokenId: asset_id,
        oldTickSize: old_tick_size,
        newTickSize: new_tick_size,
      },
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
  .transform(({ event_type, asset_id, best_bid, best_ask, ...rest }) => {
    return {
      // Normalize to a consistent event envelope: `topic`, `type`, and `payload`.
      topic: 'market' as const,
      type: event_type,
      payload: {
        ...rest,
        tokenId: asset_id,
        bestBid: best_bid,
        bestAsk: best_ask,
      },
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
  .transform(({ event_type, assets_ids, event_message, condition_id, clob_token_ids, sports_market_type, game_start_time, order_price_min_tick_size, group_item_title, taker_base_fee, fees_enabled, fee_schedule, ...rest }) => {
    return {
      // Normalize to a consistent event envelope: `topic`, `type`, and `payload`.
      topic: 'market' as const,
      type: event_type,
      payload: {
        ...rest,
        assetsIds: assets_ids,
        eventMessage: event_message,
        conditionId: condition_id,
        clobTokenIds: clob_token_ids,
        sportsMarketType: sports_market_type,
        gameStartTime: game_start_time,
        orderPriceMinTickSize: order_price_min_tick_size,
        groupItemTitle: group_item_title,
        takerBaseFee: taker_base_fee,
        feesEnabled: fees_enabled,
        feeSchedule: fee_schedule,
      },
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
  .transform(({ event_type, assets_ids, winning_asset_id, winning_outcome, event_message, ...rest }) => {
    return {
      // Normalize to a consistent event envelope: `topic`, `type`, and `payload`.
      topic: 'market' as const,
      type: event_type,
      payload: {
        ...rest,
        assetsIds: assets_ids,
        winningAssetId: winning_asset_id,
        winningOutcome: winning_outcome,
        eventMessage: event_message,
      },
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
  .transform(({ event_type, type: orderEventType, asset_id, order_owner, original_size, size_matched, associate_trades, created_at, order_type, maker_address, ...rest }) => {
    return {
      // Normalize to a consistent event envelope: `topic`, `type`, and `payload`.
      topic: 'user' as const,
      type: event_type,
      payload: {
        ...rest,
        orderEventType,
        tokenId: asset_id,
        orderOwner: order_owner,
        originalSize: original_size,
        sizeMatched: size_matched,
        associateTrades: associate_trades,
        createdAt: created_at,
        orderType: order_type,
        makerAddress: maker_address,
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
}).transform(({ order_id, maker_address, matched_amount, fee_rate_bps, asset_id, outcome_index, ...rest }) => ({
  ...rest,
  orderId: order_id,
  makerAddress: maker_address,
  matchedAmount: matched_amount,
  feeRateBps: fee_rate_bps,
  tokenId: asset_id,
  outcomeIndex: outcome_index,
}));

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
  .transform(({ event_type, type: _, taker_order_id, asset_id, fee_rate_bps, match_time, last_update, trade_owner, maker_address, transaction_hash, bucket_index, maker_orders, trader_side, ...rest }) => {
    return {
      // Normalize to a consistent event envelope: `topic`, `type`, and `payload`.
      topic: 'user' as const,
      type: event_type,
      payload: {
        ...rest,
        takerOrderId: taker_order_id,
        tokenId: asset_id,
        feeRateBps: fee_rate_bps,
        matchTime: match_time,
        lastUpdate: last_update,
        tradeOwner: trade_owner,
        makerAddress: maker_address,
        transactionHash: transaction_hash,
        bucketIndex: bucket_index,
        makerOrders: maker_orders,
        traderSide: trader_side,
      },
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
