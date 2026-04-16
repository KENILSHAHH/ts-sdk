import { PaginationCursorSchema } from '@polymarket/bindings';
import {
  type Activity,
  ActivityTypeSchema,
  ListActivityResponseSchema,
  ListTradesResponseSchema,
  SideSchema,
  type Trade,
} from '@polymarket/bindings/data';
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
  decodeOffsetCursor,
  encodeOffsetCursor,
  PageSizeSchema,
  type Paginated,
  paginate,
} from '../pagination';
import { validateWith } from '../response';
import { toDataSearchParams } from './params';

const ActivitySortBySchema = z.enum(['TIMESTAMP', 'TOKENS', 'CASH']);
const SortDirectionSchema = z.enum(['ASC', 'DESC']);
const TradeFilterTypeSchema = z.enum(['CASH', 'TOKENS']);

const ListTradesRequestSchema = z
  .object({
    cursor: PaginationCursorSchema.optional(),
    pageSize: PageSizeSchema.default(20),
    takerOnly: z.boolean().optional(),
    filterType: TradeFilterTypeSchema.optional(),
    filterAmount: z.number().optional(),
    market: z.array(z.string()).optional(),
    eventId: z.array(z.number().int()).optional(),
    user: z.string().optional(),
    side: SideSchema.optional(),
  })
  .refine((value) => !(value.market && value.eventId), {
    message: 'Provide market or eventId, not both',
    path: ['eventId'],
  })
  .refine(
    (value) =>
      (value.filterType === undefined) === (value.filterAmount === undefined),
    {
      message: 'Provide filterType and filterAmount together',
      path: ['filterAmount'],
    },
  );

const ListActivityRequestSchema = z
  .object({
    cursor: PaginationCursorSchema.optional(),
    pageSize: PageSizeSchema.default(20),
    user: z.string(),
    market: z.array(z.string()).optional(),
    eventId: z.array(z.number().int()).optional(),
    type: z.array(ActivityTypeSchema).optional(),
    start: z.number().int().optional(),
    end: z.number().int().optional(),
    sortBy: ActivitySortBySchema.optional(),
    sortDirection: SortDirectionSchema.optional(),
    side: SideSchema.optional(),
  })
  .refine((value) => !(value.market && value.eventId), {
    message: 'Provide market or eventId, not both',
    path: ['eventId'],
  });

export type ListTradesRequest = z.input<typeof ListTradesRequestSchema>;
export type ListActivityRequest = z.input<typeof ListActivityRequestSchema>;

export type ListTradesError =
  | RateLimitError
  | RequestRejectedError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;

/**
 * Lists trades for a wallet, market, or event.
 *
 * @throws {@link ListTradesError}
 * Thrown on failure.
 *
 * @example
 * Fetch the first page of results:
 * ```ts
 * const result = listTrades(client, {
 *   user: '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b',
 *   pageSize: 10,
 * });
 *
 * const firstPage = await result.first();
 *
 * // Optionally, fetch additional pages:
 * for await (const page of result.from(firstPage.nextCursor)) {
 *   // page.items: Trade[]
 * }
 * ```
 *
 * @example
 * Loop through all pages with `for await`:
 * ```ts
 * const result = listTrades(client, {
 *   user: '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b',
 *   pageSize: 10,
 * });
 *
 * for await (const page of result) {
 *   // page.items: Trade[]
 * }
 * ```
 */
export function listTrades(
  client: Client,
  request: ListTradesRequest = {},
): Paginated<Trade> {
  const { cursor, pageSize, ...params } = parseUserInput(
    request,
    ListTradesRequestSchema,
  );

  return paginate((cursor) => {
    const decoded = decodeOffsetCursor(cursor, pageSize);

    return client.data
      .get('/trades', {
        params: toDataSearchParams({
          ...params,
          limit: decoded.pageSize + 1,
          offset: decoded.offset,
        }),
      })
      .andThen(validateWith(ListTradesResponseSchema))
      .map((trades) => {
        const hasMore = trades.length > decoded.pageSize;

        return {
          items: trades.slice(0, decoded.pageSize),
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

export type ListActivityError =
  | RateLimitError
  | RequestRejectedError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;

/**
 * Lists wallet activity.
 *
 * @throws {@link ListActivityError}
 * Thrown on failure.
 *
 * @example
 * Fetch the first page of results:
 * ```ts
 * const result = listActivity(client, {
 *   user: '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b',
 *   pageSize: 10,
 * });
 *
 * const firstPage = await result.first();
 *
 * // Optionally, fetch additional pages:
 * for await (const page of result.from(firstPage.nextCursor)) {
 *   // page.items: Activity[]
 * }
 * ```
 *
 * @example
 * Loop through all pages with `for await`:
 * ```ts
 * const result = listActivity(client, {
 *   user: '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b',
 *   pageSize: 10,
 * });
 *
 * for await (const page of result) {
 *   // page.items: Activity[]
 * }
 * ```
 */
export function listActivity(
  client: Client,
  request: ListActivityRequest,
): Paginated<Activity> {
  const { cursor, pageSize, ...params } = parseUserInput(
    request,
    ListActivityRequestSchema,
  );

  return paginate((cursor) => {
    const decoded = decodeOffsetCursor(cursor, pageSize);

    return client.data
      .get('/activity', {
        params: toDataSearchParams({
          ...params,
          limit: decoded.pageSize + 1,
          offset: decoded.offset,
        }),
      })
      .andThen(validateWith(ListActivityResponseSchema))
      .map((activity) => {
        const hasMore = activity.length > decoded.pageSize;

        return {
          items: activity.slice(0, decoded.pageSize),
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
