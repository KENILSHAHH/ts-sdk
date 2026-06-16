import {
  FetchPerpsCandlesResponseSchema,
  FetchPerpsFeesResponseSchema,
  FetchPerpsFundingHistoryResponseSchema,
  FetchPerpsInstrumentsResponseSchema,
  FetchPerpsStatisticsResponseSchema,
  FetchPerpsTickersResponseSchema,
  FetchPerpsTradesResponseSchema,
  type PerpsBook,
  type PerpsCandle,
  type PerpsFeeScheduleEntry,
  type PerpsFundingRate,
  type PerpsInstrument,
  PerpsInstrumentCategorySchema,
  PerpsInstrumentIdSchema,
  PerpsInstrumentTypeSchema,
  PerpsKlineIntervalSchema,
  type PerpsPublicTrade,
  type PerpsTicker,
  RawPerpsBookSchema,
} from '@polymarket/bindings/perps';
import { unwrap } from '@polymarket/types';
import { z } from 'zod';
import type { BaseClient } from '../clients';
import {
  makeErrorGuard,
  RateLimitError,
  RequestRejectedError,
  TransportError,
  UnexpectedResponseError,
  UserInputError,
} from '../errors';
import { parseUserInput } from '../input';
import { validateWith } from '../response';
import { snakeCase, toSearchParams } from './params';

type PerpsPublicReadError =
  | RateLimitError
  | RequestRejectedError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;

const PerpsPublicReadError = makeErrorGuard(
  RateLimitError,
  RequestRejectedError,
  TransportError,
  UnexpectedResponseError,
  UserInputError,
);

const TimestampInputSchema = z.number().int().nonnegative();

const FetchPerpsInstrumentsRequestSchema = z
  .object({
    instrumentId: PerpsInstrumentIdSchema.optional(),
    instrumentType: PerpsInstrumentTypeSchema.optional(),
    category: PerpsInstrumentCategorySchema.optional(),
  })
  .default({});

export type FetchPerpsInstrumentsRequest = z.input<
  typeof FetchPerpsInstrumentsRequestSchema
>;

export type FetchPerpsInstrumentsError = PerpsPublicReadError;
export const FetchPerpsInstrumentsError = PerpsPublicReadError;

/**
 * Fetches Perps instruments.
 *
 * @remarks
 * This is a low-level function. Most SDK consumers should prefer the client instance API.
 *
 * @throws {@link FetchPerpsInstrumentsError}
 * Thrown on failure.
 */
export async function fetchPerpsInstruments(
  client: BaseClient,
  request?: FetchPerpsInstrumentsRequest,
): Promise<PerpsInstrument[]> {
  const params = parseUserInput(request, FetchPerpsInstrumentsRequestSchema);

  return unwrap(
    client.perps
      .get('/v1/info/instruments', {
        params: toSearchParams(params, snakeCase()),
      })
      .andThen(validateWith(FetchPerpsInstrumentsResponseSchema)),
  );
}

const FetchPerpsTickerRequestSchema = z.object({
  instrumentId: PerpsInstrumentIdSchema,
});

export type FetchPerpsTickerRequest = z.input<
  typeof FetchPerpsTickerRequestSchema
>;

export type FetchPerpsTickerError = PerpsPublicReadError;
export const FetchPerpsTickerError = PerpsPublicReadError;

/**
 * Fetches the current Perps ticker for an instrument.
 *
 * @remarks
 * This is a low-level function. Most SDK consumers should prefer the client instance API.
 *
 * @throws {@link FetchPerpsTickerError}
 * Thrown on failure.
 */
export async function fetchPerpsTicker(
  client: BaseClient,
  request: FetchPerpsTickerRequest,
): Promise<PerpsTicker> {
  const params = parseUserInput(request, FetchPerpsTickerRequestSchema);
  const [ticker] = await fetchPerpsTickers(client, params);

  if (ticker === undefined) {
    throw new UnexpectedResponseError(
      `Perps ticker ${params.instrumentId} was not returned by the API`,
    );
  }

  return ticker;
}

const FetchPerpsTickersRequestSchema = z
  .object({
    instrumentId: PerpsInstrumentIdSchema.optional(),
  })
  .default({});

export type FetchPerpsTickersRequest = z.input<
  typeof FetchPerpsTickersRequestSchema
>;

export type FetchPerpsTickersError = PerpsPublicReadError;
export const FetchPerpsTickersError = PerpsPublicReadError;

/**
 * Fetches current Perps tickers.
 *
 * @remarks
 * This is a low-level function. Most SDK consumers should prefer the client instance API.
 *
 * @throws {@link FetchPerpsTickersError}
 * Thrown on failure.
 */
export async function fetchPerpsTickers(
  client: BaseClient,
  request?: FetchPerpsTickersRequest,
): Promise<PerpsTicker[]> {
  const params = parseUserInput(request, FetchPerpsTickersRequestSchema);
  const query = toSearchParams(params, snakeCase());
  const [tickers, statistics] = await Promise.all([
    unwrap(
      client.perps
        .get('/v1/info/tickers', { params: query })
        .andThen(validateWith(FetchPerpsTickersResponseSchema)),
    ),
    unwrap(
      client.perps
        .get('/v1/info/statistics', { params: query })
        .andThen(validateWith(FetchPerpsStatisticsResponseSchema)),
    ),
  ]);
  const statisticsByInstrument = new Map(
    statistics.map((statistic) => [statistic.instrumentId, statistic]),
  );

  return tickers.map((ticker) => {
    const statistic = statisticsByInstrument.get(ticker.instrumentId);

    return {
      ...ticker,
      openPrice: statistic?.openPrice,
      volume24h: statistic?.volume,
    };
  });
}

const FetchPerpsBookRequestSchema = z.object({
  instrumentId: PerpsInstrumentIdSchema,
  depth: z
    .union([z.literal(10), z.literal(100), z.literal(500), z.literal(1000)])
    .optional(),
});

export type FetchPerpsBookRequest = z.input<typeof FetchPerpsBookRequestSchema>;

export type FetchPerpsBookError = PerpsPublicReadError;
export const FetchPerpsBookError = PerpsPublicReadError;

/**
 * Fetches a Perps order book.
 *
 * @remarks
 * This is a low-level function. Most SDK consumers should prefer the client instance API.
 *
 * @throws {@link FetchPerpsBookError}
 * Thrown on failure.
 */
export async function fetchPerpsBook(
  client: BaseClient,
  request: FetchPerpsBookRequest,
): Promise<PerpsBook> {
  const params = parseUserInput(request, FetchPerpsBookRequestSchema);

  return unwrap(
    client.perps
      .get('/v1/info/book', {
        params: toSearchParams(params, snakeCase()),
      })
      .andThen(validateWith(RawPerpsBookSchema)),
  );
}

const FetchPerpsCandlesRequestSchema = z
  .object({
    instrumentId: PerpsInstrumentIdSchema,
    interval: PerpsKlineIntervalSchema,
    start: TimestampInputSchema.optional(),
    end: TimestampInputSchema.optional(),
  })
  .transform(({ end, start, ...request }) => ({
    ...request,
    endTimestamp: end,
    startTimestamp: start ?? Date.now() - 24 * 60 * 60 * 1000,
  }));

export type FetchPerpsCandlesRequest = z.input<
  typeof FetchPerpsCandlesRequestSchema
>;

export type FetchPerpsCandlesError = PerpsPublicReadError;
export const FetchPerpsCandlesError = PerpsPublicReadError;

/**
 * Fetches Perps candles for an instrument.
 *
 * @remarks
 * Defaults to the past 24 hours when `start` is omitted.
 *
 * @throws {@link FetchPerpsCandlesError}
 * Thrown on failure.
 */
export async function fetchPerpsCandles(
  client: BaseClient,
  request: FetchPerpsCandlesRequest,
): Promise<PerpsCandle[]> {
  const params = parseUserInput(request, FetchPerpsCandlesRequestSchema);

  const response = await unwrap(
    client.perps
      .get('/v1/info/klines', {
        params: toSearchParams(params, snakeCase()),
      })
      .andThen(validateWith(FetchPerpsCandlesResponseSchema)),
  );

  return response.data;
}

const TimeRangePerpsRequestSchema = z
  .object({
    instrumentId: PerpsInstrumentIdSchema,
    start: TimestampInputSchema.optional(),
    end: TimestampInputSchema.optional(),
  })
  .transform(({ end, start, ...request }) => ({
    ...request,
    endTimestamp: end,
    startTimestamp: start,
  }));

export type FetchPerpsFundingHistoryRequest = z.input<
  typeof TimeRangePerpsRequestSchema
>;

export type FetchPerpsFundingHistoryError = PerpsPublicReadError;
export const FetchPerpsFundingHistoryError = PerpsPublicReadError;

/**
 * Fetches Perps funding-rate history for an instrument.
 *
 * @remarks
 * This is a low-level function. Most SDK consumers should prefer the client instance API.
 *
 * @throws {@link FetchPerpsFundingHistoryError}
 * Thrown on failure.
 */
export async function fetchPerpsFundingHistory(
  client: BaseClient,
  request: FetchPerpsFundingHistoryRequest,
): Promise<PerpsFundingRate[]> {
  const params = parseUserInput(request, TimeRangePerpsRequestSchema);

  const response = await unwrap(
    client.perps
      .get('/v1/info/funding', {
        params: toSearchParams(params, snakeCase()),
      })
      .andThen(validateWith(FetchPerpsFundingHistoryResponseSchema)),
  );

  return response.data;
}

export type FetchPerpsTradesRequest = z.input<
  typeof TimeRangePerpsRequestSchema
>;

export type FetchPerpsTradesError = PerpsPublicReadError;
export const FetchPerpsTradesError = PerpsPublicReadError;

/**
 * Fetches recent Perps trades for an instrument.
 *
 * @remarks
 * This is a low-level function. Most SDK consumers should prefer the client instance API.
 *
 * @throws {@link FetchPerpsTradesError}
 * Thrown on failure.
 */
export async function fetchPerpsTrades(
  client: BaseClient,
  request: FetchPerpsTradesRequest,
): Promise<PerpsPublicTrade[]> {
  const params = parseUserInput(request, TimeRangePerpsRequestSchema);

  const response = await unwrap(
    client.perps
      .get('/v1/info/trades', {
        params: toSearchParams(params, snakeCase()),
      })
      .andThen(validateWith(FetchPerpsTradesResponseSchema)),
  );

  return response.data;
}

export type FetchPerpsFeesError =
  | RateLimitError
  | RequestRejectedError
  | TransportError
  | UnexpectedResponseError;
export const FetchPerpsFeesError = makeErrorGuard(
  RateLimitError,
  RequestRejectedError,
  TransportError,
  UnexpectedResponseError,
);

/**
 * Fetches the Perps fee schedule.
 *
 * @remarks
 * This is a low-level function. Most SDK consumers should prefer the client instance API.
 *
 * @throws {@link FetchPerpsFeesError}
 * Thrown on failure.
 */
export async function fetchPerpsFees(
  client: BaseClient,
): Promise<PerpsFeeScheduleEntry[]> {
  const response = await unwrap(
    client.perps
      .get('/v1/info/fees')
      .andThen(validateWith(FetchPerpsFeesResponseSchema)),
  );

  return response.feeSchedule;
}
