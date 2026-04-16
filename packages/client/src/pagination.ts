import {
  type PaginationCursor,
  PaginationCursorSchema,
} from '@polymarket/bindings';
import { invariant, type ResultAsync, unwrap } from '@polymarket/types';
import { z } from 'zod';

export const PaginatedRequestFields = {
  cursor: PaginationCursorSchema.optional(),
  pageSize: z.number().int().positive().optional(),
} as const;

export type Page<T> = {
  items: T[];
  hasMore: boolean;
  nextCursor?: PaginationCursor;
  totalCount?: number;
};

export type Paginated<T> = AsyncIterable<Page<T>> & {
  first(): Promise<Page<T>>;
  from(cursor?: PaginationCursor): Paginated<T>;
};

/** @internal */
export function paginate<T, TError>(
  fetchPage: (cursor?: PaginationCursor) => ResultAsync<Page<T>, TError>,
  initialCursor?: PaginationCursor,
): Paginated<T> {
  function createEmptyPaginator(): Paginated<T> {
    return {
      async first() {
        invariant(
          false,
          'Expected the paginated result to yield at least one page',
        );
      },
      from() {
        return createEmptyPaginator();
      },
      async *[Symbol.asyncIterator]() {},
    };
  }

  function createPaginator(cursor = initialCursor): Paginated<T> {
    return {
      first() {
        return unwrap(fetchPage(cursor));
      },
      from(nextCursor) {
        if (nextCursor === undefined) {
          return createEmptyPaginator();
        }

        return createPaginator(nextCursor);
      },
      async *[Symbol.asyncIterator]() {
        let currentCursor = cursor;

        while (true) {
          const page = await unwrap(fetchPage(currentCursor));

          yield page;

          if (!page.hasMore) {
            return;
          }

          currentCursor = page.nextCursor;
        }
      },
    };
  }

  return createPaginator();
}
