import type { BuilderTrade } from '@polymarket/bindings/clob';
import type {
  BuilderVolumeEntry,
  LeaderboardEntry,
  TraderLeaderboardEntry,
} from '@polymarket/bindings/data';
import {
  fetchBuilderVolume,
  type ListBuilderLeaderboardRequest,
  type ListBuilderTradesRequest,
  type ListBuilderVolumeRequest,
  type ListTraderLeaderboardRequest,
  listBuilderLeaderboard,
  listBuilderTrades,
  listTraderLeaderboard,
} from '../actions';
import type {
  BaseClient,
  BasePublicClient,
  BaseSecureClient,
} from '../clients';
import type { Paginated } from '../pagination';

export type AnalyticsActions = {
  /**
   * Lists builder-attributed trades.
   *
   * @throws {@link ListBuilderTradesError}
   * Thrown on failure.
   *
   * @example
   * Fetch the first page of results:
   * ```ts
   * const paginator = client.listBuilderTrades({
   *   pageSize: 10,
   * });
   *
   * const firstPage = await paginator.firstPage();
   *
   * // Optionally, fetch additional pages:
   * for await (const page of paginator.from(firstPage.nextCursor)) {
   *   // page.items: BuilderTrade[]
   * }
   * ```
   *
   * @example
   * Loop through all pages with `for await`:
   * ```ts
   * const paginator = client.listBuilderTrades({
   *   pageSize: 10,
   * });
   *
   * for await (const page of paginator) {
   *   // page.items: BuilderTrade[]
   * }
   * ```
   */
  listBuilderTrades(
    request?: ListBuilderTradesRequest,
  ): Paginated<BuilderTrade>;

  /**
   * Lists builder leaderboard rankings.
   *
   * @throws {@link ListBuilderLeaderboardError}
   * Thrown on failure.
   *
   * @example
   * Fetch the first page of results:
   * ```ts
   * const paginator = client.listBuilderLeaderboard({
   *   pageSize: 10,
   *   timePeriod: 'DAY',
   * });
   *
   * const firstPage = await paginator.firstPage();
   *
   * // Optionally, fetch additional pages:
   * for await (const page of paginator.from(firstPage.nextCursor)) {
   *   // page.items: LeaderboardEntry[]
   * }
   * ```
   *
   * @example
   * Loop through all pages with `for await`:
   * ```ts
   * const paginator = client.listBuilderLeaderboard({
   *   pageSize: 10,
   *   timePeriod: 'DAY',
   * });
   *
   * for await (const page of paginator) {
   *   // page.items: LeaderboardEntry[]
   * }
   * ```
   */
  listBuilderLeaderboard(
    request?: ListBuilderLeaderboardRequest,
  ): Paginated<LeaderboardEntry>;

  /**
   * Lists daily builder volume entries.
   *
   * @throws {@link ListBuilderVolumeError}
   * Thrown on failure.
   *
   * @example
   * ```ts
   * const volume = await client.fetchBuilderVolume({
   *   timePeriod: 'DAY',
   * });
   * ```
   */
  fetchBuilderVolume(
    request?: ListBuilderVolumeRequest,
  ): Promise<BuilderVolumeEntry[]>;

  /**
   * Lists trader leaderboard rankings.
   *
   * @throws {@link ListTraderLeaderboardError}
   * Thrown on failure.
   *
   * @example
   * Fetch the first page of results:
   * ```ts
   * const paginator = client.listTraderLeaderboard({
   *   orderBy: 'PNL',
   *   pageSize: 10,
   *   timePeriod: 'DAY',
   * });
   *
   * const firstPage = await paginator.firstPage();
   *
   * // Optionally, fetch additional pages:
   * for await (const page of paginator.from(firstPage.nextCursor)) {
   *   // page.items: TraderLeaderboardEntry[]
   * }
   * ```
   *
   * @example
   * Loop through all pages with `for await`:
   * ```ts
   * const paginator = client.listTraderLeaderboard({
   *   orderBy: 'PNL',
   *   pageSize: 10,
   *   timePeriod: 'DAY',
   * });
   *
   * for await (const page of paginator) {
   *   // page.items: TraderLeaderboardEntry[]
   * }
   * ```
   */
  listTraderLeaderboard(
    request?: ListTraderLeaderboardRequest,
  ): Paginated<TraderLeaderboardEntry>;
};

export function analyticsActions(client: BasePublicClient): AnalyticsActions;
export function analyticsActions(client: BaseSecureClient): AnalyticsActions;
export function analyticsActions(client: BaseClient): AnalyticsActions {
  return {
    listBuilderTrades: listBuilderTrades.bind(null, client),
    listBuilderLeaderboard: listBuilderLeaderboard.bind(null, client),
    fetchBuilderVolume: fetchBuilderVolume.bind(null, client),
    listTraderLeaderboard: listTraderLeaderboard.bind(null, client),
  };
}

// Error unions and runtime `isError` guards for every action bound above.
// Surfaced at the root entry point through `export * from './decorators'`.
// Keep this list in sync with the methods on AnalyticsActions.
export {
  ListBuilderLeaderboardError,
  ListBuilderTradesError,
  ListBuilderVolumeError,
  ListTraderLeaderboardError,
} from '../actions';
