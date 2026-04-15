import { z } from 'zod';
import { ConditionIdSchema } from '../shared';
import { AddressSchema } from './common';

export const PositionSchema = z.looseObject({
  proxyWallet: AddressSchema.nullish(),
  asset: z.string().nullish(),
  conditionId: ConditionIdSchema.nullish(),
  size: z.number().nullish(),
  avgPrice: z.number().nullish(),
  initialValue: z.number().nullish(),
  currentValue: z.number().nullish(),
  cashPnl: z.number().nullish(),
  percentPnl: z.number().nullish(),
  totalBought: z.number().nullish(),
  realizedPnl: z.number().nullish(),
  percentRealizedPnl: z.number().nullish(),
  curPrice: z.number().nullish(),
  redeemable: z.boolean().nullish(),
  mergeable: z.boolean().nullish(),
  title: z.string().nullish(),
  slug: z.string().nullish(),
  icon: z.string().nullish(),
  eventId: z.string().nullish(),
  eventSlug: z.string().nullish(),
  outcome: z.string().nullish(),
  outcomeIndex: z.number().int().nullish(),
  oppositeOutcome: z.string().nullish(),
  oppositeAsset: z.string().nullish(),
  endDate: z.string().nullish(),
  negativeRisk: z.boolean().nullish(),
});

export const ClosedPositionSchema = z.looseObject({
  proxyWallet: AddressSchema.nullish(),
  asset: z.string().nullish(),
  conditionId: ConditionIdSchema.nullish(),
  avgPrice: z.number().nullish(),
  totalBought: z.number().nullish(),
  realizedPnl: z.number().nullish(),
  curPrice: z.number().nullish(),
  timestamp: z.number().int().nullish(),
  title: z.string().nullish(),
  slug: z.string().nullish(),
  icon: z.string().nullish(),
  eventSlug: z.string().nullish(),
  outcome: z.string().nullish(),
  outcomeIndex: z.number().int().nullish(),
  oppositeOutcome: z.string().nullish(),
  oppositeAsset: z.string().nullish(),
  endDate: z.string().nullish(),
});

export const ValueSchema = z.looseObject({
  user: AddressSchema.nullish(),
  value: z.number().nullish(),
});

export const MarketPositionV1Schema = z.looseObject({
  proxyWallet: AddressSchema.nullish(),
  name: z.string().nullish(),
  profileImage: z.string().nullish(),
  verified: z.boolean().nullish(),
  asset: z.string().nullish(),
  conditionId: ConditionIdSchema.nullish(),
  avgPrice: z.number().nullish(),
  size: z.number().nullish(),
  currPrice: z.number().nullish(),
  currentValue: z.number().nullish(),
  cashPnl: z.number().nullish(),
  totalBought: z.number().nullish(),
  realizedPnl: z.number().nullish(),
  totalPnl: z.number().nullish(),
  outcome: z.string().nullish(),
  outcomeIndex: z.number().int().nullish(),
});

export const MetaMarketPositionV1Schema = z.looseObject({
  token: z.string().nullish(),
  positions: z.array(MarketPositionV1Schema).nullish(),
});

export const ListPositionsResponseSchema = z.array(PositionSchema);
export const ListClosedPositionsResponseSchema = z.array(ClosedPositionSchema);
export const FetchPortfolioValueResponseSchema = z.array(ValueSchema);
export const ListMarketPositionsResponseSchema = z.array(
  MetaMarketPositionV1Schema,
);

export type Position = z.infer<typeof PositionSchema>;
export type ClosedPosition = z.infer<typeof ClosedPositionSchema>;
export type Value = z.infer<typeof ValueSchema>;
export type MarketPositionV1 = z.infer<typeof MarketPositionV1Schema>;
export type MetaMarketPositionV1 = z.infer<typeof MetaMarketPositionV1Schema>;
export type ListPositionsResponse = z.infer<typeof ListPositionsResponseSchema>;
export type ListClosedPositionsResponse = z.infer<
  typeof ListClosedPositionsResponseSchema
>;
export type FetchPortfolioValueResponse = z.infer<
  typeof FetchPortfolioValueResponseSchema
>;
export type ListMarketPositionsResponse = z.infer<
  typeof ListMarketPositionsResponseSchema
>;
