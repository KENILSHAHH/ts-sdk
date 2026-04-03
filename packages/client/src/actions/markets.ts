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
import { type SearchParamMappings, toSearchParams } from './params';

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

const MARKETS_SEARCH_PARAM_MAPPINGS = {
  active: 'active',
  ascending: 'ascending',
  closed: 'closed',
  clobTokenIds: 'clob_token_ids',
  conditionIds: 'condition_ids',
  cyom: 'cyom',
  endDateMax: 'end_date_max',
  endDateMin: 'end_date_min',
  gameId: 'game_id',
  ids: 'id',
  includeTag: 'include_tag',
  limit: 'limit',
  liquidityNumMax: 'liquidity_num_max',
  liquidityNumMin: 'liquidity_num_min',
  marketMakerAddresses: 'market_maker_address',
  offset: 'offset',
  order: 'order',
  questionIds: 'question_ids',
  relatedTags: 'related_tags',
  rewardsMinSize: 'rewards_min_size',
  slug: 'slug',
  sportsMarketTypes: 'sports_market_types',
  startDateMax: 'start_date_max',
  startDateMin: 'start_date_min',
  tagId: 'tag_id',
  umaResolutionStatus: 'uma_resolution_status',
  volumeNumMax: 'volume_num_max',
  volumeNumMin: 'volume_num_min',
} satisfies SearchParamMappings<MarketsParams>;

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
    return getMarketById(client, params.id);
  }

  return unwrap(
    client.gamma.get(`markets/slug/${params.slug}`, {
      schema: MarketSchema,
    }),
  );
}

function toMarketsSearchParams(params: MarketsParams): URLSearchParams {
  return toSearchParams(params, MARKETS_SEARCH_PARAM_MAPPINGS);
}

async function getMarketById(
  client: PolymarketClient,
  id: string,
): Promise<Market> {
  return unwrap(
    client.gamma.get(`markets/${id}`, {
      schema: MarketSchema,
    }),
  );
}
