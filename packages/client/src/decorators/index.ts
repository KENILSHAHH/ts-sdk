import type { Prettify } from '@polymarket/types';
import type { Client, PublicClient, SecureClient } from '../clients';
import {
  type AccountActions,
  type AccountPublicActions,
  accountActions,
} from './account';
import { type AnalyticsActions, analyticsActions } from './analytics';
import { type DataActions, dataActions } from './data';
import { type DiscoveryActions, discoveryActions } from './discovery';
import {
  type RewardsActions,
  type RewardsPublicActions,
  rewardsActions,
} from './rewards';
import { type TradingActions, tradingActions } from './trading';
import {
  type PublicWalletActions,
  type SecureWalletActions,
  walletActions,
} from './wallet';

export type PublicActions = Prettify<
  DiscoveryActions &
    DataActions &
    AnalyticsActions &
    AccountPublicActions &
    RewardsPublicActions &
    PublicWalletActions
>;

export type SecureActions = Prettify<
  DiscoveryActions &
    DataActions &
    AnalyticsActions &
    AccountActions &
    RewardsActions &
    SecureWalletActions &
    TradingActions
>;

export function allActions(client: PublicClient): PublicActions;
export function allActions(client: SecureClient): SecureActions;
export function allActions(client: Client): PublicActions | SecureActions {
  if (client.isSecureClient()) {
    return {
      ...accountActions(client),
      ...analyticsActions(client),
      ...dataActions(client),
      ...discoveryActions(client),
      ...rewardsActions(client),
      ...tradingActions(client),
      ...walletActions(client),
    };
  }

  return {
    ...accountActions(client),
    ...analyticsActions(client),
    ...dataActions(client),
    ...discoveryActions(client),
    ...rewardsActions(client),
    ...walletActions(client),
  };
}

export * from './account';
export * from './analytics';
export * from './data';
export * from './discovery';
export * from './rewards';
export * from './trading';
export * from './wallet';
