import {
  ISOCalendarDateSchema,
  ISODateStringSchema,
  PaginationCursorSchema,
} from '@polymarket/bindings';
import {
  FetchEventLiveVolumeResponseSchema,
  type LiveVolume,
} from '@polymarket/bindings/data';
import {
  type Event,
  EventSchema,
  FetchEventTagsResponseSchema,
  ListEventsKeysetResponseSchema,
  type TagReference,
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
import { PageSizeSchema, type Paginated, paginate } from '../pagination';
import { validateWith } from '../response';
import { snakeCase, toDataSearchParams, toSearchParams } from './params';

const ListEventsRequestSchema = z.object({
  ascending: z.boolean().optional(),
  closed: z.boolean().optional(),
  cursor: PaginationCursorSchema.optional(),
  pageSize: PageSizeSchema.optional(),
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
  liquidityMax: z.number().optional(),
  liquidityMin: z.number().optional(),
  live: z.boolean().optional(),
  locale: z.string().optional(),
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
  id: z.string(),
});

export type FetchEventLiveVolumeRequest = z.input<
  typeof FetchEventLiveVolumeRequestSchema
>;

type ListEventsParams = z.output<typeof ListEventsRequestSchema>;

export type ListEventsError =
  | RateLimitError
  | RequestRejectedError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;

/**
 * Lists events.
 *
 * @throws {@link ListEventsError}
 * Thrown on failure.
 *
 * @example
 * Fetch the first page of results:
 * ```ts
 * const result = listEvents(client, {
 *   closed: false,
 *   pageSize: 10,
 * });
 *
 * const firstPage = await result.first();
 *
 * // Optionally, fetch additional pages:
 * for await (const page of result.from(firstPage.nextCursor)) {
 *   // page.items: Event[]
 * }
 * ```
 *
 * @example
 * Loop through all pages with `for await`:
 * ```ts
 * const result = listEvents(client, {
 *   closed: false,
 *   pageSize: 10,
 * });
 *
 * for await (const page of result) {
 *   // page.items: Event[]
 * }
 * ```
 */
export function listEvents(
  client: Client,
  request: ListEventsRequest = {},
): Paginated<Event> {
  const params = parseUserInput(request, ListEventsRequestSchema);

  return paginate(
    (cursor) =>
      client.gamma
        .get('/events/keyset', {
          params: toEventsSearchParams({
            ...params,
            cursor: cursor ?? params.cursor,
          }),
        })
        .andThen(validateWith(ListEventsKeysetResponseSchema))
        .map((response) => ({
          items: response.items,
          hasMore: response.next_cursor !== undefined,
          nextCursor: response.next_cursor,
        })),
    params.cursor,
  );
}

export type FetchEventError =
  | RateLimitError
  | RequestRejectedError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;

/**
 * Fetches an event.
 *
 * @throws {@link FetchEventError}
 * Thrown on failure.
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
  client: Client,
  request: FetchEventRequest,
): Promise<Event> {
  const params = parseUserInput(request, FetchEventRequestSchema);

  if ('id' in params) {
    return unwrap(
      client.gamma
        .get(`events/${params.id}`, {
          params: toFetchEventByIdSearchParams(params),
        })
        .andThen(validateWith(EventSchema)),
    );
  }

  return unwrap(
    client.gamma
      .get(`events/slug/${params.slug}`, {
        params: toFetchEventBySlugSearchParams(params),
      })
      .andThen(validateWith(EventSchema)),
  );
}

export type FetchEventTagsError =
  | RateLimitError
  | RequestRejectedError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;

/**
 * Fetches an event's tags.
 *
 * @throws {@link FetchEventTagsError}
 * Thrown on failure.
 *
 * @example
 * ```ts
 * const tags = await fetchEventTags(client, {
 *   id: '12345',
 * });
 *
 * // tags: TagReference[]
 * ```
 */
export async function fetchEventTags(
  client: Client,
  request: FetchEventTagsRequest,
): Promise<TagReference[]> {
  const params = parseUserInput(request, FetchEventTagsRequestSchema);

  return unwrap(
    client.gamma
      .get(`events/${params.id}/tags`)
      .andThen(validateWith(FetchEventTagsResponseSchema)),
  );
}

export type FetchEventLiveVolumeError =
  | RateLimitError
  | RequestRejectedError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;

/**
 * Fetches live volume for an event.
 *
 * @throws {@link FetchEventLiveVolumeError}
 * Thrown on failure.
 *
 * @example
 * ```ts
 * const volume = await fetchEventLiveVolume(client, {
 *   id: '160707',
 * });
 *
 * // volume: LiveVolume[]
 * ```
 */
export async function fetchEventLiveVolume(
  client: Client,
  request: FetchEventLiveVolumeRequest,
): Promise<LiveVolume[]> {
  const params = parseUserInput(request, FetchEventLiveVolumeRequestSchema);

  return unwrap(
    client.data
      .get('/live-volume', {
        params: toDataSearchParams(params),
      })
      .andThen(validateWith(FetchEventLiveVolumeResponseSchema)),
  );
}

function toEventsSearchParams(params: ListEventsParams): URLSearchParams {
  return toSearchParams(
    params,
    snakeCase<ListEventsParams>({
      cursor: 'after_cursor',
      excludeTagIds: 'exclude_tag_id',
      gameIds: 'game_id',
      ids: 'id',
      pageSize: 'limit',
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
