import { z } from 'zod';
import {
  ConditionIdSchema,
  EpochSecondsToMillisecondsSchema,
  TokenIdSchema,
} from '../shared';
import { ActivityTypeSchema, AddressSchema, SideSchema } from './common';

export const TradeSchema = z
  .looseObject({
    proxyWallet: AddressSchema.nullish(),
    side: SideSchema.nullish(),
    asset: TokenIdSchema.nullish(),
    conditionId: ConditionIdSchema.nullish(),
    size: z.number().nullish(),
    price: z.number().nullish(),
    timestamp: EpochSecondsToMillisecondsSchema.nullish(),
    title: z.string().nullish(),
    slug: z.string().nullish(),
    icon: z.string().nullish(),
    eventSlug: z.string().nullish(),
    outcome: z.string().nullish(),
    outcomeIndex: z.number().int().nullish(),
    name: z.string().nullish(),
    pseudonym: z.string().nullish(),
    bio: z.string().nullish(),
    profileImage: z.string().nullish(),
    profileImageOptimized: z.string().nullish(),
    transactionHash: z.string().nullish(),
  })
  .transform(({ asset, ...rest }) => ({
    ...rest,
    tokenId: asset,
  }));

export const ActivitySchema = z
  .looseObject({
    proxyWallet: AddressSchema.nullish(),
    timestamp: EpochSecondsToMillisecondsSchema.nullish(),
    conditionId: ConditionIdSchema.nullish(),
    type: ActivityTypeSchema.nullish(),
    size: z.number().nullish(),
    usdcSize: z.number().nullish(),
    transactionHash: z.string().nullish(),
    price: z.number().nullish(),
    asset: TokenIdSchema.nullish(),
    side: SideSchema.nullish(),
    outcomeIndex: z.number().int().nullish(),
    title: z.string().nullish(),
    slug: z.string().nullish(),
    icon: z.string().nullish(),
    eventSlug: z.string().nullish(),
    outcome: z.string().nullish(),
    name: z.string().nullish(),
    pseudonym: z.string().nullish(),
    bio: z.string().nullish(),
    profileImage: z.string().nullish(),
    profileImageOptimized: z.string().nullish(),
  })
  .transform(({ asset, ...rest }) => ({
    ...rest,
    tokenId: asset,
  }));

export const TradedSchema = z.looseObject({
  user: AddressSchema.nullish(),
  traded: z.number().int().nullish(),
});

export const ListTradesResponseSchema = z.array(TradeSchema);
export const ListActivityResponseSchema = z.array(ActivitySchema);

export type Trade = z.infer<typeof TradeSchema>;
export type Activity = z.infer<typeof ActivitySchema>;
export type Traded = z.infer<typeof TradedSchema>;
export type ListTradesResponse = z.infer<typeof ListTradesResponseSchema>;
export type ListActivityResponse = z.infer<typeof ListActivityResponseSchema>;
