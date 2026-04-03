import {
  type ClosedPosition,
  FetchPortfolioValueResponseSchema,
  ListClosedPositionsResponseSchema,
  ListPositionsResponseSchema,
  type Position,
  type Traded,
  TradedSchema,
  type Value,
} from '@polymarket/bindings/data';
import { unwrap } from '@polymarket/types';
import { z } from 'zod';
import { parseUserInput } from '../input';
import type { PolymarketClient } from '../PolymarketClient';
import { toDataSearchParams } from './dataParams';

const PositionSortBySchema = z.enum([
  'CURRENT',
  'INITIAL',
  'TOKENS',
  'CASHPNL',
  'PERCENTPNL',
  'TITLE',
  'RESOLVING',
  'PRICE',
  'AVGPRICE',
]);

const PositionSortDirectionSchema = z.enum(['ASC', 'DESC']);

const ClosedPositionSortBySchema = z.enum([
  'REALIZEDPNL',
  'TITLE',
  'PRICE',
  'AVGPRICE',
  'TIMESTAMP',
]);

const ListPositionsRequestSchema = z
  .object({
    user: z.string(),
    market: z.array(z.string()).optional(),
    eventId: z.array(z.number().int()).optional(),
    sizeThreshold: z.number().optional(),
    redeemable: z.boolean().optional(),
    mergeable: z.boolean().optional(),
    limit: z.number().int().optional(),
    offset: z.number().int().optional(),
    sortBy: PositionSortBySchema.optional(),
    sortDirection: PositionSortDirectionSchema.optional(),
    title: z.string().max(100).optional(),
  })
  .refine((value) => !(value.market && value.eventId), {
    message: 'Provide market or eventId, not both',
    path: ['eventId'],
  });

const ListClosedPositionsRequestSchema = z
  .object({
    user: z.string(),
    market: z.array(z.string()).optional(),
    title: z.string().max(100).optional(),
    eventId: z.array(z.number().int()).optional(),
    limit: z.number().int().optional(),
    offset: z.number().int().optional(),
    sortBy: ClosedPositionSortBySchema.optional(),
    sortDirection: PositionSortDirectionSchema.optional(),
  })
  .refine((value) => !(value.market && value.eventId), {
    message: 'Provide market or eventId, not both',
    path: ['eventId'],
  });

const FetchPortfolioValueRequestSchema = z.object({
  user: z.string(),
  market: z.array(z.string()).optional(),
});

const FetchTradedMarketCountRequestSchema = z.object({
  user: z.string(),
});

const DownloadAccountingSnapshotRequestSchema = z.object({
  user: z.string(),
});

export type ListPositionsRequest = z.input<typeof ListPositionsRequestSchema>;
export type ListClosedPositionsRequest = z.input<
  typeof ListClosedPositionsRequestSchema
>;
export type FetchPortfolioValueRequest = z.input<
  typeof FetchPortfolioValueRequestSchema
>;
export type FetchTradedMarketCountRequest = z.input<
  typeof FetchTradedMarketCountRequestSchema
>;
export type DownloadAccountingSnapshotRequest = z.input<
  typeof DownloadAccountingSnapshotRequestSchema
>;

/**
 * Lists current positions for a wallet.
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
 * const positions = await listPositions(client, {
 *   user: '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b',
 *   limit: 10,
 * });
 *
 * // positions === Position[]
 * ```
 */
export async function listPositions(
  client: PolymarketClient,
  request: ListPositionsRequest,
): Promise<Position[]> {
  const params = parseUserInput(request, ListPositionsRequestSchema);

  return unwrap(
    client.data.get('positions', {
      schema: ListPositionsResponseSchema,
      searchParams: toDataSearchParams(params),
    }),
  );
}

/**
 * Lists closed positions for a wallet.
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
 * const positions = await listClosedPositions(client, {
 *   user: '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b',
 *   limit: 10,
 * });
 *
 * // positions === ClosedPosition[]
 * ```
 */
export async function listClosedPositions(
  client: PolymarketClient,
  request: ListClosedPositionsRequest,
): Promise<ClosedPosition[]> {
  const params = parseUserInput(request, ListClosedPositionsRequestSchema);

  return unwrap(
    client.data.get('closed-positions', {
      schema: ListClosedPositionsResponseSchema,
      searchParams: toDataSearchParams(params),
    }),
  );
}

/**
 * Fetches the total value for a wallet's positions.
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
 * const value = await fetchPortfolioValue(client, {
 *   user: '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b',
 * });
 *
 * // value === Value[]
 * ```
 */
export async function fetchPortfolioValue(
  client: PolymarketClient,
  request: FetchPortfolioValueRequest,
): Promise<Value[]> {
  const params = parseUserInput(request, FetchPortfolioValueRequestSchema);

  return unwrap(
    client.data.get('value', {
      schema: FetchPortfolioValueResponseSchema,
      searchParams: toDataSearchParams(params),
    }),
  );
}

/**
 * Fetches the total number of markets a wallet has traded.
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
 * const traded = await fetchTradedMarketCount(client, {
 *   user: '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b',
 * });
 *
 * // traded === Traded
 * ```
 */
export async function fetchTradedMarketCount(
  client: PolymarketClient,
  request: FetchTradedMarketCountRequest,
): Promise<Traded> {
  const params = parseUserInput(request, FetchTradedMarketCountRequestSchema);

  return unwrap(
    client.data.get('traded', {
      schema: TradedSchema,
      searchParams: toDataSearchParams(params),
    }),
  );
}

/**
 * Downloads an accounting snapshot archive for a wallet.
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
 * const snapshot = await downloadAccountingSnapshot(client, {
 *   user: '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b',
 * });
 *
 * // snapshot === Blob
 * ```
 */
export async function downloadAccountingSnapshot(
  client: PolymarketClient,
  request: DownloadAccountingSnapshotRequest,
): Promise<Blob> {
  const params = parseUserInput(
    request,
    DownloadAccountingSnapshotRequestSchema,
  );

  return unwrap(
    client.data.getBlob('v1/accounting/snapshot', {
      searchParams: toDataSearchParams(params),
    }),
  );
}
