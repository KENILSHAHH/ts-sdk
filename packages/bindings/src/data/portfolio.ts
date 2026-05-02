import { z } from 'zod';
import {
  ConditionIdSchema,
  DecimalishSchema,
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
    size: DecimalishSchema.nullish(),
    avgPrice: DecimalishSchema.nullish(),
    initialValue: DecimalishSchema.nullish(),
    currentValue: DecimalishSchema.nullish(),
    cashPnl: DecimalishSchema.nullish(),
    percentPnl: z.number().nullish(),
    totalBought: DecimalishSchema.nullish(),
    realizedPnl: DecimalishSchema.nullish(),
    percentRealizedPnl: z.number().nullish(),
    curPrice: DecimalishSchema.nullish(),
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
    avgPrice: DecimalishSchema.nullish(),
    totalBought: DecimalishSchema.nullish(),
    realizedPnl: DecimalishSchema.nullish(),
    curPrice: DecimalishSchema.nullish(),
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
  value: DecimalishSchema.nullish(),
});

export const MarketPositionSchema = z
  .looseObject({
    proxyWallet: AddressSchema.nullish(),
    name: z.string().nullish(),
    profileImage: z.string().nullish(),
    verified: z.boolean().nullish(),
    asset: TokenIdSchema.nullish(),
    conditionId: ConditionIdSchema.nullish(),
    avgPrice: DecimalishSchema.nullish(),
    size: DecimalishSchema.nullish(),
    currPrice: DecimalishSchema.nullish(),
    currentValue: DecimalishSchema.nullish(),
    cashPnl: DecimalishSchema.nullish(),
    totalBought: DecimalishSchema.nullish(),
    realizedPnl: DecimalishSchema.nullish(),
    totalPnl: DecimalishSchema.nullish(),
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
