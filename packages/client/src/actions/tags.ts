import {
  ListRelatedTagResourcesResponseSchema,
  ListRelatedTagsResponseSchema,
  ListTagsResponseSchema,
  type RelatedTag,
  type Tag,
  TagSchema,
} from '@polymarket/bindings';
import { unwrap } from '@polymarket/types';
import { z } from 'zod';
import { parseUserInput } from '../input';
import type { PolymarketClient } from '../PolymarketClient';
import { snakeCase, toSearchParams } from './params';

const TagsRequestSchema = z.object({
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
  omitEmpty: z.boolean().optional(),
  status: z.enum(['active', 'closed', 'all']).optional(),
});

const RelatedTagResourcesBySlugRequestSchema = z.object({
  slug: z.string(),
  omitEmpty: z.boolean().optional(),
  status: z.enum(['active', 'closed', 'all']).optional(),
});

export type TagsRequest = z.input<typeof TagsRequestSchema>;
export type FetchTagRequest = z.input<typeof FetchTagRequestSchema>;
export type FetchRelatedTagsRequest =
  | z.input<typeof RelatedTagsByIdRequestSchema>
  | z.input<typeof RelatedTagsBySlugRequestSchema>;
export type FetchRelatedTagResourcesRequest =
  | z.input<typeof RelatedTagResourcesByIdRequestSchema>
  | z.input<typeof RelatedTagResourcesBySlugRequestSchema>;

/** Lists tags. */
export async function listTags(
  client: PolymarketClient,
  request: TagsRequest = {},
): Promise<Tag[]> {
  const params = parseUserInput(request, TagsRequestSchema);

  return unwrap(
    client.gamma.get('tags', {
      schema: ListTagsResponseSchema,
      searchParams: toSearchParams(params, snakeCase()),
    }),
  );
}

/** Fetches a tag by id or slug. */
export async function fetchTag(
  client: PolymarketClient,
  request: FetchTagRequest,
): Promise<Tag> {
  const params = parseUserInput(request, FetchTagRequestSchema);

  if ('id' in params) {
    return unwrap(
      client.gamma.get(`tags/${params.id}`, {
        schema: TagSchema,
        searchParams: toSearchParams(
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
      searchParams: toSearchParams(
        {
          locale: params.locale,
        },
        snakeCase(),
      ),
    }),
  );
}

/** Fetches related tag relationships by id or slug. */
export async function fetchRelatedTags(
  client: PolymarketClient,
  request: FetchRelatedTagsRequest,
): Promise<RelatedTag[]> {
  if ('id' in request) {
    const params = parseUserInput(request, RelatedTagsByIdRequestSchema);

    return unwrap(
      client.gamma.get(`tags/${params.id}/related-tags`, {
        schema: ListRelatedTagsResponseSchema,
        searchParams: toSearchParams(
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

/** Fetches related tag resources by id or slug. */
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
        searchParams: toSearchParams(
          {
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
      searchParams: toSearchParams(
        {
          omitEmpty: params.omitEmpty,
          status: params.status,
        },
        snakeCase(),
      ),
    }),
  );
}
