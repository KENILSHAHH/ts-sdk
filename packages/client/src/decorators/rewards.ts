import type { Prettify } from '@polymarket/types';
import {
  fetchOrderScoring,
  fetchOrdersScoring,
  fetchRewardPercentages,
  fetchTotalEarningsForUserForDay,
  listCurrentRewards,
  listMarketRewards,
  listUserEarningsAndMarketsConfig,
  listUserEarningsForDay,
} from '../actions';
import type { Client, PublicClient, SecureClient } from '../clients';
import {
  type BindActionParameters,
  type BindActionResult,
  bindAction,
} from './shared';

export type RewardsPublicActions = {
  /** Lists current active market rewards. */
  listCurrentRewards(
    ...args: BindActionParameters<typeof listCurrentRewards>
  ): BindActionResult<typeof listCurrentRewards>;
  /** Lists reward configurations for a market. */
  listMarketRewards(
    ...args: BindActionParameters<typeof listMarketRewards>
  ): BindActionResult<typeof listMarketRewards>;
};

export type RewardsActions = Prettify<
  RewardsPublicActions & {
    /** Fetches whether a single order is currently scoring. */
    fetchOrderScoring(
      ...args: BindActionParameters<typeof fetchOrderScoring>
    ): BindActionResult<typeof fetchOrderScoring>;
    /** Fetches scoring state for multiple orders. */
    fetchOrdersScoring(
      ...args: BindActionParameters<typeof fetchOrdersScoring>
    ): BindActionResult<typeof fetchOrdersScoring>;
    /** Lists per-market earnings for the authenticated account on a given day. */
    listUserEarningsForDay(
      ...args: BindActionParameters<typeof listUserEarningsForDay>
    ): BindActionResult<typeof listUserEarningsForDay>;
    /** Fetches total earnings for the authenticated account on a given day. */
    fetchTotalEarningsForUserForDay(
      ...args: BindActionParameters<typeof fetchTotalEarningsForUserForDay>
    ): BindActionResult<typeof fetchTotalEarningsForUserForDay>;
    /** Lists market reward configuration and earnings for the authenticated account on a given day. */
    listUserEarningsAndMarketsConfig(
      ...args: BindActionParameters<typeof listUserEarningsAndMarketsConfig>
    ): BindActionResult<typeof listUserEarningsAndMarketsConfig>;
    /** Fetches reward percentages for the authenticated account. */
    fetchRewardPercentages(
      ...args: BindActionParameters<typeof fetchRewardPercentages>
    ): BindActionResult<typeof fetchRewardPercentages>;
  }
>;

function publicRewardsActions(client: Client): RewardsPublicActions {
  return {
    listCurrentRewards: bindAction(client, listCurrentRewards),
    listMarketRewards: bindAction(client, listMarketRewards),
  };
}

export function rewardsActions(client: PublicClient): RewardsPublicActions;
export function rewardsActions(client: SecureClient): RewardsActions;
export function rewardsActions(
  client: Client,
): RewardsPublicActions | RewardsActions {
  const actions = publicRewardsActions(client);

  if (client.isPublicClient()) {
    return actions;
  }

  return {
    ...actions,
    fetchOrderScoring: bindAction(client, fetchOrderScoring),
    fetchOrdersScoring: bindAction(client, fetchOrdersScoring),
    listUserEarningsForDay: bindAction(client, listUserEarningsForDay),
    fetchTotalEarningsForUserForDay: bindAction(
      client,
      fetchTotalEarningsForUserForDay,
    ),
    listUserEarningsAndMarketsConfig: bindAction(
      client,
      listUserEarningsAndMarketsConfig,
    ),
    fetchRewardPercentages: bindAction(client, fetchRewardPercentages),
  };
}
