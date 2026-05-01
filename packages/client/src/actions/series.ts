import { PaginationCursorSchema } from '@polymarket/bindings';
import {
  ListSeriesResponseSchema,
  type Series,
  SeriesSchema,
} from '@polymarket/bindings/gamma';
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
import { validateWith } from '../response';
import { snakeCase, toSearchParams } from './params';

const ListSeriesRequestSchema = z.object({
  ascending: z.boolean().optional(),
  categoriesIds: z.array(z.number().int()).optional(),
  categoriesLabels: z.array(z.string()).optional(),
  closed: z.boolean().optional(),
  cursor: PaginationCursorSchema.optional(),
  excludeEvents: z.boolean().optional(),
  includeChat: z.boolean().optional(),
  locale: z.string().optional(),
  order: z.string().optional(),
  pageSize: PageSizeSchema.default(20),
  recurrence: z.enum(['daily', 'weekly', 'monthly']).optional(),
  slug: z.array(z.string()).optional(),
});

const FetchSeriesRequestSchema = z.object({
  id: z.string(),
  includeChat: z.boolean().optional(),
  locale: z.string().optional(),
});

export type ListSeriesRequest = z.input<typeof ListSeriesRequestSchema>;
export type FetchSeriesRequest = z.input<typeof FetchSeriesRequestSchema>;
type ListSeriesParams = z.output<typeof ListSeriesRequestSchema>;

export type ListSeriesError =
  | RateLimitError
  | RequestRejectedError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;
export const ListSeriesError = makeErrorGuard(
  RateLimitError,
  RequestRejectedError,
  TransportError,
  UnexpectedResponseError,
  UserInputError,
);

/**
 * Lists series.
 *
 * @throws {@link ListSeriesError}
 * Thrown on failure.
 *
 * @example
 * Fetch the first page of results:
 * ```ts
 * const result = listSeries(client, {
 *   closed: false,
 *   pageSize: 10,
 * });
 *
 * const firstPage = await result.firstPage();
 *
 * // Optionally, fetch additional pages:
 * for await (const page of result.from(firstPage.nextCursor)) {
 *   // page.items: Series[]
 * }
 * ```
 *
 * @example
 * Loop through all pages with `for await`:
 * ```ts
 * const result = listSeries(client, {
 *   closed: false,
 *   pageSize: 10,
 * });
 *
 * for await (const page of result) {
 *   // page.items: Series[]
 * }
 * ```
 */
export function listSeries(
  client: BaseClient,
  request: ListSeriesRequest = {},
): Paginated<Series[]> {
  const { cursor, pageSize, ...params } = parseUserInput(
    request,
    ListSeriesRequestSchema,
  );

  return paginate((cursor) => {
    const decoded = decodeOffsetCursor(cursor, pageSize);

    return client.gamma
      .get('/series', {
        params: toSearchParams(
          {
            ...params,
            limit: decoded.pageSize + 1,
            offset: decoded.offset,
          },
          snakeCase<ListSeriesParams>({
            categoriesIds: 'categories_ids',
            categoriesLabels: 'categories_labels',
          }),
        ),
      })
      .andThen(validateWith(ListSeriesResponseSchema))
      .map((series) => {
        const hasMore = series.length > decoded.pageSize;

        return {
          items: series.slice(0, decoded.pageSize),
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

export type FetchSeriesError =
  | RateLimitError
  | RequestRejectedError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;
export const FetchSeriesError = makeErrorGuard(
  RateLimitError,
  RequestRejectedError,
  TransportError,
  UnexpectedResponseError,
  UserInputError,
);

/**
 * Fetches a series.
 *
 * @throws {@link FetchSeriesError}
 * Thrown on failure.
 *
 * @example
 * ```ts
 * const series = await fetchSeries(client, {
 *   id: 'fed-daily-series',
 *   includeChat: true,
 * });
 *
 * // series === Series
 * ```
 */
export async function fetchSeries(
  client: BaseClient,
  request: FetchSeriesRequest,
): Promise<Series> {
  const params = parseUserInput(request, FetchSeriesRequestSchema);

  return unwrap(
    client.gamma
      .get(`series/${params.id}`, {
        params: toSearchParams(
          {
            includeChat: params.includeChat,
            locale: params.locale,
          },
          snakeCase(),
        ),
      })
      .andThen(validateWith(SeriesSchema)),
  );
}
