import { z } from 'zod';
import {
  PerpsInstrumentIdSchema,
  type PerpsKlineInterval,
} from '../perps/common';
import {
  PerpsCandleSchema,
  RawPerpsBboDataSchema,
  RawPerpsBookUpdateSchema,
  RawPerpsPublicTradeResponseSchema,
  RawPerpsStatisticDataSchema,
  RawPerpsTickerEntrySchema,
} from '../perps/market';
import { EpochMillisecondsSchema } from '../shared';

const SequenceSchema = z.number().int().nonnegative();

const TradesChannelSchema = z.string().regex(/^trades::\d+$/);
const BboChannelSchema = z.string().regex(/^bbo::\d+$/);
const BookChannelSchema = z.string().regex(/^book::\d+$/);
const TickersChannelSchema = z.string().regex(/^tickers::(all|\d+)$/);
const StatisticsChannelSchema = z.string().regex(/^statistics::(all|\d+)$/);
const CandlesChannelSchema = z
  .string()
  .regex(/^klines::\d+::(1m|5m|15m|1h|4h|1d|1w)$/);

const PerpsUpdateEnvelopeSchema = z.object({
  ts: EpochMillisecondsSchema,
  sq: SequenceSchema,
});

export const PerpsTradeEventSchema = PerpsUpdateEnvelopeSchema.extend({
  ch: TradesChannelSchema,
  data: RawPerpsPublicTradeResponseSchema,
}).transform(({ ch, ts, sq, data }) => ({
  topic: 'perps.trades' as const,
  type: 'trade' as const,
  channel: ch,
  timestamp: ts,
  sequence: sq,
  payload: data,
}));

export type PerpsTradeEvent = z.infer<typeof PerpsTradeEventSchema>;

export const PerpsBboEventSchema = PerpsUpdateEnvelopeSchema.extend({
  ch: BboChannelSchema,
  data: RawPerpsBboDataSchema,
}).transform(({ ch, ts, sq, data }) => ({
  topic: 'perps.bbo' as const,
  type: 'bbo' as const,
  channel: ch,
  timestamp: ts,
  sequence: sq,
  payload: data,
}));

export type PerpsBboEvent = z.infer<typeof PerpsBboEventSchema>;

export const PerpsBookEventSchema = PerpsUpdateEnvelopeSchema.extend({
  ch: BookChannelSchema,
  data: RawPerpsBookUpdateSchema,
}).transform(({ ch, ts, sq, data }) => ({
  topic: 'perps.book' as const,
  type: 'book' as const,
  channel: ch,
  timestamp: ts,
  sequence: sq,
  payload: {
    instrumentId: instrumentIdFromChannel(ch),
    ...data,
  },
}));

export type PerpsBookEvent = z.infer<typeof PerpsBookEventSchema>;

export const PerpsTickerEventSchema = PerpsUpdateEnvelopeSchema.extend({
  ch: TickersChannelSchema,
  data: RawPerpsTickerEntrySchema,
}).transform(({ ch, ts, sq, data }) => ({
  topic: 'perps.tickers' as const,
  type: 'ticker' as const,
  channel: ch,
  timestamp: ts,
  sequence: sq,
  payload: data,
}));

export type PerpsTickerEvent = z.infer<typeof PerpsTickerEventSchema>;

export const PerpsStatisticEventSchema = PerpsUpdateEnvelopeSchema.extend({
  ch: StatisticsChannelSchema,
  data: RawPerpsStatisticDataSchema,
}).transform(({ ch, ts, sq, data }) => ({
  topic: 'perps.statistics' as const,
  type: 'statistic' as const,
  channel: ch,
  timestamp: ts,
  sequence: sq,
  payload: data,
}));

export type PerpsStatisticEvent = z.infer<typeof PerpsStatisticEventSchema>;

export const PerpsCandleEventSchema = PerpsUpdateEnvelopeSchema.extend({
  ch: CandlesChannelSchema,
  data: z.array(PerpsCandleSchema),
}).transform(({ ch, ts, sq, data }) => ({
  topic: 'perps.candles' as const,
  type: 'candle' as const,
  channel: ch,
  timestamp: ts,
  sequence: sq,
  payload: {
    instrumentId: instrumentIdFromChannel(ch),
    interval: candleIntervalFromChannel(ch),
    candles: data,
  },
}));

export type PerpsCandleEvent = z.infer<typeof PerpsCandleEventSchema>;

export const PerpsMarketDataEventSchema = z.union([
  PerpsTradeEventSchema,
  PerpsBboEventSchema,
  PerpsBookEventSchema,
  PerpsTickerEventSchema,
  PerpsStatisticEventSchema,
  PerpsCandleEventSchema,
]);

export type PerpsMarketDataEvent = z.infer<typeof PerpsMarketDataEventSchema>;

function instrumentIdFromChannel(channel: string) {
  const [, rawInstrumentId] = channel.split('::');
  return PerpsInstrumentIdSchema.parse(Number(rawInstrumentId));
}

function candleIntervalFromChannel(channel: string) {
  const [, , interval] = channel.split('::');
  return interval as Exclude<PerpsKlineInterval, PerpsKlineInterval.OneSecond>;
}
