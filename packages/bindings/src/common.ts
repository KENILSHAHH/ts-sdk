import {
  toCategoryId,
  toClobRewardId,
  toEventId,
  toImageOptimizationId,
  toInternalUserId,
  toMarketId,
  toTagId,
} from '@polymarket/types';
import { z } from 'zod';

export const CategoryIdSchema = z.string().transform(toCategoryId);
export const ClobRewardIdSchema = z.string().transform(toClobRewardId);
export const EventIdSchema = z.string().transform(toEventId);
export const ImageOptimizationIdSchema = z.string().transform(toImageOptimizationId);
export const InternalUserIdSchema = z.string().transform(toInternalUserId);
export const MarketIdSchema = z.string().transform(toMarketId);
export const TagIdSchema = z.string().transform(toTagId);

export const ImageOptimizationSchema = z.looseObject({
  id: ImageOptimizationIdSchema,
  imageUrlSource: z.string().nullish(),
  imageUrlOptimized: z.string().nullish(),
  imageSizeKbSource: z.number().nullish(),
  imageSizeKbOptimized: z.number().nullish(),
  imageOptimizedComplete: z.boolean().nullish(),
  imageOptimizedLastUpdated: z.string().nullish(),
  relID: z.number().int().nullish(),
  field: z.string().nullish(),
  relname: z.string().nullish(),
});

export const FeeScheduleSchema = z.looseObject({
  exponent: z.number(),
  rate: z.number(),
  takerOnly: z.boolean(),
  rebateRate: z.number(),
});

export const EventReferenceSchema = z.looseObject({ id: EventIdSchema });

export const CategoryReferenceSchema = z.looseObject({
  id: CategoryIdSchema,
  label: z.string().nullish(),
  parentCategory: z.string().nullish(),
  slug: z.string().nullish(),
  publishedAt: z.string().nullish(),
  createdBy: z.string().nullish(),
  updatedBy: z.string().nullish(),
  createdAt: z.string().nullish(),
  updatedAt: z.string().nullish(),
});

export const TagReferenceSchema = z.looseObject({
  id: TagIdSchema,
  label: z.string().nullish(),
  slug: z.string().nullish(),
  forceShow: z.boolean().nullish(),
  publishedAt: z.string().nullish(),
  createdBy: z.number().int().nullish(),
  updatedBy: z.number().int().nullish(),
  createdAt: z.string().nullish(),
  updatedAt: z.string().nullish(),
  forceHide: z.boolean().nullish(),
  isCarousel: z.boolean().nullish(),
  requiresTranslation: z.boolean().nullish(),
  activeEventsCount: z.number().int().nullish(),
});

export const RelatedMarketSchema = z.looseObject({
  id: MarketIdSchema,
  conditionId: z.string(),
  slug: z.string().nullish(),
  image: z.string().nullish(),
  volume: z.string().nullish(),
  question: z.string().nullish(),
  outcomes: z.string().nullish(),
  outcomePrices: z.string().nullish(),
  startDate: z.string().nullish(),
  eventSlug: z.string().nullish(),
});

export const ClobRewardsSchema = z.looseObject({
  id: ClobRewardIdSchema,
  conditionId: z.string(),
  assetAddress: z.string(),
  rewardsAmount: z.number(),
  rewardsDailyRate: z.number(),
  startDate: z.string(),
  endDate: z.string().nullish(),
});

export const InternalUserSchema = z.looseObject({
  id: InternalUserIdSchema,
  username: z.string().nullish(),
});

export type ImageOptimization = z.infer<typeof ImageOptimizationSchema>;
export type FeeSchedule = z.infer<typeof FeeScheduleSchema>;
export type EventReference = z.infer<typeof EventReferenceSchema>;
export type CategoryReference = z.infer<typeof CategoryReferenceSchema>;
export type TagReference = z.infer<typeof TagReferenceSchema>;
export type RelatedMarket = z.infer<typeof RelatedMarketSchema>;
export type ClobRewards = z.infer<typeof ClobRewardsSchema>;
export type InternalUser = z.infer<typeof InternalUserSchema>;
