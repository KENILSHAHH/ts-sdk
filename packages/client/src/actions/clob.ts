import type { TickSizeValue } from '@polymarket/bindings';
import {
  FetchFeeRateResponseSchema,
  FetchNegRiskResponseSchema,
  FetchOrderBookResponseSchema,
  FetchTickSizeResponseSchema,
  type LastTradePrice,
  type LastTradePriceForToken,
  LastTradePriceSchema,
  LastTradePricesSchema,
  MidpointSchema,
  MidpointsSchema,
  type OrderBook,
  OrderSideSchema,
  PriceHistoryIntervalSchema,
  type PriceHistoryPoint,
  PriceHistorySchema,
  PriceSchema,
  type Prices,
  PricesSchema,
  SpreadSchema,
  SpreadsSchema,
} from '@polymarket/bindings/clob';
import { unwrap } from '@polymarket/types';
import { z } from 'zod';
import type { Client } from '../clients';
import type {
  RateLimitError,
  RequestRejectedError,
  TransportError,
  UnexpectedResponseError,
  UserInputError,
} from '../errors';
import { parseUserInput } from '../input';
import { validateWith } from '../response';
import { snakeCase, toSearchParams } from './params';

const FetchMidpointRequestSchema = z.object({
  tokenId: z.string(),
});

export type FetchMidpointRequest = z.input<typeof FetchMidpointRequestSchema>;

export type FetchMidpointError =
  | RateLimitError
  | RequestRejectedError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;

/**
 * Fetches the midpoint price for a token.
 *
 * @throws {@link FetchMidpointError}
 * Thrown when the request is invalid, rejected, rate limited, interrupted by transport issues, or returns an unexpected response.
 *
 * @example
 * ```ts
 * const midpoint = await fetchMidpoint(client, {
 *   tokenId:
 *     '8501497159083948713316135768103773293754490207922884688769443031624417212426',
 * });
 *
 * // midpoint === '0.53'
 * ```
 *
 */
export async function fetchMidpoint(
  client: Client,
  request: FetchMidpointRequest,
): Promise<string> {
  const params = parseUserInput(request, FetchMidpointRequestSchema);
  const response = await unwrap(
    client.clob
      .get('midpoint', {
        params: toSearchParams(params, snakeCase()),
      })
      .andThen(validateWith(MidpointSchema)),
  );

  return response.mid;
}

const FetchMidpointsRequestSchema = z
  .array(
    z.object({
      tokenId: z.string(),
    }),
  )
  .min(1);

export type FetchMidpointsRequest = z.input<typeof FetchMidpointsRequestSchema>;

export type FetchMidpointsError =
  | RateLimitError
  | RequestRejectedError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;

/**
 * Fetches midpoint prices for multiple tokens.
 *
 * @throws {@link FetchMidpointsError}
 * Thrown when the request is invalid, rejected, rate limited, interrupted by transport issues, or returns an unexpected response.
 *
 * @example
 * ```ts
 * const midpoints = await fetchMidpoints(client, [
 *   {
 *     tokenId:
 *       '8501497159083948713316135768103773293754490207922884688769443031624417212426',
 *   },
 * ]);
 *
 * // midpoints[tokenId] === '0.53'
 * ```
 *
 */
export async function fetchMidpoints(
  client: Client,
  request: FetchMidpointsRequest,
): Promise<Record<string, string>> {
  const params = parseUserInput(request, FetchMidpointsRequestSchema);

  return unwrap(
    client.clob
      .post('midpoints', {
        json: toTokenRequestPayload(params),
      })
      .andThen(validateWith(MidpointsSchema)),
  );
}

const FetchTickSizeRequestSchema = z.object({
  tokenId: z.string(),
});

export type FetchTickSizeRequest = z.input<typeof FetchTickSizeRequestSchema>;

export type FetchTickSizeError =
  | RateLimitError
  | RequestRejectedError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;

/**
 * Fetches the minimum price tick size for a token's order book.
 *
 * @throws {@link FetchTickSizeError}
 * Thrown when the request is invalid, rejected, rate limited, interrupted by transport issues, or returns an unexpected response.
 *
 * @example
 * ```ts
 * const tickSize = await fetchTickSize(client, {
 *   tokenId:
 *     '8501497159083948713316135768103773293754490207922884688769443031624417212426',
 * });
 *
 * // tickSize === 0.01
 * ```
 */
export async function fetchTickSize(
  client: Client,
  request: FetchTickSizeRequest,
): Promise<TickSizeValue> {
  const params = parseUserInput(request, FetchTickSizeRequestSchema);
  const response = await unwrap(
    client.clob
      .get('tick-size', {
        params: toSearchParams(params, snakeCase()),
      })
      .andThen(validateWith(FetchTickSizeResponseSchema)),
  );

  return response.minimum_tick_size;
}

const FetchNegRiskRequestSchema = z.object({
  tokenId: z.string(),
});

export type FetchNegRiskRequest = z.input<typeof FetchNegRiskRequestSchema>;

export type FetchNegRiskError =
  | RateLimitError
  | RequestRejectedError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;

/**
 * Fetches whether a token is in a negative-risk market.
 *
 * @throws {@link FetchNegRiskError}
 * Thrown when the request is invalid, rejected, rate limited, interrupted by transport issues, or returns an unexpected response.
 *
 * @example
 * ```ts
 * const negRisk = await fetchNegRisk(client, {
 *   tokenId:
 *     '8501497159083948713316135768103773293754490207922884688769443031624417212426',
 * });
 *
 * // negRisk === false
 * ```
 */
export async function fetchNegRisk(
  client: Client,
  request: FetchNegRiskRequest,
): Promise<boolean> {
  const params = parseUserInput(request, FetchNegRiskRequestSchema);
  const response = await unwrap(
    client.clob
      .get('neg-risk', {
        params: toSearchParams(params, snakeCase()),
      })
      .andThen(validateWith(FetchNegRiskResponseSchema)),
  );

  return response.neg_risk;
}

const FetchFeeRateRequestSchema = z.object({
  tokenId: z.string(),
});

export type FetchFeeRateRequest = z.input<typeof FetchFeeRateRequestSchema>;

export type FetchFeeRateError =
  | RateLimitError
  | RequestRejectedError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;

/**
 * Fetches the base fee rate, in basis points, for a token's order book.
 *
 * @throws {@link FetchFeeRateError}
 * Thrown when the request is invalid, rejected, rate limited, interrupted by transport issues, or returns an unexpected response.
 *
 * @example
 * ```ts
 * const feeRate = await fetchFeeRate(client, {
 *   tokenId:
 *     '8501497159083948713316135768103773293754490207922884688769443031624417212426',
 * });
 *
 * // feeRate === 0
 * ```
 */
export async function fetchFeeRate(
  client: Client,
  request: FetchFeeRateRequest,
): Promise<number> {
  const params = parseUserInput(request, FetchFeeRateRequestSchema);
  const response = await unwrap(
    client.clob
      .get('fee-rate', {
        params: toSearchParams(params, snakeCase()),
      })
      .andThen(validateWith(FetchFeeRateResponseSchema)),
  );

  return response.base_fee;
}

const FetchPriceRequestSchema = z.object({
  tokenId: z.string(),
  side: OrderSideSchema,
});

export type FetchPriceRequest = z.input<typeof FetchPriceRequestSchema>;

export type FetchPriceError =
  | RateLimitError
  | RequestRejectedError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;

/**
 * Fetches the current quoted price for a token and side.
 *
 * @throws {@link FetchPriceError}
 * Thrown when the request is invalid, rejected, rate limited, interrupted by transport issues, or returns an unexpected response.
 *
 * @example
 * ```ts
 * const price = await fetchPrice(client, {
 *   tokenId:
 *     '8501497159083948713316135768103773293754490207922884688769443031624417212426',
 *   side: OrderSide.BUY,
 * });
 *
 * // price === '0.52'
 * ```
 *
 */
export async function fetchPrice(
  client: Client,
  request: FetchPriceRequest,
): Promise<string> {
  const params = parseUserInput(request, FetchPriceRequestSchema);
  const response = await unwrap(
    client.clob
      .get('price', {
        params: toSearchParams(params, snakeCase()),
      })
      .andThen(validateWith(PriceSchema)),
  );

  return response.price;
}

const FetchPricesRequestSchema = z
  .array(
    z.object({
      tokenId: z.string(),
      side: OrderSideSchema,
    }),
  )
  .min(1);

export type FetchPricesRequest = z.input<typeof FetchPricesRequestSchema>;

export type FetchPricesError =
  | RateLimitError
  | RequestRejectedError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;

/**
 * Fetches quoted prices for multiple tokens.
 *
 * @throws {@link FetchPricesError}
 * Thrown when the request is invalid, rejected, rate limited, interrupted by transport issues, or returns an unexpected response.
 *
 * @example
 * ```ts
 * const prices = await fetchPrices(client, [
 *   {
 *     tokenId:
 *       '8501497159083948713316135768103773293754490207922884688769443031624417212426',
 *     side: OrderSide.BUY,
 *   },
 * ]);
 *
 * // prices[tokenId]?.BUY === '0.52'
 * ```
 *
 */
export async function fetchPrices(
  client: Client,
  request: FetchPricesRequest,
): Promise<Prices> {
  const params = parseUserInput(request, FetchPricesRequestSchema);

  return unwrap(
    client.clob
      .post('prices', {
        json: toTokenWithSideRequestPayload(params),
      })
      .andThen(validateWith(PricesSchema)),
  );
}

const FetchOrderBookRequestSchema = z.object({
  tokenId: z.string(),
});

export type FetchOrderBookRequest = z.input<typeof FetchOrderBookRequestSchema>;

export type FetchOrderBookError =
  | RateLimitError
  | RequestRejectedError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;

/**
 * Fetches the current order book for a token.
 *
 * @throws {@link FetchOrderBookError}
 * Thrown when the request is invalid, rejected, rate limited, interrupted by transport issues, or returns an unexpected response.
 *
 * @example
 * ```ts
 * const orderBook = await fetchOrderBook(client, {
 *   tokenId:
 *     '8501497159083948713316135768103773293754490207922884688769443031624417212426',
 * });
 *
 * // orderBook.bids / orderBook.asks
 * ```
 */
export async function fetchOrderBook(
  client: Client,
  request: FetchOrderBookRequest,
): Promise<OrderBook> {
  const params = parseUserInput(request, FetchOrderBookRequestSchema);

  return unwrap(
    client.clob
      .get('book', {
        params: toSearchParams(params, snakeCase()),
      })
      .andThen(validateWith(FetchOrderBookResponseSchema)),
  );
}

const FetchSpreadRequestSchema = z.object({
  tokenId: z.string(),
});

export type FetchSpreadRequest = z.input<typeof FetchSpreadRequestSchema>;

export type FetchSpreadError =
  | RateLimitError
  | RequestRejectedError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;

/**
 * Fetches the spread for a token.
 *
 * @throws {@link FetchSpreadError}
 * Thrown when the request is invalid, rejected, rate limited, interrupted by transport issues, or returns an unexpected response.
 *
 * @example
 * ```ts
 * const spread = await fetchSpread(client, {
 *   tokenId:
 *     '8501497159083948713316135768103773293754490207922884688769443031624417212426',
 * });
 *
 * // spread === '0.02'
 * ```
 *
 */
export async function fetchSpread(
  client: Client,
  request: FetchSpreadRequest,
): Promise<string> {
  const params = parseUserInput(request, FetchSpreadRequestSchema);
  const response = await unwrap(
    client.clob
      .get('spread', {
        params: toSearchParams(params, snakeCase()),
      })
      .andThen(validateWith(SpreadSchema)),
  );

  return response.spread;
}

const FetchSpreadsRequestSchema = z
  .array(
    z.object({
      tokenId: z.string(),
    }),
  )
  .min(1);

export type FetchSpreadsRequest = z.input<typeof FetchSpreadsRequestSchema>;

export type FetchSpreadsError =
  | RateLimitError
  | RequestRejectedError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;

/**
 * Fetches spreads for multiple tokens.
 *
 * @throws {@link FetchSpreadsError}
 * Thrown when the request is invalid, rejected, rate limited, interrupted by transport issues, or returns an unexpected response.
 *
 * @example
 * ```ts
 * const spreads = await fetchSpreads(client, [
 *   {
 *     tokenId:
 *       '8501497159083948713316135768103773293754490207922884688769443031624417212426',
 *   },
 * ]);
 *
 * // spreads[tokenId] === '0.02'
 * ```
 *
 */
export async function fetchSpreads(
  client: Client,
  request: FetchSpreadsRequest,
): Promise<Record<string, string>> {
  const params = parseUserInput(request, FetchSpreadsRequestSchema);

  return unwrap(
    client.clob
      .post('spreads', {
        json: toTokenRequestPayload(params),
      })
      .andThen(validateWith(SpreadsSchema)),
  );
}

const FetchLastTradePriceRequestSchema = z.object({
  tokenId: z.string(),
});

export type FetchLastTradePriceRequest = z.input<
  typeof FetchLastTradePriceRequestSchema
>;

export type FetchLastTradePriceError =
  | RateLimitError
  | RequestRejectedError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;

/**
 * Fetches the last traded price for a token.
 *
 * @throws {@link FetchLastTradePriceError}
 * Thrown when the request is invalid, rejected, rate limited, interrupted by transport issues, or returns an unexpected response.
 *
 * @example
 * ```ts
 * const trade = await fetchLastTradePrice(client, {
 *   tokenId:
 *     '8501497159083948713316135768103773293754490207922884688769443031624417212426',
 * });
 *
 * // trade === { price: '0.53', side: OrderSide.BUY }
 * ```
 *
 */
export async function fetchLastTradePrice(
  client: Client,
  request: FetchLastTradePriceRequest,
): Promise<LastTradePrice> {
  const params = parseUserInput(request, FetchLastTradePriceRequestSchema);

  return unwrap(
    client.clob
      .get('last-trade-price', {
        params: toSearchParams(params, snakeCase()),
      })
      .andThen(validateWith(LastTradePriceSchema)),
  );
}

const FetchLastTradePricesRequestSchema = z
  .array(
    z.object({
      tokenId: z.string(),
    }),
  )
  .min(1);

export type FetchLastTradePricesRequest = z.input<
  typeof FetchLastTradePricesRequestSchema
>;

export type FetchLastTradePricesError =
  | RateLimitError
  | RequestRejectedError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;

/**
 * Fetches last traded prices for multiple tokens.
 *
 * @throws {@link FetchLastTradePricesError}
 * Thrown when the request is invalid, rejected, rate limited, interrupted by transport issues, or returns an unexpected response.
 *
 * @example
 * ```ts
 * const trades = await fetchLastTradePrices(client, [
 *   {
 *     tokenId:
 *       '8501497159083948713316135768103773293754490207922884688769443031624417212426',
 *   },
 * ]);
 *
 * // trades[0] === { tokenId, price: '0.53', side: OrderSide.BUY }
 * ```
 *
 */
export async function fetchLastTradePrices(
  client: Client,
  request: FetchLastTradePricesRequest,
): Promise<LastTradePriceForToken[]> {
  const params = parseUserInput(request, FetchLastTradePricesRequestSchema);

  return unwrap(
    client.clob
      .post('last-trades-prices', {
        json: toTokenRequestPayload(params),
      })
      .andThen(validateWith(LastTradePricesSchema)),
  );
}

const ListPriceHistoryRequestSchema = z.object({
  tokenId: z.string(),
  startTs: z.number().int().optional(),
  endTs: z.number().int().optional(),
  fidelity: z.number().int().positive().optional(),
  interval: PriceHistoryIntervalSchema.optional(),
});

export type ListPriceHistoryRequest = z.input<
  typeof ListPriceHistoryRequestSchema
>;

export type ListPriceHistoryError =
  | RateLimitError
  | RequestRejectedError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;

/**
 * Lists historical price points for a token.
 *
 * @throws {@link ListPriceHistoryError}
 * Thrown when the request is invalid, rejected, rate limited, interrupted by transport issues, or returns an unexpected response.
 *
 * @example
 * ```ts
 * const history = await listPriceHistory(client, {
 *   tokenId:
 *     '8501497159083948713316135768103773293754490207922884688769443031624417212426',
 *   interval: PriceHistoryInterval.ONE_DAY,
 *   fidelity: 60,
 * });
 *
 * // history[0] === { t: 1775653225, p: 0.535 }
 * ```
 *
 */
export async function listPriceHistory(
  client: Client,
  request: ListPriceHistoryRequest,
): Promise<PriceHistoryPoint[]> {
  const params = parseUserInput(request, ListPriceHistoryRequestSchema);
  const response = await unwrap(
    client.clob
      .get('prices-history', {
        params: toSearchParams(params, {
          tokenId: 'market',
          startTs: 'startTs',
          endTs: 'endTs',
          fidelity: 'fidelity',
          interval: 'interval',
        }),
      })
      .andThen(validateWith(PriceHistorySchema)),
  );

  return response.history;
}

function toTokenRequestPayload(
  params: Array<{
    tokenId: string;
  }>,
) {
  return params.map(({ tokenId }) => ({
    token_id: tokenId,
  }));
}

function toTokenWithSideRequestPayload(
  params: Array<{
    tokenId: string;
    side: z.infer<typeof OrderSideSchema>;
  }>,
) {
  return params.map(({ tokenId, side }) => ({
    token_id: tokenId,
    side,
  }));
}
