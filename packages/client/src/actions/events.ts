import {
  ISOCalendarDateSchema,
  ISODateStringSchema,
} from '@polymarket/bindings';
import {
  FetchEventLiveVolumeResponseSchema,
  type LiveVolume,
} from '@polymarket/bindings/data';
import {
  type Event,
  EventSchema,
  FetchEventTagsResponseSchema,
  ListEventsResponseSchema,
  type TagReference,
} from '@polymarket/bindings/gamma';
import { unwrap } from '@polymarket/types';
import { z } from 'zod';
import { parseUserInput } from '../input';
import type { PolymarketClient } from '../PolymarketClient';
import { toDataSearchParams } from './dataParams';
import { snakeCase, toSearchParams } from './params';

const ListEventsRequestSchema = z.object({
  ascending: z.boolean().optional(),
  closed: z.boolean().optional(),
  cyom: z.boolean().optional(),
  endDateMax: ISODateStringSchema.optional(),
  endDateMin: ISODateStringSchema.optional(),
  ended: z.boolean().optional(),
  eventDate: ISOCalendarDateSchema.optional(),
  eventWeek: z.number().int().optional(),
  excludeTagIds: z.array(z.number().int()).optional(),
  featured: z.boolean().optional(),
  featuredOrder: z.boolean().optional(),
  gameIds: z.array(z.number().int()).optional(),
  ids: z.array(z.number().int()).optional(),
  includeBestLines: z.boolean().optional(),
  includeChat: z.boolean().optional(),
  includeChildren: z.boolean().optional(),
  includeTemplate: z.boolean().optional(),
  limit: z.number().int().optional(),
  liquidityMax: z.number().optional(),
  liquidityMin: z.number().optional(),
  live: z.boolean().optional(),
  locale: z.string().optional(),
  offset: z.number().int().optional(),
  order: z.string().optional(),
  parentEventId: z.number().int().optional(),
  partnerSlug: z.string().optional(),
  recurrence: z.enum(['daily', 'weekly', 'monthly']).optional(),
  relatedTags: z.boolean().optional(),
  seriesIds: z.array(z.number().int()).optional(),
  slug: z.array(z.string()).optional(),
  startDateMax: ISODateStringSchema.optional(),
  startDateMin: ISODateStringSchema.optional(),
  startTimeMax: ISODateStringSchema.optional(),
  startTimeMin: ISODateStringSchema.optional(),
  tagIds: z.array(z.number().int()).optional(),
  tagMatch: z.enum(['any', 'all']).optional(),
  tagSlug: z.string().optional(),
  titleSearch: z.string().optional(),
  volumeMax: z.number().optional(),
  volumeMin: z.number().optional(),
});

export type ListEventsRequest = z.input<typeof ListEventsRequestSchema>;

const FetchEventRequestSchema = z.union([
  z.object({
    id: z.string(),
    includeBestLines: z.boolean().optional(),
    includeChat: z.boolean().optional(),
    includeTemplate: z.boolean().optional(),
    locale: z.string().optional(),
  }),
  z.object({
    slug: z.string(),
    includeBestLines: z.boolean().optional(),
    includeChat: z.boolean().optional(),
    includeTemplate: z.boolean().optional(),
    locale: z.string().optional(),
  }),
]);

export type FetchEventRequest = z.input<typeof FetchEventRequestSchema>;

const FetchEventTagsRequestSchema = z.object({
  id: z.string(),
});

export type FetchEventTagsRequest = z.input<typeof FetchEventTagsRequestSchema>;

const FetchEventLiveVolumeRequestSchema = z.object({
  id: z.number().int(),
});

export type FetchEventLiveVolumeRequest = z.input<
  typeof FetchEventLiveVolumeRequestSchema
>;

type ListEventsParams = z.output<typeof ListEventsRequestSchema>;

/**
 * Lists events.
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
 * const result = await listEvents(client, {
 *   limit: 10,
 *   closed: false,
 * });
 *
 * // result === Event[]
 * ```
 */
export async function listEvents(
  client: PolymarketClient,
  request: ListEventsRequest = {},
): Promise<Event[]> {
  const params = parseUserInput(request, ListEventsRequestSchema);

  return unwrap(
    client.gamma.get('events', {
      schema: ListEventsResponseSchema,
      searchParams: toEventsSearchParams(params),
    }),
  );
}

/**
 * Fetches an event.
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
 * const event = await fetchEvent(client, {
 *   id: '12345',
 * });
 *
 * // event === Event
 * ```
 */
export async function fetchEvent(
  client: PolymarketClient,
  request: FetchEventRequest,
): Promise<Event> {
  const params = parseUserInput(request, FetchEventRequestSchema);

  if ('id' in params) {
    return unwrap(
      client.gamma.get(`events/${params.id}`, {
        schema: EventSchema,
        searchParams: toFetchEventByIdSearchParams(params),
      }),
    );
  }

  return unwrap(
    client.gamma.get(`events/slug/${params.slug}`, {
      schema: EventSchema,
      searchParams: toFetchEventBySlugSearchParams(params),
    }),
  );
}

/**
 * Fetches an event's tags.
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
 * const tags = await fetchEventTags(client, {
 *   id: '12345',
 * });
 *
 * // tags === TagReference[]
 * ```
 */
export async function fetchEventTags(
  client: PolymarketClient,
  request: FetchEventTagsRequest,
): Promise<TagReference[]> {
  const params = parseUserInput(request, FetchEventTagsRequestSchema);

  return unwrap(
    client.gamma.get(`events/${params.id}/tags`, {
      schema: FetchEventTagsResponseSchema,
    }),
  );
}

/**
 * Fetches live volume for an event.
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
 * const volume = await fetchEventLiveVolume(client, {
 *   id: 160707,
 * });
 *
 * // volume === LiveVolume[]
 * ```
 */
export async function fetchEventLiveVolume(
  client: PolymarketClient,
  request: FetchEventLiveVolumeRequest,
): Promise<LiveVolume[]> {
  const params = parseUserInput(request, FetchEventLiveVolumeRequestSchema);

  return unwrap(
    client.data.get('live-volume', {
      schema: FetchEventLiveVolumeResponseSchema,
      searchParams: toDataSearchParams(params),
    }),
  );
}

function toEventsSearchParams(params: ListEventsParams): URLSearchParams {
  return toSearchParams(
    params,
    snakeCase<ListEventsParams>({
      excludeTagIds: 'exclude_tag_id',
      gameIds: 'game_id',
      ids: 'id',
      seriesIds: 'series_id',
      tagIds: 'tag_id',
    }),
  );
}

function toFetchEventByIdSearchParams(
  params: Extract<z.output<typeof FetchEventRequestSchema>, { id: string }>,
): URLSearchParams {
  return toSearchParams(
    {
      includeBestLines: params.includeBestLines,
      includeChat: params.includeChat,
      includeTemplate: params.includeTemplate,
      locale: params.locale,
    },
    snakeCase(),
  );
}

function toFetchEventBySlugSearchParams(
  params: Extract<z.output<typeof FetchEventRequestSchema>, { slug: string }>,
): URLSearchParams {
  return toSearchParams(
    {
      includeBestLines: params.includeBestLines,
      includeChat: params.includeChat,
      includeTemplate: params.includeTemplate,
      locale: params.locale,
    },
    snakeCase(),
  );
}
