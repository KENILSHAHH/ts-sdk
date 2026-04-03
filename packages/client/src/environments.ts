export type EnvironmentConfig = {
  name: string;
  gamma: string;
};

/**
 * The production environment configuration.
 */
export const production: EnvironmentConfig = {
  name: 'production',
  gamma: 'https://gamma-api.polymarket.com',
};
