import { type EvmAddress, expectEvmAddress } from '@polymarket/types';

export type EnvironmentConfig = {
  name: string;
  chainId: number;
  /** @internal */
  standardExchange: EvmAddress;
  /** @internal */
  negRiskExchange: EvmAddress;
  /** @internal */
  clob: string;
  /** @internal */
  gamma: string;
  /** @internal */
  data: string;
};

/**
 * The production environment configuration.
 */
export const production: EnvironmentConfig = {
  name: 'production',
  chainId: 137,
  standardExchange: expectEvmAddress(
    '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E',
  ),
  negRiskExchange: expectEvmAddress(
    '0xC5d563A36AE78145C45a50134d48A1215220f80a',
  ),
  clob: 'https://clob.polymarket.com',
  gamma: 'https://gamma-api.polymarket.com',
  data: 'https://data-api.polymarket.com',
};
