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

export const CryptoPricesEventSchema = z.looseObject({
  topic: z.literal('crypto_prices'),
  type: z.literal('update'),
  timestamp: z.number(),
  payload: PriceUpdatePayloadSchema,
});

export type CryptoPricesEvent = z.infer<typeof CryptoPricesEventSchema>;

export const CryptoPricesChainlinkEventSchema = z.looseObject({
  topic: z.literal('crypto_prices_chainlink'),
  type: z.literal('update'),
  timestamp: z.number(),
  payload: PriceUpdatePayloadSchema,
});

export type CryptoPricesChainlinkEvent = z.infer<
  typeof CryptoPricesChainlinkEventSchema
>;

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

export const EquityPricesUpdateEventSchema = z.looseObject({
  topic: z.literal('equity_prices'),
  type: z.literal('update'),
  timestamp: z.number(),
  payload: EquityPriceUpdatePayloadSchema,
});

export type EquityPricesUpdateEvent = z.infer<
  typeof EquityPricesUpdateEventSchema
>;

export const EquityPricesSubscribeEventSchema = z.looseObject({
  topic: z.literal('equity_prices'),
  type: z.literal('subscribe'),
  timestamp: z.number(),
  payload: EquityPriceSubscribePayloadSchema,
});

export type EquityPricesSubscribeEvent = z.infer<
  typeof EquityPricesSubscribeEventSchema
>;

export const CommentsEventSchema = z.union([
  CommentCreatedEventSchema,
  CommentRemovedEventSchema,
  ReactionCreatedEventSchema,
  ReactionRemovedEventSchema,
]);

export type CommentsEvent = z.infer<typeof CommentsEventSchema>;

export const RealtimeEventSchema = z.union([
  CommentsEventSchema,
  CryptoPricesEventSchema,
  CryptoPricesChainlinkEventSchema,
  EquityPricesUpdateEventSchema,
  EquityPricesSubscribeEventSchema,
]);

export type RealtimeEvent = z.infer<typeof RealtimeEventSchema>;
