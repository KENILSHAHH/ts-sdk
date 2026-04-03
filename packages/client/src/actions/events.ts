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
import { type SearchParamPrimitive, toSearchParamValue } from './params';

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
  const searchParams = new URLSearchParams();

  const entries = [
    ['ascending', params.ascending],
    ['closed', params.closed],
    ['cyom', params.cyom],
    ['end_date_max', params.endDateMax],
    ['end_date_min', params.endDateMin],
    ['event_date', params.eventDate],
    ['event_week', params.eventWeek],
    ['exclude_tag_id', params.excludeTagIds],
    ['featured', params.featured],
    ['featured_order', params.featuredOrder],
    ['game_id', params.gameIds],
    ['id', params.ids],
    ['include_best_lines', params.includeBestLines],
    ['include_chat', params.includeChat],
    ['include_children', params.includeChildren],
    ['include_template', params.includeTemplate],
    ['limit', params.limit],
    ['liquidity_max', params.liquidityMax],
    ['liquidity_min', params.liquidityMin],
    ['live', params.live],
    ['locale', params.locale],
    ['offset', params.offset],
    ['order', params.order],
    ['parent_event_id', params.parentEventId],
    ['recurrence', params.recurrence],
    ['related_tags', params.relatedTags],
    ['series_id', params.seriesIds],
    ['slug', params.slug],
    ['start_date_max', params.startDateMax],
    ['start_date_min', params.startDateMin],
    ['start_time_max', params.startTimeMax],
    ['start_time_min', params.startTimeMin],
    ['tag_id', params.tagIds],
    ['tag_match', params.tagMatch],
    ['tag_slug', params.tagSlug],
    ['volume_max', params.volumeMax],
    ['volume_min', params.volumeMin],
  ] as const satisfies ReadonlyArray<
    readonly [
      string,
      SearchParamPrimitive | readonly SearchParamPrimitive[] | undefined,
    ]
  >;

  for (const [key, value] of entries) {
    if (value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        searchParams.append(key, toSearchParamValue(item));
      }

      continue;
    }

    searchParams.append(key, toSearchParamValue(value));
  }

  return searchParams;
}
