import { z } from 'zod';
import {
  ConditionIdSchema,
  EpochSecondsToMillisecondsSchema,
  IsoCalendarDateStringSchema,
  MixedDateTimeStringSchema,
  TokenIdSchema,
} from '../shared';
import { AddressSchema } from './common';

export const PositionSchema = z
  .looseObject({
    proxyWallet: AddressSchema.nullish(),
    asset: TokenIdSchema.nullish(),
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
    oppositeAsset: TokenIdSchema.nullish(),
    endDate: IsoCalendarDateStringSchema.nullish(),
    negativeRisk: z.boolean().nullish(),
  })
  .transform(({ asset, oppositeAsset, ...rest }) => ({
    ...rest,
    tokenId: asset,
    oppositeTokenId: oppositeAsset,
  }));

export const ClosedPositionSchema = z
  .looseObject({
    proxyWallet: AddressSchema.nullish(),
    asset: TokenIdSchema.nullish(),
    conditionId: ConditionIdSchema.nullish(),
    avgPrice: z.number().nullish(),
    totalBought: z.number().nullish(),
    realizedPnl: z.number().nullish(),
    curPrice: z.number().nullish(),
    timestamp: EpochSecondsToMillisecondsSchema.nullish(),
    title: z.string().nullish(),
    slug: z.string().nullish(),
    icon: z.string().nullish(),
    eventSlug: z.string().nullish(),
    outcome: z.string().nullish(),
    outcomeIndex: z.number().int().nullish(),
    oppositeOutcome: z.string().nullish(),
    oppositeAsset: TokenIdSchema.nullish(),
    endDate: MixedDateTimeStringSchema.nullish(),
  })
  .transform(({ asset, oppositeAsset, ...rest }) => ({
    ...rest,
    tokenId: asset,
    oppositeTokenId: oppositeAsset,
  }));

export const ValueSchema = z.object({
  user: AddressSchema.nullish(),
  value: z.number().nullish(),
});

export const MarketPositionSchema = z
  .looseObject({
    proxyWallet: AddressSchema.nullish(),
    name: z.string().nullish(),
    profileImage: z.string().nullish(),
    verified: z.boolean().nullish(),
    asset: TokenIdSchema.nullish(),
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
  })
  .transform(({ asset, ...rest }) => ({
    ...rest,
    tokenId: asset,
  }));

export const MetaMarketPositionSchema = z.object({
  token: z.string().nullish(),
  positions: z.array(MarketPositionSchema).nullish(),
});

export const ListPositionsResponseSchema = z.array(PositionSchema);
export const ListClosedPositionsResponseSchema = z.array(ClosedPositionSchema);
export const FetchPortfolioValueResponseSchema = z.array(ValueSchema);
export const ListMarketPositionsResponseSchema = z.array(
  MetaMarketPositionSchema,
);

export type Position = z.infer<typeof PositionSchema>;
export type ClosedPosition = z.infer<typeof ClosedPositionSchema>;
export type Value = z.infer<typeof ValueSchema>;
export type MarketPosition = z.infer<typeof MarketPositionSchema>;
export type MetaMarketPosition = z.infer<typeof MetaMarketPositionSchema>;
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
