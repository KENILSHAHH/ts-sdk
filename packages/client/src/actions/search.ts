import {
  type PublicSearchResponse,
  PublicSearchResponseSchema,
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

const SearchRequestSchema = z.object({
  q: z.string().min(1),
  ascending: z.boolean().optional(),
  cache: z.boolean().optional(),
  eventsStatus: z.string().min(1).optional(),
  eventsTag: z.array(z.string()).optional(),
  excludeTagIds: z.array(z.number().int()).optional(),
  keepClosedMarkets: z.number().int().optional(),
  limitPerType: z.number().int().optional(),
  optimized: z.boolean().optional(),
  page: z.number().int().optional(),
  presets: z.array(z.string()).optional(),
  recurrence: z.enum(['daily', 'weekly', 'monthly']).optional(),
  searchProfiles: z.boolean().optional(),
  searchTags: z.boolean().optional(),
  sort: z.string().min(1).optional(),
});

export type SearchRequest = z.input<typeof SearchRequestSchema>;

type SearchParams = z.output<typeof SearchRequestSchema>;

export type SearchError =
  | RateLimitError
  | RequestRejectedError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;

/**
 * Runs a public full-text search.
 *
 * @throws {@link SearchError}
 * Thrown when the request is invalid, rejected, rate limited, interrupted by transport issues, or returns an unexpected response.
 *
 * @example
 * ```ts
 * const result = await search(client, {
 *   q: 'trump',
 *   limitPerType: 3,
 * });
 *
 * // result === PublicSearchResponse
 * ```
 */
export async function search(
  client: Client,
  request: SearchRequest,
): Promise<PublicSearchResponse> {
  const params = parseUserInput(request, SearchRequestSchema);

  return unwrap(
    client.gamma
      .get('public-search', {
        params: toSearchParams(
          params,
          snakeCase<SearchParams>({
            excludeTagIds: 'exclude_tag_id',
          }),
        ),
      })
      .andThen(validateWith(PublicSearchResponseSchema)),
  );
}
