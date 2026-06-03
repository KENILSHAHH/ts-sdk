import { PaginationCursorSchema } from '@polymarket/bindings';
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
import type { BaseClient } from '../clients';
import {
  makeErrorGuard,
  RateLimitError,
  RequestRejectedError,
  TransportError,
  UnexpectedResponseError,
  UserInputError,
} from '../errors';
import { parseUserInput } from '../input';
import {
  decodeOffsetCursor,
  encodeOffsetCursor,
  PageSizeSchema,
  type Paginated,
  paginate,
} from '../pagination';
import { readBlob, validateWith } from '../response';
import { toDataSearchParams } from './params';

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
    cursor: PaginationCursorSchema.optional(),
    user: z.string(),
    market: z.array(z.string()).optional(),
    eventId: z.array(z.number().int()).optional(),
    sizeThreshold: z.number().optional(),
    redeemable: z.boolean().optional(),
    mergeable: z.boolean().optional(),
    pageSize: PageSizeSchema.default(20),
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
    cursor: PaginationCursorSchema.optional(),
    user: z.string(),
    market: z.array(z.string()).optional(),
    title: z.string().max(100).optional(),
    eventId: z.array(z.number().int()).optional(),
    pageSize: PageSizeSchema.default(20),
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

export type ListPositionsError =
  | RateLimitError
  | RequestRejectedError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;
export const ListPositionsError = makeErrorGuard(
  RateLimitError,
  RequestRejectedError,
  TransportError,
  UnexpectedResponseError,
  UserInputError,
);

/**
 * Lists current positions for a wallet.
 *
 * @remarks
 * This is a low-level function. Most SDK consumers should prefer the client instance API.
 *
 * @throws {@link ListPositionsError}
 * Thrown on failure.
 *
 * @example
 * Fetch the first page of results:
 * ```ts
 * const result = listPositions(client, {
 *   user: '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b',
 *   pageSize: 10,
 * });
 *
 * const firstPage = await result.firstPage();
 *
 * // Optionally, fetch additional pages:
 * for await (const page of result.from(firstPage.nextCursor)) {
 *   // page.items: Position[]
 * }
 * ```
 *
 * @example
 * Loop through all pages with `for await`:
 * ```ts
 * const result = listPositions(client, {
 *   user: '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b',
 *   pageSize: 10,
 * });
 *
 * for await (const page of result) {
 *   // page.items: Position[]
 * }
 * ```
 */
export function listPositions(
  client: BaseClient,
  request: ListPositionsRequest,
): Paginated<Position[]> {
  const { cursor, pageSize, ...params } = parseUserInput(
    request,
    ListPositionsRequestSchema,
  );

  return paginate((cursor) => {
    const decoded = decodeOffsetCursor(cursor, pageSize);

    return client.data
      .get('/positions', {
        params: toDataSearchParams({
          ...params,
          limit: decoded.pageSize + 1,
          offset: decoded.offset,
        }),
      })
      .andThen(validateWith(ListPositionsResponseSchema))
      .map((positions) => {
        const hasMore = positions.length > decoded.pageSize;

        return {
          items: positions.slice(0, decoded.pageSize),
          hasMore,
          nextCursor: hasMore
            ? encodeOffsetCursor({
                offset: decoded.offset + decoded.pageSize,
                pageSize: decoded.pageSize,
              })
            : undefined,
        };
      });
  }, cursor);
}

export type ListClosedPositionsError =
  | RateLimitError
  | RequestRejectedError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;
export const ListClosedPositionsError = makeErrorGuard(
  RateLimitError,
  RequestRejectedError,
  TransportError,
  UnexpectedResponseError,
  UserInputError,
);

/**
 * Lists closed positions for a wallet.
 *
 * @remarks
 * This is a low-level function. Most SDK consumers should prefer the client instance API.
 *
 * @throws {@link ListClosedPositionsError}
 * Thrown on failure.
 *
 * @example
 * Fetch the first page of results:
 * ```ts
 * const result = listClosedPositions(client, {
 *   user: '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b',
 *   pageSize: 10,
 * });
 *
 * const firstPage = await result.firstPage();
 *
 * // Optionally, fetch additional pages:
 * for await (const page of result.from(firstPage.nextCursor)) {
 *   // page.items: ClosedPosition[]
 * }
 * ```
 *
 * @example
 * Loop through all pages with `for await`:
 * ```ts
 * const result = listClosedPositions(client, {
 *   user: '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b',
 *   pageSize: 10,
 * });
 *
 * for await (const page of result) {
 *   // page.items: ClosedPosition[]
 * }
 * ```
 */
export function listClosedPositions(
  client: BaseClient,
  request: ListClosedPositionsRequest,
): Paginated<ClosedPosition[]> {
  const { cursor, pageSize, ...params } = parseUserInput(
    request,
    ListClosedPositionsRequestSchema,
  );

  return paginate((cursor) => {
    const decoded = decodeOffsetCursor(cursor, pageSize);

    return client.data
      .get('/closed-positions', {
        params: toDataSearchParams({
          ...params,
          limit: decoded.pageSize + 1,
          offset: decoded.offset,
        }),
      })
      .andThen(validateWith(ListClosedPositionsResponseSchema))
      .map((positions) => {
        const hasMore = positions.length > decoded.pageSize;

        return {
          items: positions.slice(0, decoded.pageSize),
          hasMore,
          nextCursor: hasMore
            ? encodeOffsetCursor({
                offset: decoded.offset + decoded.pageSize,
                pageSize: decoded.pageSize,
              })
            : undefined,
        };
      });
  }, cursor);
}

export type FetchPortfolioValueError =
  | RateLimitError
  | RequestRejectedError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;
export const FetchPortfolioValueError = makeErrorGuard(
  RateLimitError,
  RequestRejectedError,
  TransportError,
  UnexpectedResponseError,
  UserInputError,
);

/**
 * Fetches the total value for a wallet's positions.
 *
 * @remarks
 * This is a low-level function. Most SDK consumers should prefer the client instance API.
 *
 * @throws {@link FetchPortfolioValueError}
 * Thrown on failure.
 *
 * @example
 * ```ts
 * const value = await fetchPortfolioValue(client, {
 *   user: '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b',
 * });
 *
 * // value: Value[]
 * ```
 */
export async function fetchPortfolioValue(
  client: BaseClient,
  request: FetchPortfolioValueRequest,
): Promise<Value[]> {
  const params = parseUserInput(request, FetchPortfolioValueRequestSchema);

  return unwrap(
    client.data
      .get('/value', {
        params: toDataSearchParams(params),
      })
      .andThen(validateWith(FetchPortfolioValueResponseSchema)),
  );
}

export type FetchTradedMarketCountError =
  | RateLimitError
  | RequestRejectedError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;
export const FetchTradedMarketCountError = makeErrorGuard(
  RateLimitError,
  RequestRejectedError,
  TransportError,
  UnexpectedResponseError,
  UserInputError,
);

/**
 * Fetches the total number of markets a wallet has traded.
 *
 * @remarks
 * This is a low-level function. Most SDK consumers should prefer the client instance API.
 *
 * @throws {@link FetchTradedMarketCountError}
 * Thrown on failure.
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
  client: BaseClient,
  request: FetchTradedMarketCountRequest,
): Promise<Traded> {
  const params = parseUserInput(request, FetchTradedMarketCountRequestSchema);

  return unwrap(
    client.data
      .get('/traded', {
        params: toDataSearchParams(params),
      })
      .andThen(validateWith(TradedSchema)),
  );
}

export type DownloadAccountingSnapshotError =
  | RateLimitError
  | RequestRejectedError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;
export const DownloadAccountingSnapshotError = makeErrorGuard(
  RateLimitError,
  RequestRejectedError,
  TransportError,
  UnexpectedResponseError,
  UserInputError,
);

/**
 * Downloads an accounting snapshot archive for a wallet.
 *
 * @remarks
 * This is a low-level function. Most SDK consumers should prefer the client instance API.
 *
 * @throws {@link DownloadAccountingSnapshotError}
 * Thrown on failure.
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
  client: BaseClient,
  request: DownloadAccountingSnapshotRequest,
): Promise<Blob> {
  const params = parseUserInput(
    request,
    DownloadAccountingSnapshotRequestSchema,
  );

  return unwrap(
    client.data
      .get('/v1/accounting/snapshot', {
        params: toDataSearchParams(params),
      })
      .andThen(readBlob),
  );
}
