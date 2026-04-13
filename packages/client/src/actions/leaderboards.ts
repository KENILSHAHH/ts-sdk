import {
  type BuilderVolumeEntry,
  LeaderboardCategorySchema,
  type LeaderboardEntry,
  LeaderboardOrderBySchema,
  ListBuilderLeaderboardResponseSchema,
  ListBuilderVolumeResponseSchema,
  ListTraderLeaderboardResponseSchema,
  TimePeriodSchema,
  type TraderLeaderboardEntry,
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

const ListBuilderLeaderboardRequestSchema = z.object({
  timePeriod: TimePeriodSchema.optional(),
  limit: z.number().int().optional(),
  offset: z.number().int().optional(),
});

const ListBuilderVolumeRequestSchema = z.object({
  timePeriod: TimePeriodSchema.optional(),
});

const ListTraderLeaderboardRequestSchema = z.object({
  category: LeaderboardCategorySchema.optional(),
  timePeriod: TimePeriodSchema.optional(),
  orderBy: LeaderboardOrderBySchema.optional(),
  limit: z.number().int().optional(),
  offset: z.number().int().optional(),
  user: z.string().optional(),
  userName: z.string().optional(),
});

export type ListBuilderLeaderboardRequest = z.input<
  typeof ListBuilderLeaderboardRequestSchema
>;
export type ListBuilderVolumeRequest = z.input<
  typeof ListBuilderVolumeRequestSchema
>;
export type ListTraderLeaderboardRequest = z.input<
  typeof ListTraderLeaderboardRequestSchema
>;

export type ListBuilderLeaderboardError =
  | RateLimitError
  | RequestRejectedError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;

/**
 * Lists builder leaderboard rankings.
 *
 * @throws {@link ListBuilderLeaderboardError}
 * Thrown when the request is invalid, rejected, rate limited, interrupted by transport issues, or returns an unexpected response.
 *
 * @example
 * ```ts
 * const builders = await listBuilderLeaderboard(client, {
 *   limit: 10,
 *   timePeriod: 'DAY',
 * });
 *
 * // builders === LeaderboardEntry[]
 * ```
 */
export async function listBuilderLeaderboard(
  client: Client,
  request: ListBuilderLeaderboardRequest = {},
): Promise<LeaderboardEntry[]> {
  const params = parseUserInput(request, ListBuilderLeaderboardRequestSchema);

  return unwrap(
    client.data
      .get('/v1/builders/leaderboard', {
        params: toDataSearchParams(params),
      })
      .andThen(validateWith(ListBuilderLeaderboardResponseSchema)),
  );
}

export type ListBuilderVolumeError =
  | RateLimitError
  | RequestRejectedError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;

/**
 * Lists daily builder volume entries.
 *
 * @throws {@link ListBuilderVolumeError}
 * Thrown when the request is invalid, rejected, rate limited, interrupted by transport issues, or returns an unexpected response.
 *
 * @example
 * ```ts
 * const volume = await listBuilderVolume(client, {
 *   timePeriod: 'DAY',
 * });
 *
 * // volume === BuilderVolumeEntry[]
 * ```
 */
export async function listBuilderVolume(
  client: Client,
  request: ListBuilderVolumeRequest = {},
): Promise<BuilderVolumeEntry[]> {
  const params = parseUserInput(request, ListBuilderVolumeRequestSchema);

  return unwrap(
    client.data
      .get('/v1/builders/volume', {
        params: toDataSearchParams(params),
      })
      .andThen(validateWith(ListBuilderVolumeResponseSchema)),
  );
}

export type ListTraderLeaderboardError =
  | RateLimitError
  | RequestRejectedError
  | TransportError
  | UnexpectedResponseError
  | UserInputError;

/**
 * Lists trader leaderboard rankings.
 *
 * @throws {@link ListTraderLeaderboardError}
 * Thrown when the request is invalid, rejected, rate limited, interrupted by transport issues, or returns an unexpected response.
 *
 * @example
 * ```ts
 * const traders = await listTraderLeaderboard(client, {
 *   limit: 10,
 *   orderBy: 'PNL',
 *   timePeriod: 'DAY',
 * });
 *
 * // traders === TraderLeaderboardEntry[]
 * ```
 */
export async function listTraderLeaderboard(
  client: Client,
  request: ListTraderLeaderboardRequest = {},
): Promise<TraderLeaderboardEntry[]> {
  const params = parseUserInput(request, ListTraderLeaderboardRequestSchema);

  return unwrap(
    client.data
      .get('/v1/leaderboard', {
        params: toDataSearchParams(params),
      })
      .andThen(validateWith(ListTraderLeaderboardResponseSchema)),
  );
}
