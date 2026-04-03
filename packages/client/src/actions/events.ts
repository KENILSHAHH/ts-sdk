import {
  type Event,
  ISOCalendarDateSchema,
  ISODateStringSchema,
  ListEventsResponseSchema,
} from '@polymarket/bindings';
import { unwrap } from '@polymarket/types';
import { z } from 'zod';
import { parseUserInput } from '../input';
import type { PolymarketClient } from '../PolymarketClient';
import { type SearchParamMappings, toSearchParams } from './params';

const EventsRequestSchema = z.object({
  ascending: z.boolean().optional(),
  closed: z.boolean().optional(),
  cyom: z.boolean().optional(),
  endDateMax: ISODateStringSchema.optional(),
  endDateMin: ISODateStringSchema.optional(),
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
  recurrence: z.enum(['daily', 'weekly', 'monthly']).optional(),
  relatedTags: z.boolean().optional(),
  seriesIds: z.array(z.string()).optional(),
  slug: z.array(z.string()).optional(),
  startDateMax: ISODateStringSchema.optional(),
  startDateMin: ISODateStringSchema.optional(),
  startTimeMax: ISODateStringSchema.optional(),
  startTimeMin: ISODateStringSchema.optional(),
  tagIds: z.array(z.number().int()).optional(),
  tagMatch: z.enum(['any', 'all']).optional(),
  tagSlug: z.string().optional(),
  volumeMax: z.number().optional(),
  volumeMin: z.number().optional(),
});

export type EventsRequest = z.input<typeof EventsRequestSchema>;

type EventsParams = z.output<typeof EventsRequestSchema>;

const EVENTS_SEARCH_PARAM_MAPPINGS = {
  ascending: 'ascending',
  closed: 'closed',
  cyom: 'cyom',
  endDateMax: 'end_date_max',
  endDateMin: 'end_date_min',
  eventDate: 'event_date',
  eventWeek: 'event_week',
  excludeTagIds: 'exclude_tag_id',
  featured: 'featured',
  featuredOrder: 'featured_order',
  gameIds: 'game_id',
  ids: 'id',
  includeBestLines: 'include_best_lines',
  includeChat: 'include_chat',
  includeChildren: 'include_children',
  includeTemplate: 'include_template',
  limit: 'limit',
  liquidityMax: 'liquidity_max',
  liquidityMin: 'liquidity_min',
  live: 'live',
  locale: 'locale',
  offset: 'offset',
  order: 'order',
  parentEventId: 'parent_event_id',
  recurrence: 'recurrence',
  relatedTags: 'related_tags',
  seriesIds: 'series_id',
  slug: 'slug',
  startDateMax: 'start_date_max',
  startDateMin: 'start_date_min',
  startTimeMax: 'start_time_max',
  startTimeMin: 'start_time_min',
  tagIds: 'tag_id',
  tagMatch: 'tag_match',
  tagSlug: 'tag_slug',
  volumeMax: 'volume_max',
  volumeMin: 'volume_min',
} satisfies SearchParamMappings<EventsParams>;

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
  request: EventsRequest = {},
): Promise<Event[]> {
  const params = parseUserInput(request, EventsRequestSchema);

  return unwrap(
    client.gamma.get('events', {
      schema: ListEventsResponseSchema,
      searchParams: toEventsSearchParams(params),
    }),
  );
}

function toEventsSearchParams(params: EventsParams): URLSearchParams {
  return toSearchParams(params, EVENTS_SEARCH_PARAM_MAPPINGS);
}
