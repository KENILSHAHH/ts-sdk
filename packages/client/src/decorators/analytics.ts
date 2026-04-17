import {
  listBuilderLeaderboard,
  listBuilderTrades,
  listBuilderVolume,
  listTraderLeaderboard,
} from '../actions';
import type { Client, PublicClient, SecureClient } from '../clients';
import {
  type BindActionParameters,
  type BindActionResult,
  bindAction,
} from './shared';

export type AnalyticsActions = {
  /**
   * Lists builder-attributed trades.
   *
   * @throws {@link ListBuilderTradesError}
   * Thrown on failure.
   *
   * @example
   * ```ts
   * const result = client.listBuilderTrades();
   * ```
   */
  listBuilderTrades(
    ...args: BindActionParameters<typeof listBuilderTrades>
  ): BindActionResult<typeof listBuilderTrades>;

  /**
   * Lists builder leaderboard rankings.
   *
   * @throws {@link ListBuilderLeaderboardError}
   * Thrown on failure.
   *
   * @example
   * ```ts
   * const result = client.listBuilderLeaderboard({
   *   pageSize: 10,
   *   timePeriod: 'DAY',
   * });
   * ```
   */
  listBuilderLeaderboard(
    ...args: BindActionParameters<typeof listBuilderLeaderboard>
  ): BindActionResult<typeof listBuilderLeaderboard>;

  /**
   * Lists daily builder volume entries.
   *
   * @throws {@link ListBuilderVolumeError}
   * Thrown on failure.
   *
   * @example
   * ```ts
   * const volume = await client.listBuilderVolume({
   *   timePeriod: 'DAY',
   * });
   * ```
   */
  listBuilderVolume(
    ...args: BindActionParameters<typeof listBuilderVolume>
  ): BindActionResult<typeof listBuilderVolume>;

  /**
   * Lists trader leaderboard rankings.
   *
   * @throws {@link ListTraderLeaderboardError}
   * Thrown on failure.
   *
   * @example
   * ```ts
   * const result = client.listTraderLeaderboard({
   *   orderBy: 'PNL',
   *   pageSize: 10,
   *   timePeriod: 'DAY',
   * });
   * ```
   */
  listTraderLeaderboard(
    ...args: BindActionParameters<typeof listTraderLeaderboard>
  ): BindActionResult<typeof listTraderLeaderboard>;
};

export function analyticsActions(client: PublicClient): AnalyticsActions;
export function analyticsActions(client: SecureClient): AnalyticsActions;
export function analyticsActions(client: Client): AnalyticsActions {
  return {
    listBuilderTrades: bindAction(client, listBuilderTrades),
    listBuilderLeaderboard: bindAction(client, listBuilderLeaderboard),
    listBuilderVolume: bindAction(client, listBuilderVolume),
    listTraderLeaderboard: bindAction(client, listTraderLeaderboard),
  };
}
