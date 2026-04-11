import {
  type BuilderTrade,
  PaginatedBuilderTradesSchema,
} from '@polymarket/bindings/clob';
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
import { toSearchParams } from './params';

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
 * Thrown when the request is invalid, rejected, rate limited, interrupted by transport issues, or returns an unexpected response.
 *
 * @example
 * ```ts
 * const trades = await listBuilderTrades(client, {})
 *
 * // trades === BuilderTrade[]
 * ```
 */
export async function listBuilderTrades(
  client: Client,
  request: ListBuilderTradesRequest = {},
): Promise<BuilderTrade[]> {
  const params = parseUserInput(request, ListBuilderTradesRequestSchema);

  return listAllBuilderTradePages(async (nextCursor) => {
    const requestPath = '/builder/trades';

    return unwrap(
      client.clob
        .get(requestPath, {
          params: toSearchParams(
            {
              after: params.after,
              before: params.before,
              builder: params.builder,
              id: params.id,
              market: params.market,
              nextCursor,
              tokenId: params.tokenId,
            },
            {
              after: 'after',
              before: 'before',
              builder: 'builder',
              id: 'id',
              market: 'market',
              nextCursor: 'next_cursor',
              tokenId: 'asset_id',
            },
          ),
        })
        .andThen(validateWith(PaginatedBuilderTradesSchema)),
    );
  });
}

async function listAllBuilderTradePages(
  fetchPage: (nextCursor: string) => Promise<{
    data: BuilderTrade[];
    next_cursor: string;
  }>,
): Promise<BuilderTrade[]> {
  let nextCursor = 'MA==';
  const results: BuilderTrade[] = [];

  while (nextCursor !== 'LTE=') {
    const response = await fetchPage(nextCursor);

    results.push(...response.data);
    nextCursor = response.next_cursor;
  }

  return results;
}
