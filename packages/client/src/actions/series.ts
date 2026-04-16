import {
  ListSeriesResponseSchema,
  type Series,
  SeriesSchema,
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
import { validateWith } from '../response';
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

export type ListSeriesError =
  | RateLimitError
  | RequestRejectedError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;

/**
 * Lists series.
 *
 * @throws {@link ListSeriesError}
 * Thrown on failure.
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
  client: Client,
  request: ListSeriesRequest = {},
): Promise<Series[]> {
  const params = parseUserInput(request, ListSeriesRequestSchema);

  return unwrap(
    client.gamma
      .get('/series', {
        params: toSearchParams(
          params,
          snakeCase<ListSeriesParams>({
            categoriesIds: 'categories_ids',
            categoriesLabels: 'categories_labels',
          }),
        ),
      })
      .andThen(validateWith(ListSeriesResponseSchema)),
  );
}

export type FetchSeriesError =
  | RateLimitError
  | RequestRejectedError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;

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
  client: Client,
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
