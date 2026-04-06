import {
  FetchFeeRateResponseSchema,
  FetchNegRiskResponseSchema,
  FetchTickSizeResponseSchema,
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

const ClobTokenRequestSchema = z.object({
  tokenId: z.string(),
});

export type FetchTickSizeRequest = z.input<typeof ClobTokenRequestSchema>;
export type FetchNegRiskRequest = z.input<typeof ClobTokenRequestSchema>;
export type FetchFeeRateRequest = z.input<typeof ClobTokenRequestSchema>;

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
): Promise<number> {
  const params = parseUserInput(request, ClobTokenRequestSchema);
  const response = await unwrap(
    client.clob
      .get('tick-size', {
        params: toSearchParams(params, snakeCase()),
      })
      .andThen(validateWith(FetchTickSizeResponseSchema)),
  );

  return response.minimum_tick_size;
}

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
  const params = parseUserInput(request, ClobTokenRequestSchema);
  const response = await unwrap(
    client.clob
      .get('neg-risk', {
        params: toSearchParams(params, snakeCase()),
      })
      .andThen(validateWith(FetchNegRiskResponseSchema)),
  );

  return response.neg_risk;
}

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
  const params = parseUserInput(request, ClobTokenRequestSchema);
  const response = await unwrap(
    client.clob
      .get('fee-rate', {
        params: toSearchParams(params, snakeCase()),
      })
      .andThen(validateWith(FetchFeeRateResponseSchema)),
  );

  return response.base_fee;
}
