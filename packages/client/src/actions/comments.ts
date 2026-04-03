import { type Comment, ListCommentsResponseSchema } from '@polymarket/bindings';
import { unwrap } from '@polymarket/types';
import { z } from 'zod';
import { parseUserInput } from '../input';
import type { PolymarketClient } from '../PolymarketClient';
import { snakeCase, toSearchParams } from './params';

const CommentsRequestSchema = z.object({
  ascending: z.boolean().optional(),
  getPositions: z.boolean().optional(),
  holdersOnly: z.boolean().optional(),
  limit: z.number().int().optional(),
  offset: z.number().int().optional(),
  order: z.string().optional(),
  parentEntityId: z.number().int(),
  parentEntityType: z.enum(['Event', 'Series', 'market']),
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

export type CommentsRequest = z.input<typeof CommentsRequestSchema>;
export type FetchCommentsByIdRequest = z.input<
  typeof FetchCommentsByIdRequestSchema
>;
export type FetchCommentsByUserAddressRequest = z.input<
  typeof FetchCommentsByUserAddressRequestSchema
>;

export async function listComments(
  client: PolymarketClient,
  request: CommentsRequest,
): Promise<Comment[]> {
  const params = parseUserInput(request, CommentsRequestSchema);

  return unwrap(
    client.gamma.get('comments', {
      schema: ListCommentsResponseSchema,
      searchParams: toSearchParams(params, snakeCase()),
    }),
  );
}

export async function fetchCommentsById(
  client: PolymarketClient,
  request: FetchCommentsByIdRequest,
): Promise<Comment[]> {
  const params = parseUserInput(request, FetchCommentsByIdRequestSchema);

  return unwrap(
    client.gamma.get(`comments/${params.id}`, {
      schema: ListCommentsResponseSchema,
      searchParams: toSearchParams(
        {
          getPositions: params.getPositions,
        },
        snakeCase(),
      ),
    }),
  );
}

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
      searchParams: toSearchParams(
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
