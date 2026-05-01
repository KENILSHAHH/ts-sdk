import { z } from 'zod';
import {
  CommentMediaSchema,
  CommentProfileSchema,
  CommentSchema,
  ReactionSchema,
} from '../gamma/comment';
import {
  ApproxNumberSchema,
  CommentParentEntityTypeSchema,
  DecimalStringSchema,
  EpochMillisecondsSchema,
} from '../shared';

const CommentRemovedPayloadSchema = z.object({
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

export const CommentCreatedEventSchema = z.object({
  topic: z.literal('comments'),
  type: z.literal('comment_created'),
  timestamp: EpochMillisecondsSchema,
  payload: CommentSchema,
});

export type CommentCreatedEvent = z.infer<typeof CommentCreatedEventSchema>;

export const CommentRemovedEventSchema = z.object({
  topic: z.literal('comments'),
  type: z.literal('comment_removed'),
  timestamp: EpochMillisecondsSchema,
  payload: CommentRemovedPayloadSchema,
});

export type CommentRemovedEvent = z.infer<typeof CommentRemovedEventSchema>;

export const ReactionCreatedEventSchema = z.object({
  topic: z.literal('comments'),
  type: z.literal('reaction_created'),
  timestamp: EpochMillisecondsSchema,
  payload: ReactionSchema,
});

export type ReactionCreatedEvent = z.infer<typeof ReactionCreatedEventSchema>;

export const ReactionRemovedEventSchema = z.object({
  topic: z.literal('comments'),
  type: z.literal('reaction_removed'),
  timestamp: EpochMillisecondsSchema,
  payload: ReactionSchema,
});

export type ReactionRemovedEvent = z.infer<typeof ReactionRemovedEventSchema>;

const PriceUpdatePayloadSchema = z.object({
  symbol: z.string(),
  timestamp: EpochMillisecondsSchema,
  value: ApproxNumberSchema,
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

export const CryptoPricesBinanceEventSchema = z.object({
  topic: CryptoPricesBinanceTopicSchema,
  type: z.literal('update'),
  timestamp: EpochMillisecondsSchema,
  payload: PriceUpdatePayloadSchema,
});

export type CryptoPricesBinanceEvent = z.infer<
  typeof CryptoPricesBinanceEventSchema
>;

export const CryptoPricesChainlinkEventSchema = z.object({
  topic: CryptoPricesChainlinkTopicSchema,
  type: z.literal('update'),
  timestamp: EpochMillisecondsSchema,
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

const EquityPriceUpdatePayloadSchema = z
  .looseObject({
    symbol: z.string(),
    value: ApproxNumberSchema,
    full_accuracy_value: DecimalStringSchema,
    timestamp: EpochMillisecondsSchema,
    received_at: EpochMillisecondsSchema.nullish(),
    is_carried_forward: z.boolean().nullish(),
  })
  .transform(
    ({ full_accuracy_value, received_at, is_carried_forward, ...rest }) => ({
      ...rest,
      fullAccuracyValue: full_accuracy_value,
      receivedAt: received_at,
      isCarriedForward: is_carried_forward,
    }),
  );

export type EquityPriceUpdatePayload = z.infer<
  typeof EquityPriceUpdatePayloadSchema
>;

const EquityPriceSnapshotPointSchema = z.object({
  timestamp: z.number(),
  value: ApproxNumberSchema,
});

export type EquityPriceSnapshotPoint = z.infer<
  typeof EquityPriceSnapshotPointSchema
>;

const EquityPriceSubscribePayloadSchema = z.object({
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

export const EquityPricesUpdateEventSchema = z.object({
  topic: EquityPricesTopicSchema,
  type: z.literal('update'),
  timestamp: EpochMillisecondsSchema,
  payload: EquityPriceUpdatePayloadSchema,
});

export type EquityPricesUpdateEvent = z.infer<
  typeof EquityPricesUpdateEventSchema
>;

export const EquityPricesSubscribeEventSchema = z.object({
  topic: EquityPricesTopicSchema,
  type: z.literal('subscribe'),
  timestamp: EpochMillisecondsSchema,
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
