import {
  ListSportsMetadataResponseSchema,
  type SportsMarketTypesResponse,
  SportsMarketTypesResponseSchema,
  type SportsMetadata,
} from '@polymarket/bindings/gamma';
import { unwrap } from '@polymarket/types';
import type { Client } from '../clients';

/**
 * Lists available sports metadata.
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
 * const sports = await listSports(client);
 *
 * // sports === SportsMetadata[]
 * ```
 */
export async function listSports(client: Client): Promise<SportsMetadata[]> {
  return unwrap(
    client.gamma.get('sports', {
      schema: ListSportsMetadataResponseSchema,
    }),
  );
}

/**
 * Fetches the available market types grouped by sport.
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
 * const marketTypes = await fetchSportsMarketTypes(client);
 *
 * // marketTypes === SportsMarketTypesResponse
 * ```
 */
export async function fetchSportsMarketTypes(
  client: Client,
): Promise<SportsMarketTypesResponse> {
  return unwrap(
    client.gamma.get('sports/market-types', {
      schema: SportsMarketTypesResponseSchema,
    }),
  );
}
