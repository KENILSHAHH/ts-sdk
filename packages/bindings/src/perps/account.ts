import { z } from 'zod';
import { DecimalStringSchema } from '../shared';
import {
  PerpsAssetSchema,
  PerpsInstrumentIdSchema,
  TimestampSchema,
} from './common';

export const PerpsBalanceSchema = z.object({
  asset: PerpsAssetSchema,
  balance: DecimalStringSchema,
  value: DecimalStringSchema,
});

export type PerpsBalance = z.infer<typeof PerpsBalanceSchema>;

export const PerpsPortfolioPositionSchema = z.object({
  instrumentId: PerpsInstrumentIdSchema,
  symbol: z.string().min(1),
  size: DecimalStringSchema,
  entryPrice: DecimalStringSchema,
  leverage: z.number().int().positive(),
  cross: z.boolean(),
  initialMargin: DecimalStringSchema,
  maintenanceMargin: DecimalStringSchema,
  positionValue: DecimalStringSchema,
  liquidationPrice: DecimalStringSchema,
  unrealizedPnl: DecimalStringSchema,
  returnOnEquity: DecimalStringSchema,
  cumulativeFunding: DecimalStringSchema,
});

export type PerpsPortfolioPosition = z.infer<
  typeof PerpsPortfolioPositionSchema
>;

export const RawPerpsPortfolioPositionSchema = z
  .object({
    instrument_id: PerpsInstrumentIdSchema,
    symbol: z.string().min(1),
    size: DecimalStringSchema,
    entry_price: DecimalStringSchema,
    leverage: z.number().int().positive(),
    cross: z.boolean(),
    initial_margin: DecimalStringSchema,
    maintenance_margin: DecimalStringSchema,
    position_value: DecimalStringSchema,
    liquidation_price: DecimalStringSchema,
    unrealized_pnl: DecimalStringSchema,
    return_on_equity: DecimalStringSchema,
    cumulative_funding: DecimalStringSchema,
  })
  .transform((position) => ({
    instrumentId: position.instrument_id,
    symbol: position.symbol,
    size: position.size,
    entryPrice: position.entry_price,
    leverage: position.leverage,
    cross: position.cross,
    initialMargin: position.initial_margin,
    maintenanceMargin: position.maintenance_margin,
    positionValue: position.position_value,
    liquidationPrice: position.liquidation_price,
    unrealizedPnl: position.unrealized_pnl,
    returnOnEquity: position.return_on_equity,
    cumulativeFunding: position.cumulative_funding,
  }));

export const PerpsMarginSummarySchema = z.object({
  totalAccountValue: DecimalStringSchema,
  totalInitialMargin: DecimalStringSchema,
  totalMaintenanceMargin: DecimalStringSchema,
  totalPositionValue: DecimalStringSchema,
});

export type PerpsMarginSummary = z.infer<typeof PerpsMarginSummarySchema>;

const RawPerpsMarginSummarySchema = z
  .object({
    total_account_value: DecimalStringSchema,
    total_initial_margin: DecimalStringSchema,
    total_maintenance_margin: DecimalStringSchema,
    total_position_value: DecimalStringSchema,
  })
  .transform((margin) => ({
    totalAccountValue: margin.total_account_value,
    totalInitialMargin: margin.total_initial_margin,
    totalMaintenanceMargin: margin.total_maintenance_margin,
    totalPositionValue: margin.total_position_value,
  }));

export const PerpsPortfolioSchema = z.object({
  positions: z.array(PerpsPortfolioPositionSchema),
  margin: PerpsMarginSummarySchema,
  withdrawable: DecimalStringSchema,
  inLiquidation: z.boolean(),
  timestamp: TimestampSchema,
});

export type PerpsPortfolio = z.infer<typeof PerpsPortfolioSchema>;

export const RawPerpsPortfolioSchema = z
  .object({
    positions: z.array(RawPerpsPortfolioPositionSchema),
    margin: RawPerpsMarginSummarySchema,
    withdrawable: DecimalStringSchema,
    in_liquidation: z.boolean(),
    timestamp: TimestampSchema,
  })
  .transform((portfolio) => ({
    positions: portfolio.positions,
    margin: portfolio.margin,
    withdrawable: portfolio.withdrawable,
    inLiquidation: portfolio.in_liquidation,
    timestamp: portfolio.timestamp,
  }));

export const PerpsAccountFundingPaymentSchema = z.object({
  instrumentId: PerpsInstrumentIdSchema,
  size: DecimalStringSchema,
  fundingRate: DecimalStringSchema,
  fundingAsset: PerpsAssetSchema,
  funding: DecimalStringSchema,
  timestamp: TimestampSchema,
});

export type PerpsAccountFundingPayment = z.infer<
  typeof PerpsAccountFundingPaymentSchema
>;

export const RawPerpsAccountFundingPaymentSchema = z
  .object({
    instrument_id: PerpsInstrumentIdSchema,
    size: DecimalStringSchema,
    funding_rate: DecimalStringSchema,
    funding_asset: PerpsAssetSchema,
    funding: DecimalStringSchema,
    timestamp: TimestampSchema,
  })
  .transform((funding) => ({
    instrumentId: funding.instrument_id,
    size: funding.size,
    fundingRate: funding.funding_rate,
    fundingAsset: funding.funding_asset,
    funding: funding.funding,
    timestamp: funding.timestamp,
  }));

export const RawPerpsAccountFundingPaymentEntrySchema = z
  .object({
    iid: PerpsInstrumentIdSchema,
    sz: DecimalStringSchema,
    fr: DecimalStringSchema,
    fund: DecimalStringSchema,
    fua: PerpsAssetSchema,
    ts: TimestampSchema,
  })
  .transform((funding) => ({
    instrumentId: funding.iid,
    size: funding.sz,
    fundingRate: funding.fr,
    fundingAsset: funding.fua,
    funding: funding.fund,
    timestamp: funding.ts,
  }));

export const PerpsAccountConfigSchema = z.object({
  instrumentId: PerpsInstrumentIdSchema,
  leverage: z.number().int().positive(),
  cross: z.boolean(),
});

export type PerpsAccountConfig = z.infer<typeof PerpsAccountConfigSchema>;

export const RawPerpsAccountConfigSchema = z
  .object({
    instrument_id: PerpsInstrumentIdSchema,
    leverage: z.number().int().positive(),
    cross: z.boolean(),
  })
  .transform((config) => ({
    instrumentId: config.instrument_id,
    leverage: config.leverage,
    cross: config.cross,
  }));

export const PerpsEquityPointSchema = z
  .tuple([TimestampSchema, DecimalStringSchema])
  .transform(([timestamp, equity]) => ({ timestamp, equity }));

export type PerpsEquityPoint = z.infer<typeof PerpsEquityPointSchema>;

export const PerpsPnlPointSchema = z
  .tuple([TimestampSchema, DecimalStringSchema])
  .transform(([timestamp, pnl]) => ({ timestamp, pnl }));

export type PerpsPnlPoint = z.infer<typeof PerpsPnlPointSchema>;
