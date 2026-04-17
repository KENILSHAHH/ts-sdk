import type { Prettify } from '@polymarket/types';
import {
  downloadAccountingSnapshot,
  dropNotifications,
  fetchClosedOnlyMode,
  fetchNotifications,
  fetchPortfolioValue,
  fetchTradedMarketCount,
  listAccountTrades,
  listActivity,
  listClosedPositions,
  listMarketPositions,
  listPositions,
} from '../actions';
import type { Client, PublicClient, SecureClient } from '../clients';
import {
  type BindActionParameters,
  type BindActionResult,
  bindAction,
} from './shared';

export type AccountPublicActions = {
  /** Lists current positions for a wallet. */
  listPositions(
    ...args: BindActionParameters<typeof listPositions>
  ): BindActionResult<typeof listPositions>;
  /** Lists closed positions for a wallet. */
  listClosedPositions(
    ...args: BindActionParameters<typeof listClosedPositions>
  ): BindActionResult<typeof listClosedPositions>;
  /** Fetches the total value for a wallet's positions. */
  fetchPortfolioValue(
    ...args: BindActionParameters<typeof fetchPortfolioValue>
  ): BindActionResult<typeof fetchPortfolioValue>;
  /** Fetches the total number of markets a wallet has traded. */
  fetchTradedMarketCount(
    ...args: BindActionParameters<typeof fetchTradedMarketCount>
  ): BindActionResult<typeof fetchTradedMarketCount>;
  /** Downloads an accounting snapshot archive for a wallet. */
  downloadAccountingSnapshot(
    ...args: BindActionParameters<typeof downloadAccountingSnapshot>
  ): BindActionResult<typeof downloadAccountingSnapshot>;
  /** Lists positions for a market. */
  listMarketPositions(
    ...args: BindActionParameters<typeof listMarketPositions>
  ): BindActionResult<typeof listMarketPositions>;
  /** Lists wallet activity. */
  listActivity(
    ...args: BindActionParameters<typeof listActivity>
  ): BindActionResult<typeof listActivity>;
};

export type AccountActions = Prettify<
  AccountPublicActions & {
    /** Lists trades for the authenticated account across all pages. */
    listAccountTrades(
      ...args: BindActionParameters<typeof listAccountTrades>
    ): BindActionResult<typeof listAccountTrades>;
    /** Fetches notifications for the authenticated account. */
    fetchNotifications(
      ...args: BindActionParameters<typeof fetchNotifications>
    ): BindActionResult<typeof fetchNotifications>;
    /** Drops notifications for the authenticated account. */
    dropNotifications(
      ...args: BindActionParameters<typeof dropNotifications>
    ): BindActionResult<typeof dropNotifications>;
    /** Fetches whether the account is restricted to closed-only trading. */
    fetchClosedOnlyMode(
      ...args: BindActionParameters<typeof fetchClosedOnlyMode>
    ): BindActionResult<typeof fetchClosedOnlyMode>;
  }
>;

function publicAccountActions(client: Client): AccountPublicActions {
  return {
    listPositions: bindAction(client, listPositions),
    listClosedPositions: bindAction(client, listClosedPositions),
    fetchPortfolioValue: bindAction(client, fetchPortfolioValue),
    fetchTradedMarketCount: bindAction(client, fetchTradedMarketCount),
    downloadAccountingSnapshot: bindAction(client, downloadAccountingSnapshot),
    listMarketPositions: bindAction(client, listMarketPositions),
    listActivity: bindAction(client, listActivity),
  };
}

export function accountActions(client: PublicClient): AccountPublicActions;
export function accountActions(client: SecureClient): AccountActions;
export function accountActions(
  client: Client,
): AccountPublicActions | AccountActions {
  const actions = publicAccountActions(client);

  if (client.isPublicClient()) {
    return actions;
  }

  return {
    ...actions,
    listAccountTrades: bindAction(client, listAccountTrades),
    fetchNotifications: bindAction(client, fetchNotifications),
    dropNotifications: bindAction(client, dropNotifications),
    fetchClosedOnlyMode: bindAction(client, fetchClosedOnlyMode),
  };
}
