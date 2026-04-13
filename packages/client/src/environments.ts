import { type EvmAddress, expectEvmAddress } from '@polymarket/types';

export type EnvironmentConfig = {
  name: string;
  chainId: number;
  /** @internal */
  collateralToken: EvmAddress;
  /** @internal */
  conditionalTokens: EvmAddress;
  /** @internal */
  standardExchange: EvmAddress;
  /** @internal */
  negRiskExchange: EvmAddress;
  /** @internal */
  safeMultisend: EvmAddress;
  /** @internal */
  clob: string;
  /** @internal */
  relayer: string;
  /** @internal */
  gamma: string;
  /** @internal */
  data: string;
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
  collateralToken: expectEvmAddress(
    '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
  ),
  conditionalTokens: expectEvmAddress(
    '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045',
  ),
  standardExchange: expectEvmAddress(
    '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E',
  ),
  negRiskExchange: expectEvmAddress(
    '0xC5d563A36AE78145C45a50134d48A1215220f80a',
  ),
  safeMultisend: expectEvmAddress('0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761'),
  clob: 'https://clob.polymarket.com',
  relayer: 'https://relayer-v2.polymarket.com',
  gamma: 'https://gamma-api.polymarket.com',
  data: 'https://data-api.polymarket.com',
  relayerMaxPolls: 100,
  relayerPollFrequencyMs: 2000,
};
