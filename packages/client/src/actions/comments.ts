import {
  type Comment,
  ListCommentsResponseSchema,
} from '@polymarket/bindings/gamma';
import { unwrap } from '@polymarket/types';
import { z } from 'zod';
import { parseUserInput } from '../input';
import type { PolymarketClient } from '../PolymarketClient';
import { snakeCase, toSearchParams } from './params';

const ListCommentsRequestSchema = z.object({
  ascending: z.boolean().optional(),
  getPositions: z.boolean().optional(),
  holdersOnly: z.boolean().optional(),
  limit: z.number().int().optional(),
  offset: z.number().int().optional(),
  order: z.string().optional(),
  parentEntityId: z.number().int(),
  parentEntityType: z.enum(['Event', 'Series']),
});

const FetchCommentsByIdRequestSchema = z.object({
  getPositions: z.boolean().optional(),
  id: z.number().int(),
});

const FetchCommentsByUserAddressRequestSchema = z.object({
  address: z.string(),
  ascending: z.boolean().optional(),
  limit: z.number().int().optional(),
  offset: z.number().int().optional(),
  order: z.string().optional(),
});

export type ListCommentsRequest = z.input<typeof ListCommentsRequestSchema>;
export type FetchCommentsByIdRequest = z.input<
  typeof FetchCommentsByIdRequestSchema
>;
export type FetchCommentsByUserAddressRequest = z.input<
  typeof FetchCommentsByUserAddressRequestSchema
>;

/**
 * Lists comments for an event or series.
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
 * const comments = await listComments(client, {
 *   parentEntityId: 123,
 *   parentEntityType: 'Event',
 *   limit: 20,
 * });
 *
 * // comments === Comment[]
 * ```
 */
export async function listComments(
  client: PolymarketClient,
  request: ListCommentsRequest,
): Promise<Comment[]> {
  const params = parseUserInput(request, ListCommentsRequestSchema);

  return unwrap(
    client.gamma.get('comments', {
      schema: ListCommentsResponseSchema,
      params: toSearchParams(params, snakeCase()),
    }),
  );
}

/**
 * Fetches a comment thread by comment id.
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
 * const thread = await fetchCommentsById(client, {
 *   id: 456,
 *   getPositions: true,
 * });
 *
 * // thread === Comment[]
 * ```
 */
export async function fetchCommentsById(
  client: PolymarketClient,
  request: FetchCommentsByIdRequest,
): Promise<Comment[]> {
  const params = parseUserInput(request, FetchCommentsByIdRequestSchema);

  return unwrap(
    client.gamma.get(`comments/${params.id}`, {
      schema: ListCommentsResponseSchema,
      params: toSearchParams(
        {
          getPositions: params.getPositions,
        },
        snakeCase(),
      ),
    }),
  );
}

/**
 * Fetches comments written by a wallet address.
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
 * const comments = await fetchCommentsByUserAddress(client, {
 *   address: '0x1234...',
 *   limit: 10,
 *   order: 'DESC',
 * });
 *
 * // comments === Comment[]
 * ```
 */
export async function fetchCommentsByUserAddress(
  client: PolymarketClient,
  request: FetchCommentsByUserAddressRequest,
): Promise<Comment[]> {
  const params = parseUserInput(
    request,
    FetchCommentsByUserAddressRequestSchema,
  );

  return unwrap(
    client.gamma.get(`comments/user_address/${params.address}`, {
      schema: ListCommentsResponseSchema,
      params: toSearchParams(
        {
          ascending: params.ascending,
          limit: params.limit,
          offset: params.offset,
          order: params.order,
        },
        snakeCase(),
      ),
    }),
  );
}
