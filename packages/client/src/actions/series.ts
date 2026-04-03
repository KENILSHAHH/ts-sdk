import {
  ListSeriesResponseSchema,
  type Series,
  SeriesSchema,
} from '@polymarket/bindings';
import { unwrap } from '@polymarket/types';
import { z } from 'zod';
import { parseUserInput } from '../input';
import type { PolymarketClient } from '../PolymarketClient';
import { snakeCase, toSearchParams } from './params';

const SeriesRequestSchema = z.object({
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

export type SeriesRequest = z.input<typeof SeriesRequestSchema>;
export type FetchSeriesRequest = z.input<typeof FetchSeriesRequestSchema>;
type SeriesParams = z.output<typeof SeriesRequestSchema>;

export async function listSeries(
  client: PolymarketClient,
  request: SeriesRequest = {},
): Promise<Series[]> {
  const params = parseUserInput(request, SeriesRequestSchema);

  return unwrap(
    client.gamma.get('series', {
      schema: ListSeriesResponseSchema,
      searchParams: toSearchParams(
        params,
        snakeCase<SeriesParams>({
          categoriesIds: 'categories_ids',
          categoriesLabels: 'categories_labels',
        }),
      ),
    }),
  );
}

export async function fetchSeries(
  client: PolymarketClient,
  request: FetchSeriesRequest,
): Promise<Series> {
  const params = parseUserInput(request, FetchSeriesRequestSchema);

  return unwrap(
    client.gamma.get(`series/${params.id}`, {
      schema: SeriesSchema,
      searchParams: toSearchParams(
        {
          includeChat: params.includeChat,
          locale: params.locale,
        },
        snakeCase(),
      ),
    }),
  );
}
