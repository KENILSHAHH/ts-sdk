import {
  ListSportsMetadataResponseSchema,
  type SportsMarketTypesResponse,
  SportsMarketTypesResponseSchema,
  type SportsMetadata,
} from '@polymarket/bindings';
import { unwrap } from '@polymarket/types';
import type { PolymarketClient } from '../PolymarketClient';

export async function listSports(
  client: PolymarketClient,
): Promise<SportsMetadata[]> {
  return unwrap(
    client.gamma.get('sports', {
      schema: ListSportsMetadataResponseSchema,
    }),
  );
}

export async function fetchSportsMarketTypes(
  client: PolymarketClient,
): Promise<SportsMarketTypesResponse> {
  return unwrap(
    client.gamma.get('sports/market-types', {
      schema: SportsMarketTypesResponseSchema,
    }),
  );
}
