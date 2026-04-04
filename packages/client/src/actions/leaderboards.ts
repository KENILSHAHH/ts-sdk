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
import { parseUserInput } from '../input';
import type { PolymarketClient } from '../PolymarketClient';
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

/**
 * Lists builder leaderboard rankings.
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
 * const builders = await listBuilderLeaderboard(client, {
 *   limit: 10,
 *   timePeriod: 'DAY',
 * });
 *
 * // builders === LeaderboardEntry[]
 * ```
 */
export async function listBuilderLeaderboard(
  client: PolymarketClient,
  request: ListBuilderLeaderboardRequest = {},
): Promise<LeaderboardEntry[]> {
  const params = parseUserInput(request, ListBuilderLeaderboardRequestSchema);

  return unwrap(
    client.data.get('v1/builders/leaderboard', {
      schema: ListBuilderLeaderboardResponseSchema,
      params: toDataSearchParams(params),
    }),
  );
}

/**
 * Lists daily builder volume entries.
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
 * const volume = await listBuilderVolume(client, {
 *   timePeriod: 'DAY',
 * });
 *
 * // volume === BuilderVolumeEntry[]
 * ```
 */
export async function listBuilderVolume(
  client: PolymarketClient,
  request: ListBuilderVolumeRequest = {},
): Promise<BuilderVolumeEntry[]> {
  const params = parseUserInput(request, ListBuilderVolumeRequestSchema);

  return unwrap(
    client.data.get('v1/builders/volume', {
      schema: ListBuilderVolumeResponseSchema,
      params: toDataSearchParams(params),
    }),
  );
}

/**
 * Lists trader leaderboard rankings.
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
  client: PolymarketClient,
  request: ListTraderLeaderboardRequest = {},
): Promise<TraderLeaderboardEntry[]> {
  const params = parseUserInput(request, ListTraderLeaderboardRequestSchema);

  return unwrap(
    client.data.get('v1/leaderboard', {
      schema: ListTraderLeaderboardResponseSchema,
      params: toDataSearchParams(params),
    }),
  );
}
