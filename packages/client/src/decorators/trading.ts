import type {
  CancelOrdersResponse,
  OpenOrder,
  OrderResponse,
  OrderResponses,
} from '@polymarket/bindings/clob';
import type { OrderWorkflow } from '../actions';
import {
  type CancelMarketOrdersRequest,
  type CancelOrderRequest,
  type CancelOrdersRequest,
  cancelAll,
  cancelMarketOrders,
  cancelOrder,
  cancelOrders,
  type FetchOrderRequest,
  fetchOrder,
  type ListOpenOrdersRequest,
  listOpenOrders,
  type OrderPostingWorkflow,
  type PostOrdersRequest,
  type PrepareLimitOrderRequest,
  type PrepareMarketOrderRequest,
  postOrder,
  postOrders,
  prepareLimitOrder,
  prepareLimitOrderPosting,
  prepareMarketOrder,
  prepareMarketOrderPosting,
} from '../actions';
import type { SignedOrder } from '../actions/orders';
import type { BaseSecureClient } from '../clients';
import type { Paginated } from '../pagination';

export type TradingActions = {
  /**
   * Starts the market-order workflow.
   *
   * @throws {@link PrepareMarketOrderError}
   * Thrown on failure.
   *
   * @example
   * ```ts
   * const order = await client.prepareMarketOrder({
   *   amount: 10,
   *   side: OrderSide.BUY,
   *   tokenId: '123',
   * }).then(completeWith(wallet));
   *
   * const response = await client.postOrder(order);
   *
   * // response: OrderResponse
   * ```
   */
  prepareMarketOrder(
    request: PrepareMarketOrderRequest,
  ): Promise<OrderWorkflow>;
  /**
   * Starts and posts a market-order workflow.
   *
   * @throws {@link PrepareMarketOrderPostingError}
   * Thrown on failure.
   *
   * @example
   * ```ts
   * const response = await client.prepareMarketOrderPosting({
   *   amount: 10,
   *   side: OrderSide.BUY,
   *   tokenId: '123',
   * }).then(completeWith(wallet));
   *
   * // response: OrderResponse
   * ```
   */
  prepareMarketOrderPosting(
    request: PrepareMarketOrderRequest,
  ): Promise<OrderPostingWorkflow>;
  /**
   * Starts the limit-order workflow.
   *
   * @throws {@link PrepareLimitOrderError}
   * Thrown on failure.
   *
   * @example
   * ```ts
   * const order = await client.prepareLimitOrder({
   *   postOnly: true,
   *   price: 0.52,
   *   side: OrderSide.BUY,
   *   size: 10,
   *   tokenId: '123',
   * }).then(completeWith(wallet));
   *
   * const response = await client.postOrder(order);
   *
   * // response: OrderResponse
   * ```
   */
  prepareLimitOrder(request: PrepareLimitOrderRequest): Promise<OrderWorkflow>;
  /**
   * Starts and posts a limit-order workflow.
   *
   * @throws {@link PrepareLimitOrderPostingError}
   * Thrown on failure.
   *
   * @example
   * ```ts
   * const response = await client.prepareLimitOrderPosting({
   *   postOnly: true,
   *   price: 0.52,
   *   side: OrderSide.BUY,
   *   size: 10,
   *   tokenId: '123',
   * }).then(completeWith(wallet));
   *
   * // response: OrderResponse
   * ```
   */
  prepareLimitOrderPosting(
    request: PrepareLimitOrderRequest,
  ): Promise<OrderPostingWorkflow>;
  /**
   * Posts a signed order for the authenticated account.
   *
   * @throws {@link PostOrderError}
   * Thrown on failure.
   *
   * @example
   * ```ts
   * const response = await client.postOrder(signedOrder);
   * ```
   */
  postOrder(order: SignedOrder): Promise<OrderResponse>;
  /**
   * Posts multiple signed orders for the authenticated account.
   *
   * @remarks
   * Accepts between 1 and 15 orders, matching the current service limit.
   *
   * @throws {@link PostOrdersError}
   * Thrown on failure.
   *
   * @example
   * ```ts
   * const responses = await client.postOrders([firstSignedOrder, secondSignedOrder]);
   * ```
   */
  postOrders(orders: PostOrdersRequest): Promise<OrderResponses>;
  /**
   * Cancels a single open order for the authenticated account.
   *
   * @throws {@link CancelOrderError}
   * Thrown on failure.
   *
   * @example
   * ```ts
   * const response = await client.cancelOrder({ orderId: '123' });
   *
   * // response.canceled: string[]
   * ```
   */
  cancelOrder(request: CancelOrderRequest): Promise<CancelOrdersResponse>;
  /**
   * Cancels multiple open orders for the authenticated account.
   *
   * @throws {@link CancelOrdersError}
   * Thrown on failure.
   *
   * @example
   * ```ts
   * const response = await client.cancelOrders({ orderIds: ['1', '2'] });
   *
   * // response.canceled: string[]
   * ```
   */
  cancelOrders(request: CancelOrdersRequest): Promise<CancelOrdersResponse>;
  /**
   * Cancels all open orders for the authenticated account.
   *
   * @throws {@link CancelAllError}
   * Thrown on failure.
   *
   * @example
   * ```ts
   * const response = await client.cancelAll();
   *
   * // response.canceled: string[]
   * ```
   */
  cancelAll(): Promise<CancelOrdersResponse>;
  /**
   * Cancels all open orders for the authenticated account that match the market or asset filter.
   *
   * @throws {@link CancelMarketOrdersError}
   * Thrown on failure.
   *
   * @example
   * ```ts
   * const response = await client.cancelMarketOrders({
   *   market: '0x0000000000000000000000000000000000000000000000000000000000000001',
   * });
   *
   * // response.canceled: string[]
   * ```
   */
  cancelMarketOrders(
    request: CancelMarketOrdersRequest,
  ): Promise<CancelOrdersResponse>;
  /**
   * Lists open orders for the authenticated account across all pages.
   *
   * @throws {@link ListOpenOrdersError}
   * Thrown on failure.
   *
   * @example
   * Fetch the first page of results:
   * ```ts
   * const paginator = client.listOpenOrders({
   *   market: '0x0000000000000000000000000000000000000000000000000000000000000001',
   * });
   *
   * const firstPage = await paginator.firstPage();
   *
   * // Optionally, fetch additional pages:
   * for await (const page of paginator.from(firstPage.nextCursor)) {
   *   // page.items: OpenOrder[]
   * }
   * ```
   *
   * @example
   * Loop through all pages with `for await`:
   * ```ts
   * const paginator = client.listOpenOrders({
   *   market: '0x0000000000000000000000000000000000000000000000000000000000000001',
   * });
   *
   * for await (const page of paginator) {
   *   // page.items: OpenOrder[]
   * }
   * ```
   */
  listOpenOrders(request?: ListOpenOrdersRequest): Paginated<OpenOrder>;
  /**
   * Fetches a single order for the authenticated account.
   *
   * @throws {@link FetchOrderError}
   * Thrown on failure.
   *
   * @example
   * ```ts
   * const order = await client.fetchOrder({ orderId: '123' });
   * ```
   */
  fetchOrder(request: FetchOrderRequest): Promise<OpenOrder>;
};

export function tradingActions(client: BaseSecureClient): TradingActions;
export function tradingActions(client: BaseSecureClient): TradingActions {
  return {
    prepareMarketOrder: prepareMarketOrder.bind(null, client),
    prepareMarketOrderPosting: prepareMarketOrderPosting.bind(null, client),
    prepareLimitOrder: prepareLimitOrder.bind(null, client),
    prepareLimitOrderPosting: prepareLimitOrderPosting.bind(null, client),
    postOrder: postOrder(client),
    postOrders: postOrders(client),
    cancelOrder: cancelOrder.bind(null, client),
    cancelOrders: cancelOrders.bind(null, client),
    cancelAll: cancelAll.bind(null, client),
    cancelMarketOrders: cancelMarketOrders.bind(null, client),
    listOpenOrders: listOpenOrders.bind(null, client),
    fetchOrder: fetchOrder.bind(null, client),
  };
}
