import { z } from 'zod';
import {
  DecimalStringSchema,
  EpochMillisecondsSchema,
  EvmAddressSchema,
} from '../shared';
import { PerpsAssetSchema, PerpsInstrumentIdSchema } from './common';

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
  timestamp: EpochMillisecondsSchema,
});

export type PerpsPortfolio = z.infer<typeof PerpsPortfolioSchema>;

export const RawPerpsPortfolioSchema = z
  .object({
    positions: z.array(RawPerpsPortfolioPositionSchema),
    margin: RawPerpsMarginSummarySchema,
    withdrawable: DecimalStringSchema,
    in_liquidation: z.boolean(),
    timestamp: EpochMillisecondsSchema,
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
  timestamp: EpochMillisecondsSchema,
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
    timestamp: EpochMillisecondsSchema,
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
    ts: EpochMillisecondsSchema,
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
  .tuple([EpochMillisecondsSchema, DecimalStringSchema])
  .transform(([timestamp, equity]) => ({ timestamp, equity }));

export type PerpsEquityPoint = z.infer<typeof PerpsEquityPointSchema>;

export const PerpsPnlPointSchema = z
  .tuple([EpochMillisecondsSchema, DecimalStringSchema])
  .transform(([timestamp, pnl]) => ({ timestamp, pnl }));

export type PerpsPnlPoint = z.infer<typeof PerpsPnlPointSchema>;

const RawPerpsProxyExpirySchema = z
  .number()
  .finite()
  .positive()
  .refine((value) => Number.isInteger(value), 'Expected integer')
  // The credentials endpoint currently returns proxy expiries in nanoseconds.
  .transform((value) =>
    value > Number.MAX_SAFE_INTEGER ? Math.floor(value / 1_000_000) : value,
  )
  .pipe(EpochMillisecondsSchema);

export const PerpsProxyKeySchema = z.object({
  proxy: EvmAddressSchema,
  label: z.string().optional(),
  expiresAt: EpochMillisecondsSchema,
});

export type PerpsProxyKey = z.infer<typeof PerpsProxyKeySchema>;

export const RawPerpsProxyKeySchema = z
  .object({
    proxy: EvmAddressSchema,
    label: z.string().optional(),
    expiry: RawPerpsProxyExpirySchema,
  })
  .transform((key) => ({
    proxy: key.proxy,
    label: key.label,
    expiresAt: key.expiry,
  }));

export const RawPerpsCredentialsResponseSchema = z
  .object({
    address: EvmAddressSchema,
    keys: z.array(RawPerpsProxyKeySchema),
  })
  .transform((credentials) => ({
    address: credentials.address,
    keys: credentials.keys,
  }));

export const RawPerpsCreateProxyResponseSchema = z.object({
  secret: z.string().min(1),
});
