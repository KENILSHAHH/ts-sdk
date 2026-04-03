import {
  FetchMarketTagsResponseSchema,
  ISODateStringSchema,
  ListMarketsResponseSchema,
  type Market,
  MarketSchema,
  type TagReference,
} from '@polymarket/bindings';
import { unwrap } from '@polymarket/types';
import { z } from 'zod';
import { parseUserInput } from '../input';
import type { PolymarketClient } from '../PolymarketClient';
import { snakeCase, toSearchParams } from './params';

// The public markets endpoint forces active=true and archived=false server-side.
const ListMarketsRequestSchema = z.object({
  ascending: z.boolean().optional(),
  closed: z.boolean().optional(),
  clobTokenIds: z.array(z.string()).optional(),
  conditionIds: z.array(z.string()).optional(),
  cyom: z.boolean().optional(),
  decimalized: z.boolean().optional(),
  endDateMax: ISODateStringSchema.optional(),
  endDateMin: ISODateStringSchema.optional(),
  gameId: z.string().optional(),
  ids: z.array(z.number().int()).optional(),
  includeTag: z.boolean().optional(),
  limit: z.number().int().optional(),
  liquidityNumMax: z.number().optional(),
  liquidityNumMin: z.number().optional(),
  locale: z.string().optional(),
  marketMakerAddresses: z.array(z.string()).optional(),
  offset: z.number().int().optional(),
  order: z.string().optional(),
  questionIds: z.array(z.string()).optional(),
  relatedTags: z.boolean().optional(),
  rfqEnabled: z.boolean().optional(),
  rewardsMinSize: z.number().optional(),
  slug: z.array(z.string()).optional(),
  sportsMarketTypes: z.array(z.string()).optional(),
  startDateMax: ISODateStringSchema.optional(),
  startDateMin: ISODateStringSchema.optional(),
  tagId: z.number().int().optional(),
  tagMatch: z.enum(['any', 'all']).optional(),
  umaResolutionStatus: z.string().optional(),
  volumeNumMax: z.number().optional(),
  volumeNumMin: z.number().optional(),
});

export type ListMarketsRequest = z.input<typeof ListMarketsRequestSchema>;

const FetchMarketByIdRequestSchema = z.object({
  id: z.string(),
  includeTag: z.boolean().optional(),
  locale: z.string().optional(),
});

const FetchMarketBySlugRequestSchema = z.object({
  slug: z.string(),
  includeTag: z.boolean().optional(),
  locale: z.string().optional(),
});

const FetchMarketRequestSchema = z.union([
  FetchMarketByIdRequestSchema,
  FetchMarketBySlugRequestSchema,
]);

export type FetchMarketRequest = z.input<typeof FetchMarketRequestSchema>;

const FetchMarketTagsRequestSchema = z.object({
  id: z.string(),
});

export type FetchMarketTagsRequest = z.input<
  typeof FetchMarketTagsRequestSchema
>;

type ListMarketsParams = z.output<typeof ListMarketsRequestSchema>;

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
  request: ListMarketsRequest = {},
): Promise<Market[]> {
  const params = parseUserInput(request, ListMarketsRequestSchema);

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
    return fetchMarketById(client, params);
  }

  return fetchMarketBySlug(client, params);
}

/**
 * Fetches a market's tags.
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
 * const tags = await fetchMarketTags(client, {
 *   id: '12345',
 * });
 *
 * // tags === TagReference[]
 * ```
 */
export async function fetchMarketTags(
  client: PolymarketClient,
  request: FetchMarketTagsRequest,
): Promise<TagReference[]> {
  const params = parseUserInput(request, FetchMarketTagsRequestSchema);

  return unwrap(
    client.gamma.get(`markets/${params.id}/tags`, {
      schema: FetchMarketTagsResponseSchema,
    }),
  );
}

function toMarketsSearchParams(params: ListMarketsParams): URLSearchParams {
  return toSearchParams(
    params,
    snakeCase<ListMarketsParams>({
      ids: 'id',
      marketMakerAddresses: 'market_maker_address',
    }),
  );
}

async function fetchMarketBySlug(
  client: PolymarketClient,
  params: z.output<typeof FetchMarketBySlugRequestSchema>,
): Promise<Market> {
  return unwrap(
    client.gamma.get(`markets/slug/${params.slug}`, {
      schema: MarketSchema,
      searchParams: toSearchParams(
        {
          includeTag: params.includeTag,
          locale: params.locale,
        },
        snakeCase(),
      ),
    }),
  );
}

async function fetchMarketById(
  client: PolymarketClient,
  params: z.output<typeof FetchMarketByIdRequestSchema>,
): Promise<Market> {
  return unwrap(
    client.gamma.get(`markets/${params.id}`, {
      schema: MarketSchema,
      searchParams: toSearchParams(
        {
          includeTag: params.includeTag,
          locale: params.locale,
        },
        snakeCase(),
      ),
    }),
  );
}
