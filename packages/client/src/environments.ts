export type EnvironmentConfig = {
  name: string;
  clob: string;
  gamma: string;
  data: string;
};

/**
 * The production environment configuration.
 */
export const production: EnvironmentConfig = {
  name: 'production',
  clob: 'https://clob.polymarket.com',
  gamma: 'https://gamma-api.polymarket.com',
  data: 'https://data-api.polymarket.com',
};
