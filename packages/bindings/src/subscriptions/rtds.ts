import { z } from 'zod';
import {
  CommentMediaSchema,
  CommentProfileSchema,
  CommentSchema,
  ReactionSchema,
} from '../gamma/comment';
import { CommentParentEntityTypeSchema } from '../shared';

const CommentRemovedPayloadSchema = z.looseObject({
  id: z.string(),
  body: z.string().nullish(),
  parentEntityType: CommentParentEntityTypeSchema.nullish(),
  parentEntityID: z.number().int().nullish(),
  parentCommentID: z.string().nullish(),
  userAddress: z.string().nullish(),
  replyAddress: z.string().nullish(),
  createdAt: z.string().nullish(),
  updatedAt: z.string().nullish(),
  media: z.array(CommentMediaSchema).nullish(),
  profile: CommentProfileSchema.nullish(),
  reactions: z.array(ReactionSchema).nullish(),
  reportCount: z.number().int().nullish(),
  reactionCount: z.number().int().nullish(),
  tradeAsset: z.string().nullish(),
});

export type CommentRemovedPayload = z.infer<typeof CommentRemovedPayloadSchema>;

export const CommentCreatedEventSchema = z.looseObject({
  topic: z.literal('comments'),
  type: z.literal('comment_created'),
  timestamp: z.number(),
  payload: CommentSchema,
});

export type CommentCreatedEvent = z.infer<typeof CommentCreatedEventSchema>;

export const CommentRemovedEventSchema = z.looseObject({
  topic: z.literal('comments'),
  type: z.literal('comment_removed'),
  timestamp: z.number(),
  payload: CommentRemovedPayloadSchema,
});

export type CommentRemovedEvent = z.infer<typeof CommentRemovedEventSchema>;

export const ReactionCreatedEventSchema = z.looseObject({
  topic: z.literal('comments'),
  type: z.literal('reaction_created'),
  timestamp: z.number(),
  payload: ReactionSchema,
});

export type ReactionCreatedEvent = z.infer<typeof ReactionCreatedEventSchema>;

export const ReactionRemovedEventSchema = z.looseObject({
  topic: z.literal('comments'),
  type: z.literal('reaction_removed'),
  timestamp: z.number(),
  payload: ReactionSchema,
});

export type ReactionRemovedEvent = z.infer<typeof ReactionRemovedEventSchema>;

const PriceUpdatePayloadSchema = z.looseObject({
  symbol: z.string(),
  timestamp: z.number(),
  value: z.number(),
});

export type PriceUpdatePayload = z.infer<typeof PriceUpdatePayloadSchema>;

const CRYPTO_PRICES_BINANCE_TOPIC = 'prices.crypto.binance' as const;
const CRYPTO_PRICES_CHAINLINK_TOPIC = 'prices.crypto.chainlink' as const;

export type CryptoPricesBinanceTopic = typeof CRYPTO_PRICES_BINANCE_TOPIC;
export type CryptoPricesChainlinkTopic = typeof CRYPTO_PRICES_CHAINLINK_TOPIC;
export type CryptoPricesTopic =
  | CryptoPricesBinanceTopic
  | CryptoPricesChainlinkTopic;

const RawCryptoPricesBinanceTopicSchema = z.literal('crypto_prices');
const RawCryptoPricesChainlinkTopicSchema = z.literal(
  'crypto_prices_chainlink',
);

const CryptoPricesBinanceTopicSchema: z.ZodType<CryptoPricesBinanceTopic> =
  RawCryptoPricesBinanceTopicSchema.transform(() => {
    return CRYPTO_PRICES_BINANCE_TOPIC;
  });

const CryptoPricesChainlinkTopicSchema: z.ZodType<CryptoPricesChainlinkTopic> =
  RawCryptoPricesChainlinkTopicSchema.transform(() => {
    return CRYPTO_PRICES_CHAINLINK_TOPIC;
  });

export const CryptoPricesBinanceEventSchema = z.looseObject({
  topic: CryptoPricesBinanceTopicSchema,
  type: z.literal('update'),
  timestamp: z.number(),
  payload: PriceUpdatePayloadSchema,
});

export type CryptoPricesBinanceEvent = z.infer<
  typeof CryptoPricesBinanceEventSchema
>;

export const CryptoPricesChainlinkEventSchema = z.looseObject({
  topic: CryptoPricesChainlinkTopicSchema,
  type: z.literal('update'),
  timestamp: z.number(),
  payload: PriceUpdatePayloadSchema,
});

export type CryptoPricesChainlinkEvent = z.infer<
  typeof CryptoPricesChainlinkEventSchema
>;

export const CryptoPricesEventSchema = z.discriminatedUnion('topic', [
  CryptoPricesBinanceEventSchema,
  CryptoPricesChainlinkEventSchema,
]);

export type CryptoPricesEvent = z.infer<typeof CryptoPricesEventSchema>;

const EquityPriceUpdatePayloadSchema = z.looseObject({
  symbol: z.string(),
  value: z.number(),
  full_accuracy_value: z.string(),
  timestamp: z.number(),
  received_at: z.number().nullish(),
  is_carried_forward: z.boolean().nullish(),
});

export type EquityPriceUpdatePayload = z.infer<
  typeof EquityPriceUpdatePayloadSchema
>;

const EquityPriceSnapshotPointSchema = z.looseObject({
  timestamp: z.number(),
  value: z.number(),
});

export type EquityPriceSnapshotPoint = z.infer<
  typeof EquityPriceSnapshotPointSchema
>;

const EquityPriceSubscribePayloadSchema = z.looseObject({
  symbol: z.string(),
  data: z.array(EquityPriceSnapshotPointSchema),
});

export type EquityPriceSubscribePayload = z.infer<
  typeof EquityPriceSubscribePayloadSchema
>;

const RawEquityPricesTopicSchema = z.literal('equity_prices');

const EQUITY_PRICES_TOPIC = 'prices.equity.pyth' as const;

export type EquityPricesTopic = typeof EQUITY_PRICES_TOPIC;

const EquityPricesTopicSchema: z.ZodType<EquityPricesTopic> =
  RawEquityPricesTopicSchema.transform(() => {
    return EQUITY_PRICES_TOPIC;
  });

export const EquityPricesUpdateEventSchema = z.looseObject({
  topic: EquityPricesTopicSchema,
  type: z.literal('update'),
  timestamp: z.number(),
  payload: EquityPriceUpdatePayloadSchema,
});

export type EquityPricesUpdateEvent = z.infer<
  typeof EquityPricesUpdateEventSchema
>;

export const EquityPricesSubscribeEventSchema = z.looseObject({
  topic: EquityPricesTopicSchema,
  type: z.literal('subscribe'),
  timestamp: z.number(),
  payload: EquityPriceSubscribePayloadSchema,
});

export type EquityPricesSubscribeEvent = z.infer<
  typeof EquityPricesSubscribeEventSchema
>;

export const EquityPricesEventSchema = z.discriminatedUnion('type', [
  EquityPricesUpdateEventSchema,
  EquityPricesSubscribeEventSchema,
]);

export type EquityPricesEvent = z.infer<typeof EquityPricesEventSchema>;

export const CommentsEventSchema = z.discriminatedUnion('type', [
  CommentCreatedEventSchema,
  CommentRemovedEventSchema,
  ReactionCreatedEventSchema,
  ReactionRemovedEventSchema,
]);

export type CommentsEvent = z.infer<typeof CommentsEventSchema>;

export const RealtimeEventSchema = z.discriminatedUnion('topic', [
  CommentsEventSchema,
  CryptoPricesEventSchema,
  EquityPricesEventSchema,
]);

export type RealtimeEvent = z.infer<typeof RealtimeEventSchema>;
