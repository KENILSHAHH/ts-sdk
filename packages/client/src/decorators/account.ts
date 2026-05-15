import type {
  ClobTrade,
  NotificationsResponse,
} from '@polymarket/bindings/clob';
import type {
  Activity,
  ClosedPosition,
  MetaMarketPosition,
  Position,
  Traded,
  Value,
} from '@polymarket/bindings/data';
import type { Prettify } from '@polymarket/types';
import {
  type DownloadAccountingSnapshotRequest,
  type DropNotificationsRequest,
  downloadAccountingSnapshot,
  dropNotifications,
  type FetchPortfolioValueRequest,
  type FetchTradedMarketCountRequest,
  fetchClosedOnlyMode,
  fetchNotifications,
  fetchPortfolioValue,
  fetchTradedMarketCount,
  type ListAccountTradesRequest,
  type ListActivityRequest,
  type ListClosedPositionsRequest,
  type ListMarketPositionsRequest,
  type ListPositionsRequest,
  listAccountTrades,
  listActivity,
  listClosedPositions,
  listMarketPositions,
  listPositions,
} from '../actions';
import type {
  BaseClient,
  BasePublicClient,
  BaseSecureClient,
} from '../clients';
import type { Paginated } from '../pagination';

type DefaultAccountWallet<TRequest extends { user: string }> = Prettify<
  Omit<TRequest, 'user'> & {
    /**
     * Wallet address to use.
     *
     * @defaultValue `client.account.wallet`
     */
    user?: TRequest['user'];
  }
>;

export type SecureListPositionsRequest =
  DefaultAccountWallet<ListPositionsRequest>;
export type SecureListClosedPositionsRequest =
  DefaultAccountWallet<ListClosedPositionsRequest>;
export type SecureFetchPortfolioValueRequest =
  DefaultAccountWallet<FetchPortfolioValueRequest>;
export type SecureFetchTradedMarketCountRequest =
  DefaultAccountWallet<FetchTradedMarketCountRequest>;
export type SecureDownloadAccountingSnapshotRequest =
  DefaultAccountWallet<DownloadAccountingSnapshotRequest>;
export type SecureListActivityRequest =
  DefaultAccountWallet<ListActivityRequest>;

type CommonAccountActions = {
  /**
   * Lists positions for a market.
   *
   * @throws {@link ListMarketPositionsError}
   * Thrown on failure.
   *
   * @example
   * Fetch the first page of results:
   * ```ts
   * const paginator = client.listMarketPositions({
   *   market: '0xe546672750517f62c45a5a00067481981e62b9c20fa8220203232c9dc8fd2093',
   *   pageSize: 10,
   * });
   *
   * const firstPage = await paginator.firstPage();
   *
   * // Optionally, fetch additional pages:
   * for await (const page of paginator.from(firstPage.nextCursor)) {
   *   // page.items: MetaMarketPosition[]
   * }
   * ```
   *
   * @example
   * Loop through all pages with `for await`:
   * ```ts
   * const paginator = client.listMarketPositions({
   *   market: '0xe546672750517f62c45a5a00067481981e62b9c20fa8220203232c9dc8fd2093',
   *   pageSize: 10,
   * });
   *
   * for await (const page of paginator) {
   *   // page.items: MetaMarketPosition[]
   * }
   * ```
   */
  listMarketPositions(
    request: ListMarketPositionsRequest,
  ): Paginated<MetaMarketPosition[]>;
};

export type PublicAccountActions = Prettify<
  CommonAccountActions & {
    /**
     * Lists current positions for a wallet.
     *
     * @throws {@link ListPositionsError}
     * Thrown on failure.
     *
     * @example
     * Fetch the first page of results:
     * ```ts
     * const paginator = client.listPositions({
     *   user: '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b',
     *   pageSize: 10,
     * });
     *
     * const firstPage = await paginator.firstPage();
     *
     * // Optionally, fetch additional pages:
     * for await (const page of paginator.from(firstPage.nextCursor)) {
     *   // page.items: Position[]
     * }
     * ```
     *
     * @example
     * Loop through all pages with `for await`:
     * ```ts
     * const paginator = client.listPositions({
     *   user: '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b',
     *   pageSize: 10,
     * });
     *
     * for await (const page of paginator) {
     *   // page.items: Position[]
     * }
     * ```
     */
    listPositions(request: ListPositionsRequest): Paginated<Position[]>;
    /**
     * Lists closed positions for a wallet.
     *
     * @throws {@link ListClosedPositionsError}
     * Thrown on failure.
     *
     * @example
     * Fetch the first page of results:
     * ```ts
     * const paginator = client.listClosedPositions({
     *   user: '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b',
     *   pageSize: 10,
     * });
     *
     * const firstPage = await paginator.firstPage();
     *
     * // Optionally, fetch additional pages:
     * for await (const page of paginator.from(firstPage.nextCursor)) {
     *   // page.items: ClosedPosition[]
     * }
     * ```
     *
     * @example
     * Loop through all pages with `for await`:
     * ```ts
     * const paginator = client.listClosedPositions({
     *   user: '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b',
     *   pageSize: 10,
     * });
     *
     * for await (const page of paginator) {
     *   // page.items: ClosedPosition[]
     * }
     * ```
     */
    listClosedPositions(
      request: ListClosedPositionsRequest,
    ): Paginated<ClosedPosition[]>;
    /**
     * Fetches the total value for a wallet's positions.
     *
     * @throws {@link FetchPortfolioValueError}
     * Thrown on failure.
     *
     * @example
     * ```ts
     * const value = await client.fetchPortfolioValue({
     *   user: '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b',
     * });
     * ```
     */
    fetchPortfolioValue(request: FetchPortfolioValueRequest): Promise<Value[]>;
    /**
     * Fetches the total number of markets a wallet has traded.
     *
     * @throws {@link FetchTradedMarketCountError}
     * Thrown on failure.
     *
     * @example
     * ```ts
     * const traded = await client.fetchTradedMarketCount({
     *   user: '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b',
     * });
     * ```
     */
    fetchTradedMarketCount(
      request: FetchTradedMarketCountRequest,
    ): Promise<Traded>;
    /**
     * Downloads an accounting snapshot archive for a wallet.
     *
     * @throws {@link DownloadAccountingSnapshotError}
     * Thrown on failure.
     *
     * @example
     * ```ts
     * const snapshot = await client.downloadAccountingSnapshot({
     *   user: '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b',
     * });
     * ```
     */
    downloadAccountingSnapshot(
      request: DownloadAccountingSnapshotRequest,
    ): Promise<Blob>;
    /**
     * Lists wallet activity.
     *
     * @throws {@link ListActivityError}
     * Thrown on failure.
     *
     * @example
     * Fetch the first page of results:
     * ```ts
     * const paginator = client.listActivity({
     *   user: '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b',
     *   pageSize: 10,
     * });
     *
     * const firstPage = await paginator.firstPage();
     *
     * // Optionally, fetch additional pages:
     * for await (const page of paginator.from(firstPage.nextCursor)) {
     *   // page.items: Activity[]
     * }
     * ```
     *
     * @example
     * Loop through all pages with `for await`:
     * ```ts
     * const paginator = client.listActivity({
     *   user: '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b',
     *   pageSize: 10,
     * });
     *
     * for await (const page of paginator) {
     *   // page.items: Activity[]
     * }
     * ```
     */
    listActivity(request: ListActivityRequest): Paginated<Activity[]>;
  }
>;

export type SecureAccountActions = Prettify<
  CommonAccountActions & {
    /**
     * Lists current positions for a wallet.
     *
     * Defaults to the authenticated account's wallet when `user` is omitted.
     *
     * @throws {@link ListPositionsError}
     * Thrown on failure.
     *
     * @example
     * Fetch the first page of results for the authenticated account:
     * ```ts
     * const paginator = client.listPositions({
     *   pageSize: 10,
     * });
     *
     * const firstPage = await paginator.firstPage();
     * ```
     */
    listPositions(request?: SecureListPositionsRequest): Paginated<Position[]>;
    /**
     * Lists closed positions for a wallet.
     *
     * Defaults to the authenticated account's wallet when `user` is omitted.
     *
     * @throws {@link ListClosedPositionsError}
     * Thrown on failure.
     */
    listClosedPositions(
      request?: SecureListClosedPositionsRequest,
    ): Paginated<ClosedPosition[]>;
    /**
     * Fetches the total value for a wallet's positions.
     *
     * Defaults to the authenticated account's wallet when `user` is omitted.
     *
     * @throws {@link FetchPortfolioValueError}
     * Thrown on failure.
     */
    fetchPortfolioValue(
      request?: SecureFetchPortfolioValueRequest,
    ): Promise<Value[]>;
    /**
     * Fetches the total number of markets a wallet has traded.
     *
     * Defaults to the authenticated account's wallet when `user` is omitted.
     *
     * @throws {@link FetchTradedMarketCountError}
     * Thrown on failure.
     */
    fetchTradedMarketCount(
      request?: SecureFetchTradedMarketCountRequest,
    ): Promise<Traded>;
    /**
     * Downloads an accounting snapshot archive for a wallet.
     *
     * Defaults to the authenticated account's wallet when `user` is omitted.
     *
     * @throws {@link DownloadAccountingSnapshotError}
     * Thrown on failure.
     */
    downloadAccountingSnapshot(
      request?: SecureDownloadAccountingSnapshotRequest,
    ): Promise<Blob>;
    /**
     * Lists wallet activity.
     *
     * Defaults to the authenticated account's wallet when `user` is omitted.
     *
     * @throws {@link ListActivityError}
     * Thrown on failure.
     */
    listActivity(request?: SecureListActivityRequest): Paginated<Activity[]>;
    /**
     * Lists trades for the authenticated account across all pages.
     *
     * @throws {@link ListAccountTradesError}
     * Thrown on failure.
     *
     * @example
     * Fetch the first page of results:
     * ```ts
     * const paginator = client.listAccountTrades({
     *   market: '0x0000000000000000000000000000000000000000000000000000000000000001',
     * });
     *
     * const firstPage = await paginator.firstPage();
     *
     * // Optionally, fetch additional pages:
     * for await (const page of paginator.from(firstPage.nextCursor)) {
     *   // page.items: ClobTrade[]
     * }
     * ```
     *
     * @example
     * Loop through all pages with `for await`:
     * ```ts
     * const paginator = client.listAccountTrades({
     *   market: '0x0000000000000000000000000000000000000000000000000000000000000001',
     * });
     *
     * for await (const page of paginator) {
     *   // page.items: ClobTrade[]
     * }
     * ```
     */
    listAccountTrades(
      request?: ListAccountTradesRequest,
    ): Paginated<ClobTrade[]>;
    /**
     * Fetches notifications for the authenticated account.
     *
     * @throws {@link FetchNotificationsError}
     * Thrown on failure.
     *
     * @example
     * ```ts
     * const notifications = await client.fetchNotifications();
     * ```
     */
    fetchNotifications(): Promise<NotificationsResponse>;
    /**
     * Drops notifications for the authenticated account.
     *
     * @throws {@link DropNotificationsError}
     * Thrown on failure.
     *
     * @example
     * ```ts
     * await client.dropNotifications({
     *   ids: ['1', '2'],
     * });
     * ```
     */
    dropNotifications(request: DropNotificationsRequest): Promise<void>;
    /**
     * Fetches whether the account is restricted to closed-only trading.
     *
     * @throws {@link FetchClosedOnlyModeError}
     * Thrown on failure.
     *
     * @example
     * ```ts
     * const closedOnly = await client.fetchClosedOnlyMode();
     * ```
     */
    fetchClosedOnlyMode(): Promise<boolean>;
  }
>;

function publicAccountActions(client: BaseClient): PublicAccountActions {
  return {
    listPositions: listPositions.bind(null, client),
    listClosedPositions: listClosedPositions.bind(null, client),
    fetchPortfolioValue: fetchPortfolioValue.bind(null, client),
    fetchTradedMarketCount: fetchTradedMarketCount.bind(null, client),
    downloadAccountingSnapshot: downloadAccountingSnapshot.bind(null, client),
    listMarketPositions: listMarketPositions.bind(null, client),
    listActivity: listActivity.bind(null, client),
  };
}

function withAccountWallet<TRequest extends { user?: string }>(
  client: BaseSecureClient,
  request: TRequest = {} as TRequest,
): Omit<TRequest, 'user'> & { user: string } {
  return {
    ...request,
    user: request.user ?? client.account.wallet,
  };
}

export function accountActions(client: BasePublicClient): PublicAccountActions;
export function accountActions(client: BaseSecureClient): SecureAccountActions;
export function accountActions(
  client: BaseClient,
): PublicAccountActions | SecureAccountActions {
  const actions = publicAccountActions(client);

  if (client.isPublicClient()) {
    return actions;
  }

  return {
    ...actions,
    listPositions: (request?: SecureListPositionsRequest) =>
      listPositions(client, withAccountWallet(client, request)),
    listClosedPositions: (request?: SecureListClosedPositionsRequest) =>
      listClosedPositions(client, withAccountWallet(client, request)),
    fetchPortfolioValue: (request?: SecureFetchPortfolioValueRequest) =>
      fetchPortfolioValue(client, withAccountWallet(client, request)),
    fetchTradedMarketCount: (request?: SecureFetchTradedMarketCountRequest) =>
      fetchTradedMarketCount(client, withAccountWallet(client, request)),
    downloadAccountingSnapshot: (
      request?: SecureDownloadAccountingSnapshotRequest,
    ) => downloadAccountingSnapshot(client, withAccountWallet(client, request)),
    listActivity: (request?: SecureListActivityRequest) =>
      listActivity(client, withAccountWallet(client, request)),
    listAccountTrades: listAccountTrades.bind(null, client),
    fetchNotifications: fetchNotifications.bind(null, client),
    dropNotifications: dropNotifications.bind(null, client),
    fetchClosedOnlyMode: fetchClosedOnlyMode.bind(null, client),
  };
}

// Error unions and runtime `isError` guards for every action bound above.
// Surfaced at the root entry point through `export * from './decorators'`.
// Keep this list in sync with the methods on PublicAccountActions / SecureAccountActions.
export {
  DownloadAccountingSnapshotError,
  DropNotificationsError,
  FetchClosedOnlyModeError,
  FetchNotificationsError,
  FetchPortfolioValueError,
  FetchTradedMarketCountError,
  ListAccountTradesError,
  ListActivityError,
  ListClosedPositionsError,
  ListMarketPositionsError,
  ListPositionsError,
} from '../actions';
