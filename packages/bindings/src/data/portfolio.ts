import { z } from 'zod';
import {
  ApproxNumberSchema,
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
    conditionId: ConditionIdSchema,
    size: ApproxNumberSchema.nullish(),
    avgPrice: ApproxNumberSchema.nullish(),
    initialValue: ApproxNumberSchema.nullish(),
    currentValue: ApproxNumberSchema.nullish(),
    cashPnl: ApproxNumberSchema.nullish(),
    percentPnl: ApproxNumberSchema.nullish(),
    totalBought: ApproxNumberSchema.nullish(),
    realizedPnl: ApproxNumberSchema.nullish(),
    percentRealizedPnl: ApproxNumberSchema.nullish(),
    curPrice: ApproxNumberSchema.nullish(),
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
    avgPrice: ApproxNumberSchema.nullish(),
    totalBought: ApproxNumberSchema.nullish(),
    realizedPnl: ApproxNumberSchema.nullish(),
    curPrice: ApproxNumberSchema.nullish(),
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
  value: ApproxNumberSchema.nullish(),
});

export const MarketPositionSchema = z
  .looseObject({
    proxyWallet: AddressSchema.nullish(),
    name: z.string().nullish(),
    profileImage: z.string().nullish(),
    verified: z.boolean().nullish(),
    asset: TokenIdSchema.nullish(),
    conditionId: ConditionIdSchema.nullish(),
    avgPrice: ApproxNumberSchema.nullish(),
    size: ApproxNumberSchema.nullish(),
    currPrice: ApproxNumberSchema.nullish(),
    currentValue: ApproxNumberSchema.nullish(),
    cashPnl: ApproxNumberSchema.nullish(),
    totalBought: ApproxNumberSchema.nullish(),
    realizedPnl: ApproxNumberSchema.nullish(),
    totalPnl: ApproxNumberSchema.nullish(),
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
