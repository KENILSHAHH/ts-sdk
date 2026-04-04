import {
  ListSeriesResponseSchema,
  type Series,
  SeriesSchema,
} from '@polymarket/bindings/gamma';
import { unwrap } from '@polymarket/types';
import { z } from 'zod';
import { parseUserInput } from '../input';
import type { PolymarketClient } from '../PolymarketClient';
import { snakeCase, toSearchParams } from './params';

const ListSeriesRequestSchema = z.object({
  ascending: z.boolean().optional(),
  categoriesIds: z.array(z.number().int()).optional(),
  categoriesLabels: z.array(z.string()).optional(),
  closed: z.boolean().optional(),
  excludeEvents: z.boolean().optional(),
  includeChat: z.boolean().optional(),
  limit: z.number().int().optional(),
  locale: z.string().optional(),
  offset: z.number().int().optional(),
  order: z.string().optional(),
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

/**
 * Lists series.
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
 * const series = await listSeries(client, {
 *   limit: 10,
 *   closed: false,
 * });
 *
 * // series === Series[]
 * ```
 */
export async function listSeries(
  client: PolymarketClient,
  request: ListSeriesRequest = {},
): Promise<Series[]> {
  const params = parseUserInput(request, ListSeriesRequestSchema);

  return unwrap(
    client.gamma.get('series', {
      schema: ListSeriesResponseSchema,
      params: toSearchParams(
        params,
        snakeCase<ListSeriesParams>({
          categoriesIds: 'categories_ids',
          categoriesLabels: 'categories_labels',
        }),
      ),
    }),
  );
}

/**
 * Fetches a series.
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
 * const series = await fetchSeries(client, {
 *   id: 'fed-daily-series',
 *   includeChat: true,
 * });
 *
 * // series === Series
 * ```
 */
export async function fetchSeries(
  client: PolymarketClient,
  request: FetchSeriesRequest,
): Promise<Series> {
  const params = parseUserInput(request, FetchSeriesRequestSchema);

  return unwrap(
    client.gamma.get(`series/${params.id}`, {
      schema: SeriesSchema,
      params: toSearchParams(
        {
          includeChat: params.includeChat,
          locale: params.locale,
        },
        snakeCase(),
      ),
    }),
  );
}
