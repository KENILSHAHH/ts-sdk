import { z } from 'zod';
import {
  ActivityTypeSchema,
  AddressSchema,
  Hash64Schema,
  SideSchema,
} from './common';

export const TradeSchema = z.looseObject({
  proxyWallet: AddressSchema.nullish(),
  side: SideSchema.nullish(),
  asset: z.string().nullish(),
  conditionId: Hash64Schema.nullish(),
  size: z.number().nullish(),
  price: z.number().nullish(),
  timestamp: z.number().int().nullish(),
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
});

export const ActivitySchema = z.looseObject({
  proxyWallet: AddressSchema.nullish(),
  timestamp: z.number().int().nullish(),
  conditionId: Hash64Schema.nullish(),
  type: ActivityTypeSchema.nullish(),
  size: z.number().nullish(),
  usdcSize: z.number().nullish(),
  transactionHash: z.string().nullish(),
  price: z.number().nullish(),
  asset: z.string().nullish(),
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
});

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
