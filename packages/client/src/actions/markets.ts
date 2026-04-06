import { ISODateStringSchema } from '@polymarket/bindings';
import {
  ListMarketHoldersResponseSchema,
  ListMarketPositionsResponseSchema,
  ListOpenInterestResponseSchema,
  type MetaHolder,
  type MetaMarketPositionV1,
  type OpenInterest,
} from '@polymarket/bindings/data';
import {
  FetchMarketTagsResponseSchema,
  ListMarketsResponseSchema,
  type Market,
  MarketSchema,
  type TagReference,
} from '@polymarket/bindings/gamma';
import { unwrap } from '@polymarket/types';
import { z } from 'zod';
import type { Client } from '../clients';
import { parseUserInput } from '../input';
import { validateWith } from '../response';
import { snakeCase, toDataSearchParams, toSearchParams } from './params';

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

const ListMarketHoldersRequestSchema = z.object({
  limit: z.number().int().optional(),
  market: z.array(z.string()),
  minBalance: z.number().int().optional(),
});

const ListOpenInterestRequestSchema = z.object({
  market: z.array(z.string()).optional(),
});

const MarketPositionStatusSchema = z.enum(['OPEN', 'CLOSED', 'ALL']);
const MarketPositionSortBySchema = z.enum([
  'TOKENS',
  'CASH_PNL',
  'REALIZED_PNL',
  'TOTAL_PNL',
]);
const MarketPositionSortDirectionSchema = z.enum(['ASC', 'DESC']);

const ListMarketPositionsRequestSchema = z.object({
  market: z.string(),
  user: z.string().optional(),
  status: MarketPositionStatusSchema.optional(),
  sortBy: MarketPositionSortBySchema.optional(),
  sortDirection: MarketPositionSortDirectionSchema.optional(),
  limit: z.number().int().optional(),
  offset: z.number().int().optional(),
});

export type ListMarketHoldersRequest = z.input<
  typeof ListMarketHoldersRequestSchema
>;
export type ListOpenInterestRequest = z.input<
  typeof ListOpenInterestRequestSchema
>;
export type ListMarketPositionsRequest = z.input<
  typeof ListMarketPositionsRequestSchema
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
 * @throws {@link RequestRejectedError}
 * Thrown if the service rejects the request with a non-success status other than rate limiting.
 *
 * @throws {@link TransportError}
 * Thrown if the SDK cannot complete the request because of a transport failure.
 *
 * @throws {@link UnexpectedResponseError}
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
  client: Client,
  request: ListMarketsRequest = {},
): Promise<Market[]> {
  const params = parseUserInput(request, ListMarketsRequestSchema);

  return unwrap(
    client.gamma
      .get('markets', {
        params: toMarketsSearchParams(params),
      })
      .andThen(validateWith(ListMarketsResponseSchema)),
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
 * @throws {@link RequestRejectedError}
 * Thrown if the service rejects the request with a non-success status other than rate limiting.
 *
 * @throws {@link TransportError}
 * Thrown if the SDK cannot complete the request because of a transport failure.
 *
 * @throws {@link UnexpectedResponseError}
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
  client: Client,
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
 * @throws {@link RequestRejectedError}
 * Thrown if the service rejects the request with a non-success status other than rate limiting.
 *
 * @throws {@link TransportError}
 * Thrown if the SDK cannot complete the request because of a transport failure.
 *
 * @throws {@link UnexpectedResponseError}
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
  client: Client,
  request: FetchMarketTagsRequest,
): Promise<TagReference[]> {
  const params = parseUserInput(request, FetchMarketTagsRequestSchema);

  return unwrap(
    client.gamma
      .get(`markets/${params.id}/tags`)
      .andThen(validateWith(FetchMarketTagsResponseSchema)),
  );
}

/**
 * Lists the top holders for one or more markets.
 *
 * @throws {@link UserInputError}
 * Thrown if the request is not correct for this action.
 *
 * @throws {@link RateLimitError}
 * Thrown if the request is rejected because the API rate limit has been exceeded.
 *
 * @throws {@link RequestRejectedError}
 * Thrown if the service rejects the request with a non-success status other than rate limiting.
 *
 * @throws {@link TransportError}
 * Thrown if the SDK cannot complete the request because of a transport failure.
 *
 * @throws {@link UnexpectedResponseError}
 * Thrown if the server returns an unexpected response.
 *
 * @example
 * ```ts
 * const holders = await listMarketHolders(client, {
 *   market: ['0xe546672750517f62c45a5a00067481981e62b9c20fa8220203232c9dc8fd2093'],
 *   limit: 5,
 * });
 *
 * // holders === MetaHolder[]
 * ```
 */
export async function listMarketHolders(
  client: Client,
  request: ListMarketHoldersRequest,
): Promise<MetaHolder[]> {
  const params = parseUserInput(request, ListMarketHoldersRequestSchema);

  return unwrap(
    client.data
      .get('holders', {
        params: toDataSearchParams(params),
      })
      .andThen(validateWith(ListMarketHoldersResponseSchema)),
  );
}

/**
 * Lists open interest for one or more markets.
 *
 * @throws {@link UserInputError}
 * Thrown if the request is not correct for this action.
 *
 * @throws {@link RateLimitError}
 * Thrown if the request is rejected because the API rate limit has been exceeded.
 *
 * @throws {@link RequestRejectedError}
 * Thrown if the service rejects the request with a non-success status other than rate limiting.
 *
 * @throws {@link TransportError}
 * Thrown if the SDK cannot complete the request because of a transport failure.
 *
 * @throws {@link UnexpectedResponseError}
 * Thrown if the server returns an unexpected response.
 *
 * @example
 * ```ts
 * const openInterest = await listOpenInterest(client, {
 *   market: ['0xe546672750517f62c45a5a00067481981e62b9c20fa8220203232c9dc8fd2093'],
 * });
 *
 * // openInterest === OpenInterest[]
 * ```
 */
export async function listOpenInterest(
  client: Client,
  request: ListOpenInterestRequest = {},
): Promise<OpenInterest[]> {
  const params = parseUserInput(request, ListOpenInterestRequestSchema);

  return unwrap(
    client.data
      .get('oi', {
        params: toDataSearchParams(params),
      })
      .andThen(validateWith(ListOpenInterestResponseSchema)),
  );
}

/**
 * Lists positions for a market.
 *
 * @throws {@link UserInputError}
 * Thrown if the request is not correct for this action.
 *
 * @throws {@link RateLimitError}
 * Thrown if the request is rejected because the API rate limit has been exceeded.
 *
 * @throws {@link RequestRejectedError}
 * Thrown if the service rejects the request with a non-success status other than rate limiting.
 *
 * @throws {@link TransportError}
 * Thrown if the SDK cannot complete the request because of a transport failure.
 *
 * @throws {@link UnexpectedResponseError}
 * Thrown if the server returns an unexpected response.
 *
 * @example
 * ```ts
 * const positions = await listMarketPositions(client, {
 *   market: '0xe546672750517f62c45a5a00067481981e62b9c20fa8220203232c9dc8fd2093',
 *   limit: 10,
 * });
 *
 * // positions === MetaMarketPositionV1[]
 * ```
 */
export async function listMarketPositions(
  client: Client,
  request: ListMarketPositionsRequest,
): Promise<MetaMarketPositionV1[]> {
  const params = parseUserInput(request, ListMarketPositionsRequestSchema);

  return unwrap(
    client.data
      .get('v1/market-positions', {
        params: toDataSearchParams(params),
      })
      .andThen(validateWith(ListMarketPositionsResponseSchema)),
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
  client: Client,
  params: z.output<typeof FetchMarketBySlugRequestSchema>,
): Promise<Market> {
  return unwrap(
    client.gamma
      .get(`markets/slug/${params.slug}`, {
        params: toSearchParams(
          {
            includeTag: params.includeTag,
            locale: params.locale,
          },
          snakeCase(),
        ),
      })
      .andThen(validateWith(MarketSchema)),
  );
}

async function fetchMarketById(
  client: Client,
  params: z.output<typeof FetchMarketByIdRequestSchema>,
): Promise<Market> {
  return unwrap(
    client.gamma
      .get(`markets/${params.id}`, {
        params: toSearchParams(
          {
            includeTag: params.includeTag,
            locale: params.locale,
          },
          snakeCase(),
        ),
      })
      .andThen(validateWith(MarketSchema)),
  );
}
