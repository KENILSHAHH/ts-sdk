import {
  type Activity,
  ActivityTypeSchema,
  ListActivityResponseSchema,
  ListTradesResponseSchema,
  SideSchema,
  type Trade,
} from '@polymarket/bindings/data';
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
import { toDataSearchParams } from './params';

const ActivitySortBySchema = z.enum(['TIMESTAMP', 'TOKENS', 'CASH']);
const SortDirectionSchema = z.enum(['ASC', 'DESC']);
const TradeFilterTypeSchema = z.enum(['CASH', 'TOKENS']);

const ListTradesRequestSchema = z
  .object({
    limit: z.number().int().optional(),
    offset: z.number().int().optional(),
    takerOnly: z.boolean().optional(),
    filterType: TradeFilterTypeSchema.optional(),
    filterAmount: z.number().optional(),
    market: z.array(z.string()).optional(),
    eventId: z.array(z.number().int()).optional(),
    user: z.string().optional(),
    side: SideSchema.optional(),
  })
  .refine((value) => !(value.market && value.eventId), {
    message: 'Provide market or eventId, not both',
    path: ['eventId'],
  })
  .refine(
    (value) =>
      (value.filterType === undefined) === (value.filterAmount === undefined),
    {
      message: 'Provide filterType and filterAmount together',
      path: ['filterAmount'],
    },
  );

const ListActivityRequestSchema = z
  .object({
    limit: z.number().int().optional(),
    offset: z.number().int().optional(),
    user: z.string(),
    market: z.array(z.string()).optional(),
    eventId: z.array(z.number().int()).optional(),
    type: z.array(ActivityTypeSchema).optional(),
    start: z.number().int().optional(),
    end: z.number().int().optional(),
    sortBy: ActivitySortBySchema.optional(),
    sortDirection: SortDirectionSchema.optional(),
    side: SideSchema.optional(),
  })
  .refine((value) => !(value.market && value.eventId), {
    message: 'Provide market or eventId, not both',
    path: ['eventId'],
  });

export type ListTradesRequest = z.input<typeof ListTradesRequestSchema>;
export type ListActivityRequest = z.input<typeof ListActivityRequestSchema>;

export type ListTradesError =
  | RateLimitError
  | RequestRejectedError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;

/**
 * Lists trades for a wallet, market, or event.
 *
 * @throws {@link ListTradesError}
 * Thrown when the request is invalid, rejected, rate limited, interrupted by transport issues, or returns an unexpected response.
 *
 * @example
 * ```ts
 * const trades = await listTrades(client, {
 *   user: '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b',
 *   limit: 10,
 * });
 *
 * // trades === Trade[]
 * ```
 */
export async function listTrades(
  client: Client,
  request: ListTradesRequest = {},
): Promise<Trade[]> {
  const params = parseUserInput(request, ListTradesRequestSchema);

  return unwrap(
    client.data
      .get('/trades', {
        params: toDataSearchParams(params),
      })
      .andThen(validateWith(ListTradesResponseSchema)),
  );
}

export type ListActivityError =
  | RateLimitError
  | RequestRejectedError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;

/**
 * Lists wallet activity.
 *
 * @throws {@link ListActivityError}
 * Thrown when the request is invalid, rejected, rate limited, interrupted by transport issues, or returns an unexpected response.
 *
 * @example
 * ```ts
 * const activity = await listActivity(client, {
 *   user: '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b',
 *   limit: 10,
 * });
 *
 * // activity === Activity[]
 * ```
 */
export async function listActivity(
  client: Client,
  request: ListActivityRequest,
): Promise<Activity[]> {
  const params = parseUserInput(request, ListActivityRequestSchema);

  return unwrap(
    client.data
      .get('/activity', {
        params: toDataSearchParams(params),
      })
      .andThen(validateWith(ListActivityResponseSchema)),
  );
}
