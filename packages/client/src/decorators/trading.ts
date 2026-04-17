import type { OrderResponse, OrderResponses } from '@polymarket/bindings/clob';
import {
  cancelAll,
  cancelMarketOrders,
  cancelOrder,
  cancelOrders,
  fetchOrder,
  listOpenOrders,
  type PostOrdersRequest,
  postOrder,
  postOrders,
  prepareLimitOrder,
  prepareMarketOrder,
} from '../actions';
import type { SignedOrder } from '../actions/orders';
import type { SecureClient } from '../clients';
import {
  type BindActionParameters,
  type BindActionResult,
  bindAction,
} from './shared';

type PostOrderMethod = {
  (order: SignedOrder): Promise<OrderResponse>;
  (): (order: SignedOrder) => Promise<OrderResponse>;
};

type PostOrdersMethod = {
  (orders: PostOrdersRequest): Promise<OrderResponses>;
  (): (orders: PostOrdersRequest) => Promise<OrderResponses>;
};

export type TradingActions = {
  /** Starts the market-order workflow. */
  prepareMarketOrder(
    ...args: BindActionParameters<typeof prepareMarketOrder>
  ): BindActionResult<typeof prepareMarketOrder>;
  /** Starts the limit-order workflow. */
  prepareLimitOrder(
    ...args: BindActionParameters<typeof prepareLimitOrder>
  ): BindActionResult<typeof prepareLimitOrder>;
  /** Posts a signed order for the authenticated account. */
  postOrder: PostOrderMethod;
  /** Posts multiple signed orders for the authenticated account. */
  postOrders: PostOrdersMethod;
  /** Cancels a single open order for the authenticated account. */
  cancelOrder(
    ...args: BindActionParameters<typeof cancelOrder>
  ): BindActionResult<typeof cancelOrder>;
  /** Cancels multiple open orders for the authenticated account. */
  cancelOrders(
    ...args: BindActionParameters<typeof cancelOrders>
  ): BindActionResult<typeof cancelOrders>;
  /** Cancels all open orders for the authenticated account. */
  cancelAll(
    ...args: BindActionParameters<typeof cancelAll>
  ): BindActionResult<typeof cancelAll>;
  /** Cancels all open orders for the authenticated account that match the market or asset filter. */
  cancelMarketOrders(
    ...args: BindActionParameters<typeof cancelMarketOrders>
  ): BindActionResult<typeof cancelMarketOrders>;
  /** Lists open orders for the authenticated account across all pages. */
  listOpenOrders(
    ...args: BindActionParameters<typeof listOpenOrders>
  ): BindActionResult<typeof listOpenOrders>;
  /** Fetches a single order for the authenticated account. */
  fetchOrder(
    ...args: BindActionParameters<typeof fetchOrder>
  ): BindActionResult<typeof fetchOrder>;
};

export function tradingActions(client: SecureClient): TradingActions;
export function tradingActions(client: SecureClient): TradingActions {
  return {
    prepareMarketOrder: bindAction(client, prepareMarketOrder),
    prepareLimitOrder: bindAction(client, prepareLimitOrder),
    postOrder: ((order?: SignedOrder) =>
      order === undefined
        ? postOrder(client)
        : postOrder(client, order)) as PostOrderMethod,
    postOrders: ((orders?: PostOrdersRequest) =>
      orders === undefined
        ? postOrders(client)
        : postOrders(client, orders)) as PostOrdersMethod,
    cancelOrder: bindAction(client, cancelOrder),
    cancelOrders: bindAction(client, cancelOrders),
    cancelAll: bindAction(client, cancelAll),
    cancelMarketOrders: bindAction(client, cancelMarketOrders),
    listOpenOrders: bindAction(client, listOpenOrders),
    fetchOrder: bindAction(client, fetchOrder),
  };
}
