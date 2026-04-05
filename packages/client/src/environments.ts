export type EnvironmentConfig = {
  name: string;
  chainId: number;
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
  clob: 'https://clob.polymarket.com',
  gamma: 'https://gamma-api.polymarket.com',
  data: 'https://data-api.polymarket.com',
};
