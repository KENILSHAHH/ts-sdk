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

export type ListTagsError =
  | RateLimitError
  | RequestRejectedError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;

/**
 * Lists tags.
 *
 * @throws {@link ListTagsError}
 * Thrown when the request is invalid, rejected, rate limited, interrupted by transport issues, or returns an unexpected response.
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
  client: Client,
  request: ListTagsRequest = {},
): Promise<Tag[]> {
  const params = parseUserInput(request, ListTagsRequestSchema);

  return unwrap(
    client.gamma
      .get('/tags', {
        params: toSearchParams(params, snakeCase()),
      })
      .andThen(validateWith(ListTagsResponseSchema)),
  );
}

export type FetchTagError =
  | RateLimitError
  | RequestRejectedError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;

/**
 * Fetches a tag by id or slug.
 *
 * @throws {@link FetchTagError}
 * Thrown when the request is invalid, rejected, rate limited, interrupted by transport issues, or returns an unexpected response.
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
  client: Client,
  request: FetchTagRequest,
): Promise<Tag> {
  const params = parseUserInput(request, FetchTagRequestSchema);

  if ('id' in params) {
    return unwrap(
      client.gamma
        .get(`tags/${params.id}`, {
          params: toSearchParams(
            {
              includeChat: params.includeChat,
              includeTemplate: params.includeTemplate,
              locale: params.locale,
            },
            snakeCase(),
          ),
        })
        .andThen(validateWith(TagSchema)),
    );
  }

  return unwrap(
    client.gamma
      .get(`tags/slug/${params.slug}`, {
        params: toSearchParams(
          {
            locale: params.locale,
          },
          snakeCase(),
        ),
      })
      .andThen(validateWith(TagSchema)),
  );
}

export type FetchRelatedTagsError =
  | RateLimitError
  | RequestRejectedError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;

/**
 * Fetches related tag relationships by id or slug.
 *
 * @throws {@link FetchRelatedTagsError}
 * Thrown when the request is invalid, rejected, rate limited, interrupted by transport issues, or returns an unexpected response.
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
  client: Client,
  request: FetchRelatedTagsRequest,
): Promise<RelatedTag[]> {
  if ('id' in request) {
    const params = parseUserInput(request, RelatedTagsByIdRequestSchema);

    return unwrap(
      client.gamma
        .get(`tags/${params.id}/related-tags`, {
          params: toSearchParams(
            {
              omitEmpty: params.omitEmpty,
              status: params.status,
            },
            snakeCase(),
          ),
        })
        .andThen(validateWith(ListRelatedTagsResponseSchema)),
    );
  }

  const params = parseUserInput(request, RelatedTagsBySlugRequestSchema);

  return unwrap(
    client.gamma
      .get(`tags/slug/${params.slug}/related-tags`)
      .andThen(validateWith(ListRelatedTagsResponseSchema)),
  );
}

export type FetchRelatedTagResourcesError =
  | RateLimitError
  | RequestRejectedError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;

/**
 * Fetches resources linked from related tag relationships by id or slug.
 *
 * @throws {@link FetchRelatedTagResourcesError}
 * Thrown when the request is invalid, rejected, rate limited, interrupted by transport issues, or returns an unexpected response.
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
  client: Client,
  request: FetchRelatedTagResourcesRequest,
): Promise<Tag[]> {
  if ('id' in request) {
    const params = parseUserInput(
      request,
      RelatedTagResourcesByIdRequestSchema,
    );

    return unwrap(
      client.gamma
        .get(`tags/${params.id}/related-tags/tags`, {
          params: toSearchParams(
            {
              locale: params.locale,
              omitEmpty: params.omitEmpty,
              status: params.status,
            },
            snakeCase(),
          ),
        })
        .andThen(validateWith(ListRelatedTagResourcesResponseSchema)),
    );
  }

  const params = parseUserInput(
    request,
    RelatedTagResourcesBySlugRequestSchema,
  );

  return unwrap(
    client.gamma
      .get(`tags/slug/${params.slug}/related-tags/tags`, {
        params: toSearchParams(
          {
            locale: params.locale,
            omitEmpty: params.omitEmpty,
            status: params.status,
          },
          snakeCase(),
        ),
      })
      .andThen(validateWith(ListRelatedTagResourcesResponseSchema)),
  );
}
