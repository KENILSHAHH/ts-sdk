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
  ListMarketsKeysetResponseSchema,
  type Market,
  MarketSchema,
  type TagReference,
} from '@polymarket/bindings/gamma';
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
import {
  type Paginated,
  PaginatedRequestFields,
  paginate,
} from '../pagination';
import { validateWith } from '../response';
import { snakeCase, toDataSearchParams, toSearchParams } from './params';

// The public markets endpoint forces active=true and archived=false server-side.
const ListMarketsRequestSchema = z.object({
  ascending: z.boolean().optional(),
  closed: z.boolean().optional(),
  clobTokenIds: z.array(z.string()).optional(),
  ...PaginatedRequestFields,
  conditionIds: z.array(z.string()).optional(),
  cyom: z.boolean().optional(),
  decimalized: z.boolean().optional(),
  endDateMax: ISODateStringSchema.optional(),
  endDateMin: ISODateStringSchema.optional(),
  gameId: z.string().optional(),
  ids: z.array(z.number().int()).optional(),
  includeTag: z.boolean().optional(),
  liquidityNumMax: z.number().optional(),
  liquidityNumMin: z.number().optional(),
  locale: z.string().optional(),
  marketMakerAddresses: z.array(z.string()).optional(),
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

export type ListMarketsError =
  | RateLimitError
  | RequestRejectedError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;

/**
 * Lists markets.
 *
 * @throws {@link ListMarketsError}
 * Thrown on failure.
 *
 * @example
 * Fetch the first page of results:
 * ```ts
 * const result = listMarkets(client, {
 *   closed: false,
 *   pageSize: 10,
 * });
 *
 * const firstPage = await result.first();
 *
 * // Optionally, fetch additional pages:
 * for await (const page of result.from(firstPage.nextCursor)) {
 *   // page.items: Market[]
 * }
 * ```
 *
 * @example
 * Loop through all pages with `for await`:
 * ```ts
 * const result = listMarkets(client, {
 *   closed: false,
 *   pageSize: 10,
 * });
 *
 * for await (const page of result) {
 *   // page.items: Market[]
 * }
 * ```
 */
export function listMarkets(
  client: Client,
  request: ListMarketsRequest = {},
): Paginated<Market> {
  const params = parseUserInput(request, ListMarketsRequestSchema);

  return paginate(
    (cursor) =>
      client.gamma
        .get('/markets/keyset', {
          params: toMarketsSearchParams({
            ...params,
            cursor: cursor ?? params.cursor,
          }),
        })
        .andThen(validateWith(ListMarketsKeysetResponseSchema))
        .map((response) => ({
          items: response.items,
          hasMore: response.next_cursor !== undefined,
          nextCursor: response.next_cursor,
        })),
    params.cursor,
  );
}

export type FetchMarketError =
  | RateLimitError
  | RequestRejectedError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;

/**
 * Fetches a market.
 *
 * @throws {@link FetchMarketError}
 * Thrown on failure.
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

export type FetchMarketTagsError =
  | RateLimitError
  | RequestRejectedError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;

/**
 * Fetches a market's tags.
 *
 * @throws {@link FetchMarketTagsError}
 * Thrown on failure.
 *
 * @example
 * ```ts
 * const tags = await fetchMarketTags(client, {
 *   id: '12345',
 * });
 *
 * // tags: TagReference[]
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

export type ListMarketHoldersError =
  | RateLimitError
  | RequestRejectedError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;

/**
 * Lists the top holders for one or more markets.
 *
 * @throws {@link ListMarketHoldersError}
 * Thrown on failure.
 *
 * @example
 * ```ts
 * const holders = await listMarketHolders(client, {
 *   market: ['0xe546672750517f62c45a5a00067481981e62b9c20fa8220203232c9dc8fd2093'],
 *   limit: 5,
 * });
 *
 * // holders: MetaHolder[]
 * ```
 */
export async function listMarketHolders(
  client: Client,
  request: ListMarketHoldersRequest,
): Promise<MetaHolder[]> {
  const params = parseUserInput(request, ListMarketHoldersRequestSchema);

  return unwrap(
    client.data
      .get('/holders', {
        params: toDataSearchParams(params),
      })
      .andThen(validateWith(ListMarketHoldersResponseSchema)),
  );
}

export type ListOpenInterestError =
  | RateLimitError
  | RequestRejectedError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;

/**
 * Lists open interest for one or more markets.
 *
 * @throws {@link ListOpenInterestError}
 * Thrown on failure.
 *
 * @example
 * ```ts
 * const openInterest = await listOpenInterest(client, {
 *   market: ['0xe546672750517f62c45a5a00067481981e62b9c20fa8220203232c9dc8fd2093'],
 * });
 *
 * // openInterest: OpenInterest[]
 * ```
 */
export async function listOpenInterest(
  client: Client,
  request: ListOpenInterestRequest = {},
): Promise<OpenInterest[]> {
  const params = parseUserInput(request, ListOpenInterestRequestSchema);

  return unwrap(
    client.data
      .get('/oi', {
        params: toDataSearchParams(params),
      })
      .andThen(validateWith(ListOpenInterestResponseSchema)),
  );
}

export type ListMarketPositionsError =
  | RateLimitError
  | RequestRejectedError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;

/**
 * Lists positions for a market.
 *
 * @throws {@link ListMarketPositionsError}
 * Thrown on failure.
 *
 * @example
 * ```ts
 * const positions = await listMarketPositions(client, {
 *   market: '0xe546672750517f62c45a5a00067481981e62b9c20fa8220203232c9dc8fd2093',
 *   limit: 10,
 * });
 *
 * // positions: MetaMarketPositionV1[]
 * ```
 */
export async function listMarketPositions(
  client: Client,
  request: ListMarketPositionsRequest,
): Promise<MetaMarketPositionV1[]> {
  const params = parseUserInput(request, ListMarketPositionsRequestSchema);

  return unwrap(
    client.data
      .get('/v1/market-positions', {
        params: toDataSearchParams(params),
      })
      .andThen(validateWith(ListMarketPositionsResponseSchema)),
  );
}

function toMarketsSearchParams(params: ListMarketsParams): URLSearchParams {
  return toSearchParams(
    params,
    snakeCase<ListMarketsParams>({
      cursor: 'after_cursor',
      ids: 'id',
      marketMakerAddresses: 'market_maker_address',
      pageSize: 'limit',
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
