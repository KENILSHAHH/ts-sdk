import { type EvmAddress, expectEvmAddress } from '@polymarket/types';
import type { Hex } from 'ox';

export type WalletDerivationConfig = {
  proxyFactory: EvmAddress;
  proxyImplementation: EvmAddress;
  safeFactory: EvmAddress;
  safeInitCodeHash: Hex.Hex;
};

export type EnvironmentConfig = {
  name: string;
  chainId: number;
  /** @internal */
  walletDerivation: WalletDerivationConfig;
  /** @internal */
  collateralToken: EvmAddress;
  /** @internal */
  conditionalTokens: EvmAddress;
  /** @internal */
  negRiskAdapter: EvmAddress;
  /** @internal */
  standardExchange: EvmAddress;
  /** @internal */
  negRiskExchange: EvmAddress;
  /** @internal */
  safeMultisend: EvmAddress;
  /** @internal */
  relayHub: EvmAddress;
  /** @internal */
  clob: string;
  /** @internal */
  clobMarketWs: string;
  /** @internal */
  clobUserWs: string;
  /** @internal */
  relayer: string;
  /** @internal */
  gamma: string;
  /** @internal */
  data: string;
  /** @internal */
  rtdsWs: string;
  /** @internal */
  sportsWs: string;
  /** @internal */
  relayerMaxPolls: number;
  /** @internal */
  relayerPollFrequencyMs: number;
};

/**
 * The production environment configuration.
 */
export const production: EnvironmentConfig = {
  name: 'production',
  chainId: 137,
  walletDerivation: {
    proxyFactory: expectEvmAddress(
      '0xaB45c5A4B0c941a2F231C04C3f49182e1A254052',
    ),
    proxyImplementation: expectEvmAddress(
      '0x44e999d5c2F66Ef0861317f9A4805AC2e90aEB4f',
    ),
    safeFactory: expectEvmAddress('0xaacFeEa03eb1561C4e67d661e40682Bd20E3541b'),
    safeInitCodeHash:
      '0x2bce2127ff07fb632d16c8347c4ebf501f4841168bed00d9e6ef715ddb6fcecf',
  },
  collateralToken: expectEvmAddress(
    '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
  ),
  conditionalTokens: expectEvmAddress(
    '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045',
  ),
  negRiskAdapter: expectEvmAddress(
    '0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296',
  ),
  standardExchange: expectEvmAddress(
    '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E',
  ),
  negRiskExchange: expectEvmAddress(
    '0xC5d563A36AE78145C45a50134d48A1215220f80a',
  ),
  safeMultisend: expectEvmAddress('0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761'),
  relayHub: expectEvmAddress('0xD216153c06E857cD7f72665E0aF1d7D82172F494'),
  clob: 'https://clob.polymarket.com',
  clobMarketWs: 'wss://ws-subscriptions-clob.polymarket.com/ws/market',
  clobUserWs: 'wss://ws-subscriptions-clob.polymarket.com/ws/user',
  relayer: 'https://relayer-v2.polymarket.com',
  gamma: 'https://gamma-api.polymarket.com',
  data: 'https://data-api.polymarket.com',
  rtdsWs: 'wss://ws-live-data.polymarket.com',
  sportsWs: 'wss://sports-api.polymarket.com/ws',
  relayerMaxPolls: 100,
  relayerPollFrequencyMs: 2000,
};
