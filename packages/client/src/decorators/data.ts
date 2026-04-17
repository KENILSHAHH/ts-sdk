import {
  estimateMarketPrice,
  fetchEventLiveVolume,
  fetchLastTradePrice,
  fetchLastTradePrices,
  fetchMidpoint,
  fetchMidpoints,
  fetchOrderBook,
  fetchOrderBooks,
  fetchPrice,
  fetchPrices,
  fetchSpread,
  fetchSpreads,
  listMarketHolders,
  listOpenInterest,
  listPriceHistory,
  listTrades,
} from '../actions';
import type { Client, PublicClient, SecureClient } from '../clients';
import {
  type BindActionParameters,
  type BindActionResult,
  bindAction,
} from './shared';

export type DataActions = {
  /**
   * Fetches live volume for an event.
   *
   * @example
   * ```ts
   * const volume = await client.fetchEventLiveVolume({ id: '123' });
   * ```
   */
  fetchEventLiveVolume(
    ...args: BindActionParameters<typeof fetchEventLiveVolume>
  ): BindActionResult<typeof fetchEventLiveVolume>;
  /**
   * Fetches the midpoint price for a token.
   *
   * @example
   * ```ts
   * const midpoint = await client.fetchMidpoint({ tokenId: '123' });
   * ```
   */
  fetchMidpoint(
    ...args: BindActionParameters<typeof fetchMidpoint>
  ): BindActionResult<typeof fetchMidpoint>;
  /**
   * Fetches midpoint prices for multiple tokens.
   *
   * @example
   * ```ts
   * const midpoints = await client.fetchMidpoints([{ tokenId: '123' }]);
   * ```
   */
  fetchMidpoints(
    ...args: BindActionParameters<typeof fetchMidpoints>
  ): BindActionResult<typeof fetchMidpoints>;
  /**
   * Fetches the current quoted price for a token and side.
   *
   * @example
   * ```ts
   * const price = await client.fetchPrice({ tokenId: '123', side: OrderSide.BUY });
   * ```
   */
  fetchPrice(
    ...args: BindActionParameters<typeof fetchPrice>
  ): BindActionResult<typeof fetchPrice>;
  /**
   * Fetches quoted prices for multiple tokens.
   *
   * @example
   * ```ts
   * const prices = await client.fetchPrices([{ tokenId: '123', side: OrderSide.BUY }]);
   * ```
   */
  fetchPrices(
    ...args: BindActionParameters<typeof fetchPrices>
  ): BindActionResult<typeof fetchPrices>;
  /**
   * Fetches the current order book for a token.
   *
   * @example
   * ```ts
   * const book = await client.fetchOrderBook({ tokenId: '123' });
   * ```
   */
  fetchOrderBook(
    ...args: BindActionParameters<typeof fetchOrderBook>
  ): BindActionResult<typeof fetchOrderBook>;
  /**
   * Fetches order books for multiple tokens.
   *
   * @example
   * ```ts
   * const books = await client.fetchOrderBooks([{ tokenId: '123' }]);
   * ```
   */
  fetchOrderBooks(
    ...args: BindActionParameters<typeof fetchOrderBooks>
  ): BindActionResult<typeof fetchOrderBooks>;
  /**
   * Fetches the spread for a token.
   *
   * @example
   * ```ts
   * const spread = await client.fetchSpread({ tokenId: '123' });
   * ```
   */
  fetchSpread(
    ...args: BindActionParameters<typeof fetchSpread>
  ): BindActionResult<typeof fetchSpread>;
  /**
   * Fetches spreads for multiple tokens.
   *
   * @example
   * ```ts
   * const spreads = await client.fetchSpreads([{ tokenId: '123' }]);
   * ```
   */
  fetchSpreads(
    ...args: BindActionParameters<typeof fetchSpreads>
  ): BindActionResult<typeof fetchSpreads>;
  /**
   * Fetches the last traded price for a token.
   *
   * @example
   * ```ts
   * const price = await client.fetchLastTradePrice({ tokenId: '123' });
   * ```
   */
  fetchLastTradePrice(
    ...args: BindActionParameters<typeof fetchLastTradePrice>
  ): BindActionResult<typeof fetchLastTradePrice>;
  /**
   * Fetches last traded prices for multiple tokens.
   *
   * @example
   * ```ts
   * const prices = await client.fetchLastTradePrices([{ tokenId: '123' }]);
   * ```
   */
  fetchLastTradePrices(
    ...args: BindActionParameters<typeof fetchLastTradePrices>
  ): BindActionResult<typeof fetchLastTradePrices>;
  /**
   * Lists historical price points for a token.
   *
   * @example
   * ```ts
   * const history = await client.listPriceHistory({ tokenId: '123', interval: '1d' });
   * ```
   */
  listPriceHistory(
    ...args: BindActionParameters<typeof listPriceHistory>
  ): BindActionResult<typeof listPriceHistory>;
  /**
   * Estimates the price level a market order would cross at current book depth.
   *
   * For BUY orders, `amount` is the amount of collateral to spend. For SELL orders,
   * `amount` is the number of shares to sell.
   *
   * @example
   * ```ts
   * const price = await client.estimateMarketPrice({
   *   tokenId: '123',
   *   side: OrderSide.BUY,
   *   amount: 10,
   * });
   * ```
   */
  estimateMarketPrice(
    ...args: BindActionParameters<typeof estimateMarketPrice>
  ): BindActionResult<typeof estimateMarketPrice>;
  /**
   * Lists open interest for one or more markets.
   */
  listOpenInterest(
    ...args: BindActionParameters<typeof listOpenInterest>
  ): BindActionResult<typeof listOpenInterest>;
  /**
   * Lists the top holders for one or more markets.
   */
  listMarketHolders(
    ...args: BindActionParameters<typeof listMarketHolders>
  ): BindActionResult<typeof listMarketHolders>;
  /**
   * Lists trades for a wallet, market, or event.
   */
  listTrades(
    ...args: BindActionParameters<typeof listTrades>
  ): BindActionResult<typeof listTrades>;
};

export function dataActions(client: PublicClient): DataActions;
export function dataActions(client: SecureClient): DataActions;
export function dataActions(client: Client): DataActions {
  return {
    fetchEventLiveVolume: bindAction(client, fetchEventLiveVolume),
    fetchMidpoint: bindAction(client, fetchMidpoint),
    fetchMidpoints: bindAction(client, fetchMidpoints),
    fetchPrice: bindAction(client, fetchPrice),
    fetchPrices: bindAction(client, fetchPrices),
    fetchOrderBook: bindAction(client, fetchOrderBook),
    fetchOrderBooks: bindAction(client, fetchOrderBooks),
    fetchSpread: bindAction(client, fetchSpread),
    fetchSpreads: bindAction(client, fetchSpreads),
    fetchLastTradePrice: bindAction(client, fetchLastTradePrice),
    fetchLastTradePrices: bindAction(client, fetchLastTradePrices),
    listPriceHistory: bindAction(client, listPriceHistory),
    estimateMarketPrice: bindAction(client, estimateMarketPrice),
    listOpenInterest: bindAction(client, listOpenInterest),
    listMarketHolders: bindAction(client, listMarketHolders),
    listTrades: bindAction(client, listTrades),
  };
}
