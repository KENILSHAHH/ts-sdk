import { z } from 'zod';
import {
  DecimalStringSchema,
  EpochMillisecondsToIsoDateTimeStringSchema,
  OrderSideSchema,
  TokenIdSchema,
  toIsoDateTimeString,
} from '../shared';

const BuilderTradeMatchTimeSchema = z.union([
  z
    .union([z.number().int(), z.string().regex(/^\d+$/).transform(Number)])
    .transform((value) =>
      toIsoDateTimeString(
        new Date(
          value < 1_000_000_000_000 ? value * 1000 : value,
        ).toISOString(),
      ),
    ),
  z.string().transform(toIsoDateTimeString),
]);

export const BuilderTradeSchema = z
  .object({
    id: z.string(),
    tradeType: z.string(),
    takerOrderHash: z.string(),
    builder: z.string(),
    market: z.string(),
    assetId: TokenIdSchema,
    side: OrderSideSchema,
    size: DecimalStringSchema,
    sizeUsdc: DecimalStringSchema,
    price: DecimalStringSchema,
    status: z.string(),
    outcome: z.string(),
    outcomeIndex: z.number().int(),
    owner: z.string(),
    maker: z.string(),
    transactionHash: z.string(),
    matchTime: BuilderTradeMatchTimeSchema,
    bucketIndex: z.number().int(),
    fee: DecimalStringSchema,
    feeUsdc: DecimalStringSchema,
    err_msg: z.string().nullable().optional(),
    createdAt: EpochMillisecondsToIsoDateTimeStringSchema.optional(),
    updatedAt: EpochMillisecondsToIsoDateTimeStringSchema.optional(),
  })
  .transform(({ err_msg, assetId, matchTime, ...rest }) => ({
    ...rest,
    tokenId: assetId,
    errMsg: err_msg,
    matchedAt: matchTime,
  }));
export type BuilderTrade = z.infer<typeof BuilderTradeSchema>;

export const PaginatedBuilderTradesSchema = z
  .object({
    limit: z.number().int(),
    count: z.number().int(),
    next_cursor: z.string(),
    data: z.array(BuilderTradeSchema),
  })
  .transform(({ next_cursor, ...rest }) => ({
    ...rest,
    nextCursor: next_cursor,
  }));
export type PaginatedBuilderTrades = z.infer<
  typeof PaginatedBuilderTradesSchema
>;

const BUILDER_FEES_BPS = 10_000;

export const BuilderFeeRatesSchema = z
  .object({
    builder_maker_fee_rate_bps: z.number(),
    builder_taker_fee_rate_bps: z.number(),
  })
  .transform(({ builder_maker_fee_rate_bps, builder_taker_fee_rate_bps }) => ({
    maker: builder_maker_fee_rate_bps / BUILDER_FEES_BPS,
    taker: builder_taker_fee_rate_bps / BUILDER_FEES_BPS,
  }));

export const FetchBuilderFeeRatesResponseSchema = BuilderFeeRatesSchema;

export type BuilderFeeRates = z.infer<typeof BuilderFeeRatesSchema>;
export type FetchBuilderFeeRatesResponse = z.infer<
  typeof FetchBuilderFeeRatesResponseSchema
>;
