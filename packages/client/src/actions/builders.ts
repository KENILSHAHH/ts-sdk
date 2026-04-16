import { toPaginationCursor } from '@polymarket/bindings';
import {
  type BuilderTrade,
  END_CURSOR,
  PaginatedBuilderTradesSchema,
} from '@polymarket/bindings/clob';
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
import { type Paginated, paginate } from '../pagination';
import { validateWith } from '../response';
import { snakeCase, toSearchParams } from './params';

const ListBuilderTradesRequestSchema = z.object({
  after: z.string().optional(),
  before: z.string().optional(),
  builder: z.string().optional(),
  id: z.string().optional(),
  market: z.string().optional(),
  tokenId: z.string().optional(),
});

export type ListBuilderTradesRequest = z.input<
  typeof ListBuilderTradesRequestSchema
>;

export type ListBuilderTradesError =
  | RateLimitError
  | RequestRejectedError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;

/**
 * Lists builder-attributed trades.
 *
 * @throws {@link ListBuilderTradesError}
 * Thrown on failure.
 *
 * @example
 * Fetch the first page of results:
 * ```ts
 * const result = listBuilderTrades(client);
 *
 * const firstPage = await result.first();
 *
 * // Optionally, fetch additional pages:
 * for await (const page of result.from(firstPage.nextCursor)) {
 *   // page.items: BuilderTrade[]
 * }
 * ```
 *
 * @example
 * Loop through all pages with `for await`:
 * ```ts
 * const result = listBuilderTrades(client);
 *
 * for await (const page of result) {
 *   // page.items: BuilderTrade[]
 * }
 * ```
 */
export function listBuilderTrades(
  client: Client,
  request: ListBuilderTradesRequest = {},
): Paginated<BuilderTrade> {
  const params = parseUserInput(request, ListBuilderTradesRequestSchema);

  return paginate((nextCursor) => {
    return client.clob
      .get('/builder/trades', {
        params: toSearchParams(
          { ...params, nextCursor },
          snakeCase({
            tokenId: 'asset_id',
          }),
        ),
      })
      .andThen(validateWith(PaginatedBuilderTradesSchema))
      .map((response) => ({
        items: response.data,
        hasMore: response.next_cursor !== END_CURSOR,
        nextCursor:
          response.next_cursor === END_CURSOR
            ? undefined
            : toPaginationCursor(response.next_cursor),
        totalCount: response.count,
      }));
  });
}
