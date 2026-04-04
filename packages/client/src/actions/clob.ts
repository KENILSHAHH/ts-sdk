import {
  FetchFeeRateResponseSchema,
  FetchNegRiskResponseSchema,
  FetchTickSizeResponseSchema,
} from '@polymarket/bindings/clob';
import { unwrap } from '@polymarket/types';
import { z } from 'zod';
import { parseUserInput } from '../input';
import type { PolymarketClient } from '../PolymarketClient';
import { toSearchParams } from './params';

const ClobTokenRequestSchema = z.object({
  tokenId: z.string(),
});

export type FetchTickSizeRequest = z.input<typeof ClobTokenRequestSchema>;
export type FetchNegRiskRequest = z.input<typeof ClobTokenRequestSchema>;
export type FetchFeeRateRequest = z.input<typeof ClobTokenRequestSchema>;

/**
 * Fetches the minimum price tick size for a token's order book.
 *
 * @throws {@link UserInputError}
 * Thrown if the request is not correct for this action.
 *
 * @throws {@link RateLimitError}
 * Thrown if the request is rejected because the API rate limit has been exceeded.
 *
 * @throws {@link ServerError}
 * Thrown if the request cannot be completed because of a network or server failure.
 *
 * @throws {@link InvalidResponseError}
 * Thrown if the server returns an unexpected response.
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
  client: PolymarketClient,
  request: FetchTickSizeRequest,
): Promise<number> {
  const params = parseUserInput(request, ClobTokenRequestSchema);
  const response = await unwrap(
    client.clob.get('tick-size', {
      schema: FetchTickSizeResponseSchema,
      searchParams: toSearchParams(params, {
        tokenId: 'token_id',
      }),
    }),
  );

  return response.minimum_tick_size;
}

/**
 * Fetches whether a token is in a negative-risk market.
 *
 * @throws {@link UserInputError}
 * Thrown if the request is not correct for this action.
 *
 * @throws {@link RateLimitError}
 * Thrown if the request is rejected because the API rate limit has been exceeded.
 *
 * @throws {@link ServerError}
 * Thrown if the request cannot be completed because of a network or server failure.
 *
 * @throws {@link InvalidResponseError}
 * Thrown if the server returns an unexpected response.
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
  client: PolymarketClient,
  request: FetchNegRiskRequest,
): Promise<boolean> {
  const params = parseUserInput(request, ClobTokenRequestSchema);
  const response = await unwrap(
    client.clob.get('neg-risk', {
      schema: FetchNegRiskResponseSchema,
      searchParams: toSearchParams(params, {
        tokenId: 'token_id',
      }),
    }),
  );

  return response.neg_risk;
}

/**
 * Fetches the base fee rate, in basis points, for a token's order book.
 *
 * @throws {@link UserInputError}
 * Thrown if the request is not correct for this action.
 *
 * @throws {@link RateLimitError}
 * Thrown if the request is rejected because the API rate limit has been exceeded.
 *
 * @throws {@link ServerError}
 * Thrown if the request cannot be completed because of a network or server failure.
 *
 * @throws {@link InvalidResponseError}
 * Thrown if the server returns an unexpected response.
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
  client: PolymarketClient,
  request: FetchFeeRateRequest,
): Promise<number> {
  const params = parseUserInput(request, ClobTokenRequestSchema);
  const response = await unwrap(
    client.clob.get('fee-rate', {
      schema: FetchFeeRateResponseSchema,
      searchParams: toSearchParams(params, {
        tokenId: 'token_id',
      }),
    }),
  );

  return response.base_fee;
}
