import {
  ListSportsMetadataResponseSchema,
  type SportsMarketTypesResponse,
  SportsMarketTypesResponseSchema,
  type SportsMetadata,
} from '@polymarket/bindings/gamma';
import { unwrap } from '@polymarket/types';
import type { Client } from '../clients';
import type {
  RateLimitError,
  RequestRejectedError,
  TransportError,
  UnexpectedResponseError,
} from '../errors';
import { validateWith } from '../response';

export type ListSportsError =
  | RateLimitError
  | RequestRejectedError
  | TransportError
  | UnexpectedResponseError;

/**
 * Lists available sports metadata.
 *
 * @throws {@link ListSportsError}
 * Thrown when the request is rejected, rate limited, interrupted by transport issues, or returns an unexpected response.
 *
 * @example
 * ```ts
 * const sports = await listSports(client);
 *
 * // sports === SportsMetadata[]
 * ```
 */
export async function listSports(client: Client): Promise<SportsMetadata[]> {
  return unwrap(
    client.gamma
      .get('/sports')
      .andThen(validateWith(ListSportsMetadataResponseSchema)),
  );
}

export type FetchSportsMarketTypesError =
  | RateLimitError
  | RequestRejectedError
  | TransportError
  | UnexpectedResponseError;

/**
 * Fetches the available market types grouped by sport.
 *
 * @throws {@link FetchSportsMarketTypesError}
 * Thrown when the request is rejected, rate limited, interrupted by transport issues, or returns an unexpected response.
 *
 * @example
 * ```ts
 * const marketTypes = await fetchSportsMarketTypes(client);
 *
 * // marketTypes === SportsMarketTypesResponse
 * ```
 */
export async function fetchSportsMarketTypes(
  client: Client,
): Promise<SportsMarketTypesResponse> {
  return unwrap(
    client.gamma
      .get('/sports/market-types')
      .andThen(validateWith(SportsMarketTypesResponseSchema)),
  );
}
