import { z } from 'zod';
import {
  DecimalStringSchema,
  EpochMillisecondsSchema,
  TxHashSchema,
} from '../shared';
import {
  PerpsAssetSchema,
  PerpsClientOrderIdSchema,
  PerpsInstrumentIdSchema,
  PerpsOrderIdSchema,
  PerpsSideSchema,
  PerpsTimeInForceSchema,
  PerpsTradeIdSchema,
} from './common';

export const PerpsOrderSchema = z.object({
  orderId: PerpsOrderIdSchema,
  instrumentId: PerpsInstrumentIdSchema,
  buy: z.boolean(),
  price: DecimalStringSchema,
  quantity: DecimalStringSchema,
  timeInForce: PerpsTimeInForceSchema,
  postOnly: z.boolean(),
  status: z.string().min(1),
  restingQuantity: DecimalStringSchema,
  filledQuantity: DecimalStringSchema,
  createdTimestamp: EpochMillisecondsSchema,
  updatedTimestamp: EpochMillisecondsSchema,
  clientOrderId: z.string().optional(),
});

export type PerpsOrder = z.infer<typeof PerpsOrderSchema>;

export const PerpsCommandStatusSchema = z.enum(['ok', 'err']);

export const PerpsOrderCommandAckSchema = z.object({
  status: PerpsCommandStatusSchema,
  orderId: PerpsOrderIdSchema.optional(),
  clientOrderId: PerpsClientOrderIdSchema.optional(),
  error: z.string().optional(),
});

export type PerpsOrderCommandAck = z.infer<typeof PerpsOrderCommandAckSchema>;

export const RawPerpsOrderCommandAckSchema = z
  .object({
    status: PerpsCommandStatusSchema,
    oid: PerpsOrderIdSchema.optional(),
    coid: PerpsClientOrderIdSchema.optional(),
    error: z.string().optional(),
  })
  .transform((ack) => ({
    status: ack.status,
    orderId: ack.oid,
    clientOrderId: ack.coid,
    error: ack.error,
  }));

export const PerpsCommandAckSchema = z.object({
  status: PerpsCommandStatusSchema,
  error: z.string().optional(),
});

export type PerpsCommandAck = z.infer<typeof PerpsCommandAckSchema>;

export const RawPerpsOrderSchema = z
  .object({
    order_id: PerpsOrderIdSchema,
    instrument_id: PerpsInstrumentIdSchema,
    buy: z.boolean(),
    price: DecimalStringSchema,
    quantity: DecimalStringSchema,
    tif: PerpsTimeInForceSchema,
    post_only: z.boolean(),
    status: z.string().min(1),
    resting_quantity: DecimalStringSchema,
    filled_quantity: DecimalStringSchema,
    created_timestamp: EpochMillisecondsSchema,
    updated_timestamp: EpochMillisecondsSchema,
    client_order_id: z.string().optional(),
  })
  .transform((order) => ({
    orderId: order.order_id,
    instrumentId: order.instrument_id,
    buy: order.buy,
    price: order.price,
    quantity: order.quantity,
    timeInForce: order.tif,
    postOnly: order.post_only,
    status: order.status,
    restingQuantity: order.resting_quantity,
    filledQuantity: order.filled_quantity,
    createdTimestamp: order.created_timestamp,
    updatedTimestamp: order.updated_timestamp,
    clientOrderId: order.client_order_id,
  }));

export const RawPerpsOrderUpdateSchema = z
  .object({
    oid: PerpsOrderIdSchema,
    iid: PerpsInstrumentIdSchema,
    buy: z.boolean(),
    p: DecimalStringSchema,
    qty: DecimalStringSchema,
    tif: PerpsTimeInForceSchema,
    po: z.boolean(),
    status: z.string().min(1),
    rest: DecimalStringSchema,
    fill: DecimalStringSchema,
    cts: EpochMillisecondsSchema,
    uts: EpochMillisecondsSchema,
    coid: z.string().optional(),
  })
  .transform((order) => ({
    orderId: order.oid,
    instrumentId: order.iid,
    buy: order.buy,
    price: order.p,
    quantity: order.qty,
    timeInForce: order.tif,
    postOnly: order.po,
    status: order.status,
    restingQuantity: order.rest,
    filledQuantity: order.fill,
    createdTimestamp: order.cts,
    updatedTimestamp: order.uts,
    clientOrderId: order.coid,
  }));

export const PerpsAccountFillSchema = z.object({
  tradeId: PerpsTradeIdSchema,
  orderId: PerpsOrderIdSchema,
  instrumentId: PerpsInstrumentIdSchema,
  side: PerpsSideSchema,
  price: DecimalStringSchema,
  quantity: DecimalStringSchema,
  taker: z.boolean(),
  fee: DecimalStringSchema,
  feeAsset: PerpsAssetSchema,
  previousSize: DecimalStringSchema,
  previousEntryPrice: DecimalStringSchema,
  pnl: DecimalStringSchema,
  liquidation: z.boolean(),
  timestamp: EpochMillisecondsSchema,
  hash: TxHashSchema.optional(),
  clientOrderId: z.string().optional(),
});

export type PerpsAccountFill = z.infer<typeof PerpsAccountFillSchema>;

export const RawPerpsAccountFillSchema = z
  .object({
    trade_id: PerpsTradeIdSchema,
    order_id: PerpsOrderIdSchema,
    instrument_id: PerpsInstrumentIdSchema,
    side: PerpsSideSchema,
    price: DecimalStringSchema,
    quantity: DecimalStringSchema,
    taker: z.boolean(),
    fee: DecimalStringSchema,
    fee_asset: PerpsAssetSchema,
    previous_size: DecimalStringSchema,
    previous_entry_price: DecimalStringSchema,
    pnl: DecimalStringSchema,
    liquidation: z.boolean(),
    timestamp: EpochMillisecondsSchema,
    hash: TxHashSchema.optional(),
  })
  .transform((fill) => ({
    tradeId: fill.trade_id,
    orderId: fill.order_id,
    instrumentId: fill.instrument_id,
    side: fill.side,
    price: fill.price,
    quantity: fill.quantity,
    taker: fill.taker,
    fee: fill.fee,
    feeAsset: fill.fee_asset,
    previousSize: fill.previous_size,
    previousEntryPrice: fill.previous_entry_price,
    pnl: fill.pnl,
    liquidation: fill.liquidation,
    timestamp: fill.timestamp,
    hash: fill.hash,
  }));

export const RawPerpsAccountFillUpdateSchema = z
  .object({
    tid: PerpsTradeIdSchema,
    oid: PerpsOrderIdSchema,
    iid: PerpsInstrumentIdSchema,
    side: PerpsSideSchema,
    p: DecimalStringSchema,
    qty: DecimalStringSchema,
    taker: z.boolean(),
    fee: DecimalStringSchema,
    fea: PerpsAssetSchema,
    psz: DecimalStringSchema,
    pep: DecimalStringSchema,
    pnl: DecimalStringSchema,
    liq: z.boolean(),
    ts: EpochMillisecondsSchema,
    coid: z.string().optional(),
  })
  .transform((fill) => ({
    tradeId: fill.tid,
    orderId: fill.oid,
    instrumentId: fill.iid,
    side: fill.side,
    price: fill.p,
    quantity: fill.qty,
    taker: fill.taker,
    fee: fill.fee,
    feeAsset: fill.fea,
    previousSize: fill.psz,
    previousEntryPrice: fill.pep,
    pnl: fill.pnl,
    liquidation: fill.liq,
    timestamp: fill.ts,
    clientOrderId: fill.coid,
  }));
