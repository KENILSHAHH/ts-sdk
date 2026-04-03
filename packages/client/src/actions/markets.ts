import {
  ISODateStringSchema,
  ListMarketsResponseSchema,
  type Market,
  MarketSchema,
} from '@polymarket/bindings';
import { unwrap } from '@polymarket/types';
import { z } from 'zod';
import { parseUserInput } from '../input';
import type { PolymarketClient } from '../PolymarketClient';
import { snakeCase, toSearchParams } from './params';

const MarketsRequestSchema = z.object({
  active: z.boolean().optional(),
  ascending: z.boolean().optional(),
  closed: z.boolean().optional(),
  clobTokenIds: z.array(z.string()).optional(),
  conditionIds: z.array(z.string()).optional(),
  cyom: z.boolean().optional(),
  endDateMax: ISODateStringSchema.optional(),
  endDateMin: ISODateStringSchema.optional(),
  gameId: z.string().optional(),
  ids: z.array(z.number()).optional(),
  includeTag: z.boolean().optional(),
  limit: z.number().optional(),
  liquidityNumMax: z.number().optional(),
  liquidityNumMin: z.number().optional(),
  marketMakerAddresses: z.array(z.string()).optional(),
  offset: z.number().optional(),
  order: z.string().optional(),
  questionIds: z.array(z.string()).optional(),
  relatedTags: z.boolean().optional(),
  rewardsMinSize: z.number().optional(),
  slug: z.array(z.string()).optional(),
  sportsMarketTypes: z.array(z.string()).optional(),
  startDateMax: ISODateStringSchema.optional(),
  startDateMin: ISODateStringSchema.optional(),
  tagId: z.number().optional(),
  umaResolutionStatus: z.string().optional(),
  volumeNumMax: z.number().optional(),
  volumeNumMin: z.number().optional(),
});

export type MarketsRequest = z.input<typeof MarketsRequestSchema>;

const FetchMarketRequestSchema = z.union([
  z.object({ id: z.string() }),
  z.object({ slug: z.string() }),
]);

export type FetchMarketRequest = z.input<typeof FetchMarketRequestSchema>;

type MarketsParams = z.output<typeof MarketsRequestSchema>;

/**
 * Lists markets.
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
 * const result = await listMarkets(client, {
 *   limit: 10,
 *   closed: false,
 * });
 *
 * // result === Market[]
 * ```
 */
export async function listMarkets(
  client: PolymarketClient,
  request: MarketsRequest = {},
): Promise<Market[]> {
  const params = parseUserInput(request, MarketsRequestSchema);

  return unwrap(
    client.gamma.get('markets', {
      schema: ListMarketsResponseSchema,
      searchParams: toMarketsSearchParams(params),
    }),
  );
}

/**
 * Fetches a market.
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
 * const market = await fetchMarket(client, {
 *   id: '12345',
 * });
 *
 * // market === Market
 * ```
 */
export async function fetchMarket(
  client: PolymarketClient,
  request: FetchMarketRequest,
): Promise<Market> {
  const params = parseUserInput(request, FetchMarketRequestSchema);

  if ('id' in params) {
    return fetchMarketById(client, params.id);
  }

  return fetchMarketBySlug(client, params.slug);
}

function toMarketsSearchParams(params: MarketsParams): URLSearchParams {
  return toSearchParams(
    params,
    snakeCase<MarketsParams>({
      ids: 'id',
      marketMakerAddresses: 'market_maker_address',
    }),
  );
}

async function fetchMarketBySlug(
  client: PolymarketClient,
  slug: string,
): Promise<Market> {
  return unwrap(
    client.gamma.get(`markets/slug/${slug}`, {
      schema: MarketSchema,
    }),
  );
}

async function fetchMarketById(
  client: PolymarketClient,
  id: string,
): Promise<Market> {
  return unwrap(
    client.gamma.get(`markets/${id}`, {
      schema: MarketSchema,
    }),
  );
}
