import {
  ListRelatedTagResourcesResponseSchema,
  ListRelatedTagsResponseSchema,
  ListTagsResponseSchema,
  type RelatedTag,
  type Tag,
  TagSchema,
} from '@polymarket/bindings/gamma';
import { unwrap } from '@polymarket/types';
import { z } from 'zod';
import { parseUserInput } from '../input';
import type { PolymarketClient } from '../PolymarketClient';
import { snakeCase, toSearchParams } from './params';

const ListTagsRequestSchema = z.object({
  ascending: z.boolean().optional(),
  includeChat: z.boolean().optional(),
  includeTemplate: z.boolean().optional(),
  isCarousel: z.boolean().optional(),
  limit: z.number().int().optional(),
  locale: z.string().optional(),
  offset: z.number().int().optional(),
  order: z.string().optional(),
});

const FetchTagRequestSchema = z.union([
  z.object({
    id: z.string(),
    includeChat: z.boolean().optional(),
    includeTemplate: z.boolean().optional(),
    locale: z.string().optional(),
  }),
  z.object({
    slug: z.string(),
    locale: z.string().optional(),
  }),
]);

const RelatedTagsByIdRequestSchema = z.object({
  id: z.string(),
  omitEmpty: z.boolean().optional(),
  status: z.enum(['active', 'closed', 'all']).optional(),
});

const RelatedTagsBySlugRequestSchema = z.object({
  slug: z.string(),
});

const RelatedTagResourcesByIdRequestSchema = z.object({
  id: z.string(),
  locale: z.string().optional(),
  omitEmpty: z.boolean().optional(),
  status: z.enum(['active', 'closed', 'all']).optional(),
});

const RelatedTagResourcesBySlugRequestSchema = z.object({
  locale: z.string().optional(),
  slug: z.string(),
  omitEmpty: z.boolean().optional(),
  status: z.enum(['active', 'closed', 'all']).optional(),
});

export type ListTagsRequest = z.input<typeof ListTagsRequestSchema>;
export type FetchTagRequest = z.input<typeof FetchTagRequestSchema>;
export type FetchRelatedTagsRequest =
  | z.input<typeof RelatedTagsByIdRequestSchema>
  | z.input<typeof RelatedTagsBySlugRequestSchema>;
export type FetchRelatedTagResourcesRequest =
  | z.input<typeof RelatedTagResourcesByIdRequestSchema>
  | z.input<typeof RelatedTagResourcesBySlugRequestSchema>;

/**
 * Lists tags.
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
 * const tags = await listTags(client, {
 *   limit: 12,
 *   includeTemplate: true,
 * });
 *
 * // tags === Tag[]
 * ```
 */
export async function listTags(
  client: PolymarketClient,
  request: ListTagsRequest = {},
): Promise<Tag[]> {
  const params = parseUserInput(request, ListTagsRequestSchema);

  return unwrap(
    client.gamma.get('tags', {
      schema: ListTagsResponseSchema,
      params: toSearchParams(params, snakeCase()),
    }),
  );
}

/**
 * Fetches a tag by id or slug.
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
 * const tag = await fetchTag(client, {
 *   slug: 'politics',
 *   locale: 'en',
 * });
 *
 * // tag === Tag
 * ```
 */
export async function fetchTag(
  client: PolymarketClient,
  request: FetchTagRequest,
): Promise<Tag> {
  const params = parseUserInput(request, FetchTagRequestSchema);

  if ('id' in params) {
    return unwrap(
      client.gamma.get(`tags/${params.id}`, {
        schema: TagSchema,
        params: toSearchParams(
          {
            includeChat: params.includeChat,
            includeTemplate: params.includeTemplate,
            locale: params.locale,
          },
          snakeCase(),
        ),
      }),
    );
  }

  return unwrap(
    client.gamma.get(`tags/slug/${params.slug}`, {
      schema: TagSchema,
      params: toSearchParams(
        {
          locale: params.locale,
        },
        snakeCase(),
      ),
    }),
  );
}

/**
 * Fetches related tag relationships by id or slug.
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
 * const relatedTags = await fetchRelatedTags(client, {
 *   id: '42',
 *   status: 'active',
 *   omitEmpty: true,
 * });
 *
 * // relatedTags === RelatedTag[]
 * ```
 */
export async function fetchRelatedTags(
  client: PolymarketClient,
  request: FetchRelatedTagsRequest,
): Promise<RelatedTag[]> {
  if ('id' in request) {
    const params = parseUserInput(request, RelatedTagsByIdRequestSchema);

    return unwrap(
      client.gamma.get(`tags/${params.id}/related-tags`, {
        schema: ListRelatedTagsResponseSchema,
        params: toSearchParams(
          {
            omitEmpty: params.omitEmpty,
            status: params.status,
          },
          snakeCase(),
        ),
      }),
    );
  }

  const params = parseUserInput(request, RelatedTagsBySlugRequestSchema);

  return unwrap(
    client.gamma.get(`tags/slug/${params.slug}/related-tags`, {
      schema: ListRelatedTagsResponseSchema,
    }),
  );
}

/**
 * Fetches resources linked from related tag relationships by id or slug.
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
 * const relatedResources = await fetchRelatedTagResources(client, {
 *   slug: 'election',
 *   status: 'active',
 *   omitEmpty: true,
 * });
 *
 * // relatedResources === Tag[]
 * ```
 */
export async function fetchRelatedTagResources(
  client: PolymarketClient,
  request: FetchRelatedTagResourcesRequest,
): Promise<Tag[]> {
  if ('id' in request) {
    const params = parseUserInput(
      request,
      RelatedTagResourcesByIdRequestSchema,
    );

    return unwrap(
      client.gamma.get(`tags/${params.id}/related-tags/tags`, {
        schema: ListRelatedTagResourcesResponseSchema,
        params: toSearchParams(
          {
            locale: params.locale,
            omitEmpty: params.omitEmpty,
            status: params.status,
          },
          snakeCase(),
        ),
      }),
    );
  }

  const params = parseUserInput(
    request,
    RelatedTagResourcesBySlugRequestSchema,
  );

  return unwrap(
    client.gamma.get(`tags/slug/${params.slug}/related-tags/tags`, {
      schema: ListRelatedTagResourcesResponseSchema,
      params: toSearchParams(
        {
          locale: params.locale,
          omitEmpty: params.omitEmpty,
          status: params.status,
        },
        snakeCase(),
      ),
    }),
  );
}
